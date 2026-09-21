import type { Request } from 'express';
import { getAdminClient } from '../../lib/insforge/client.js';
import type { ActorResolver, AuthenticatedActor } from './types.js';

export interface VerifiedIdentityProvider {
  resolve(request: Request): Promise<{ userId: string; legacyIdentity: string | null } | null>;
}

/** Resolves permissions only after a trusted provider has verified the request identity. */
export class DatabaseActorResolver implements ActorResolver {
  constructor(private readonly provider: VerifiedIdentityProvider) {}

  async resolve(request: Request): Promise<AuthenticatedActor | null> {
    const identity = await this.provider.resolve(request);
    if (!identity) return null;

    const database = getAdminClient().database as any;
    const { data, error } = await database
      .from('user_roles')
      .select('role_id, roles(code)')
      .eq('user_id', identity.userId)
      .eq('active', true);
    if (error) throw new Error(`resolve actor roles: ${error.message ?? String(error)}`);

    const roles = (data ?? []).map((row: any) => row.roles?.code).filter(Boolean);
    const roleIds = (data ?? []).map((row: any) => row.role_id).filter(Boolean);
    if (roleIds.length === 0) {
      return { userId: identity.userId, legacyIdentity: identity.legacyIdentity, roles, permissions: [], source: 'auth' };
    }

    const { data: assignments, error: permissionError } = await database
      .from('role_permissions')
      .select('role_id, permissions(code)')
      .in('role_id', roleIds);
    if (permissionError) throw new Error(`resolve actor permissions: ${permissionError.message ?? String(permissionError)}`);

    const permissionCodes = (assignments ?? [])
      .map((row: any) => row.permissions?.code)
      .filter((code: unknown): code is string => typeof code === 'string' && code.length > 0);
    const permissions: string[] = [...new Set<string>(permissionCodes)];
    return { userId: identity.userId, legacyIdentity: identity.legacyIdentity, roles, permissions, source: 'auth' };
  }
}
