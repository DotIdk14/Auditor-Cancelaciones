import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ActorResolver, AuthenticatedActor } from './types.js';

export const ACTOR_REQUEST_KEY = 'authenticatedActor';

declare global {
  namespace Express {
    interface Request {
      authenticatedActor?: AuthenticatedActor;
    }
  }
}

export function createActorMiddleware(resolver: ActorResolver): RequestHandler {
  return async (request, response, next) => {
    try {
      request.authenticatedActor = await resolver.resolve(request) ?? undefined;
      next();
    } catch {
      response.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication required.' });
    }
  };
}

export function createRequirePermission(resolver: ActorResolver, permission: string): RequestHandler {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const actor = request.authenticatedActor ?? await resolver.resolve(request);
      if (!actor) {
        response.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication required.' });
        return;
      }
      if (!actor.permissions.includes(permission)) {
        response.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient permission.' });
        return;
      }
      request.authenticatedActor = actor;
      next();
    } catch {
      response.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication required.' });
    }
  };
}

export function hasPermission(actor: AuthenticatedActor, permission: string): boolean {
  return actor.permissions.includes(permission);
}
