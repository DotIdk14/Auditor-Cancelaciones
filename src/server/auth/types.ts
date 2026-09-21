import type { Request } from 'express';

export type ActorSource = 'auth' | 'legacy' | 'system';

export interface AuthenticatedActor {
  userId: string | null;
  legacyIdentity: string | null;
  roles: string[];
  permissions: string[];
  source: ActorSource;
}

export interface ActorResolver {
  resolve(request: Request): Promise<AuthenticatedActor | null>;
}

export const ANONYMOUS_ACTOR: AuthenticatedActor = {
  userId: null,
  legacyIdentity: null,
  roles: [],
  permissions: [],
  source: 'legacy',
};
