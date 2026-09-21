import { Router } from 'express';
import type { ActorResolver, AuthenticatedActor } from '../auth/types.js';
import { createActorMiddleware, createRequirePermission } from '../auth/authorization.js';
import type { PolicyRepository } from './types.js';

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} is required.`);
  return value.trim();
}

export function createPolicyRouter(repository: PolicyRepository, resolver: ActorResolver): Router {
  const router = Router();
  router.use(createActorMiddleware(resolver));

  router.get('/', createRequirePermission(resolver, 'policy.read'), async (_request, response) => {
    response.json({ data: await repository.listPolicies() });
  });

  router.get('/:id', createRequirePermission(resolver, 'policy.read'), async (request, response) => {
    const policy = await repository.getPolicy(requiredString(request.params.id, 'id'));
    if (!policy) return response.status(404).json({ error: 'NOT_FOUND' });
    return response.json({ data: policy });
  });

  router.post('/', createRequirePermission(resolver, 'policy.draft.create'), async (request, response) => {
    const actor = request.authenticatedActor!;
    const policy = await repository.createPolicy({
      code: requiredString(request.body?.code, 'code'),
      name: requiredString(request.body?.name, 'name'),
      description: request.body?.description ?? null,
      actor,
    });
    return response.status(201).json({ data: policy });
  });

  router.post('/:id/versions', createRequirePermission(resolver, 'policy.draft.create'), async (request, response) => {
    const version = await repository.createDraftVersion({
      policyId: requiredString(request.params.id, 'policy id'),
      version: requiredString(request.body?.version, 'version'),
      sourceText: request.body?.sourceText ?? null,
      effectiveFrom: request.body?.effectiveFrom ?? null,
      effectiveTo: request.body?.effectiveTo ?? null,
      metadata: request.body?.metadata ?? {},
      actor: request.authenticatedActor!,
    });
    return response.status(201).json({ data: version });
  });

  router.patch('/versions/:id', createRequirePermission(resolver, 'policy.draft.update'), async (request, response) => {
    const version = await repository.updateDraftVersion(request.params.id, { ...request.body, actor: request.authenticatedActor! });
    return response.json({ data: version });
  });

  router.post('/versions/:id/numerals', createRequirePermission(resolver, 'policy.draft.update'), async (request, response) => {
    const numeral = await repository.addNumeral({
      policyVersionId: request.params.id,
      code: requiredString(request.body?.code, 'code'),
      title: request.body?.title ?? null,
      text: requiredString(request.body?.text, 'text'),
      orderIndex: Number(request.body?.orderIndex ?? 0),
      processArea: request.body?.processArea ?? null,
      actor: request.authenticatedActor!,
    });
    return response.status(201).json({ data: numeral });
  });

  const transitions: Array<[string, string, (id: string, actor: AuthenticatedActor) => Promise<unknown>]> = [
    ['submit-review', 'policy.review.submit', (id, actor) => repository.submitVersion(id, actor)],
    ['approve', 'policy.approve', (id, actor) => repository.approveVersion(id, actor)],
    ['activate', 'policy.activate', (id, actor) => repository.activateVersion(id, actor)],
    ['retire', 'policy.retire', (id, actor) => repository.retireVersion(id, actor)],
  ];
  for (const [path, permission, method] of transitions) {
    router.post(`/versions/:id/${path}`, createRequirePermission(resolver, permission), async (request, response) => {
      const version = await method(request.params.id, requestActor(request));
      return response.json({ data: version });
    });
  }

  return router;
}

function requestActor(request: import('express').Request) {
  if (!request.authenticatedActor) throw new Error('Authenticated actor is required.');
  return request.authenticatedActor;
}
