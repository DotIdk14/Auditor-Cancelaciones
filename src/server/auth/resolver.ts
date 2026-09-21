import type { Request } from 'express';
import type { ActorResolver } from './types.js';
import { createConfiguredIdentityProvider } from './insforge-provider.js';
import { DatabaseActorResolver } from './rbac-resolver.js';

/** Provider adapter boundary. No client-supplied role or identity header is trusted here. */
export class UnconfiguredActorResolver implements ActorResolver {
  async resolve(_request: Request) {
    return null;
  }
}

export function createActorResolver(): ActorResolver {
  const provider = createConfiguredIdentityProvider();
  return provider ? new DatabaseActorResolver(provider) : new UnconfiguredActorResolver();
}
