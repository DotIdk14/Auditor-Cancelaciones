import { Router } from 'express';
import type { ActorResolver, AuthenticatedActor } from '../auth/types.js';
import { createActorMiddleware, createRequirePermission } from '../auth/authorization.js';
import type { RuleRepository } from './types.js';

export function createRuleRouter(repository: RuleRepository, resolver: ActorResolver): Router {
  const router = Router();
  router.use(createActorMiddleware(resolver));

  router.get('/:id', createRequirePermission(resolver, 'rules.read'), async (request, response) => {
    const rule = await repository.getRule(request.params.id);
    if (!rule) return response.status(404).json({ error: 'NOT_FOUND' });
    return response.json({ data: rule });
  });

  router.post('/', createRequirePermission(resolver, 'rules.draft.create'), async (request, response) => {
    const rule = await repository.createDraft({ ...request.body, actor: actorOf(request.authenticatedActor) });
    return response.status(201).json({ data: rule });
  });

  router.patch('/:id', createRequirePermission(resolver, 'rules.draft.update'), async (request, response) => {
    const rule = await repository.updateDraft(request.params.id, { ...request.body, actor: actorOf(request.authenticatedActor) });
    return response.json({ data: rule });
  });

  const transitions: Array<[string, string, (id: string, actor: AuthenticatedActor) => Promise<unknown>]> = [
    ['submit-review', 'rules.review.submit', (id, actor) => repository.submitReview(id, actor)],
    ['approve', 'rules.approve', (id, actor) => repository.approve(id, actor)],
    ['activate', 'rules.activate', (id, actor) => repository.activate(id, actor)],
    ['retire', 'rules.retire', (id, actor) => repository.retire(id, actor)],
  ];
  for (const [path, permission, transition] of transitions) {
    router.post(`/:id/${path}`, createRequirePermission(resolver, permission), async (request, response) => {
      const rule = await transition(request.params.id, actorOf(request.authenticatedActor));
      return response.json({ data: rule });
    });
  }
  return router;
}

function actorOf(actor: AuthenticatedActor | undefined): AuthenticatedActor {
  if (!actor) throw new Error('Authenticated actor is required.');
  return actor;
}
