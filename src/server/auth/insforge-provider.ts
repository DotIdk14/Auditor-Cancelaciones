import { createClient, type InsForgeClient } from '@insforge/sdk';
import type { Request } from 'express';
import { INSFORGE_ANON_KEY, INSFORGE_URL } from '../../lib/insforge/client.js';
import type { VerifiedIdentityProvider } from './rbac-resolver.js';

export interface VerifiedIdentity {
  userId: string;
  legacyIdentity: string | null;
}

type ClientFactory = (accessToken: string) => Pick<InsForgeClient, 'auth'>;

function bearerToken(request: Request): string | null {
  const header = request.header('authorization');
  if (!header) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export class InsforgeVerifiedIdentityProvider implements VerifiedIdentityProvider {
  private readonly createAuthenticatedClient: ClientFactory;

  constructor(
    private readonly baseUrl: string,
    private readonly anonKey: string,
    clientFactory?: ClientFactory,
  ) {
    this.createAuthenticatedClient = clientFactory ?? ((accessToken) => createClient({
      baseUrl: this.baseUrl,
      anonKey: this.anonKey,
      accessToken,
      isServerMode: true,
    }));
  }

  async resolve(request: Request): Promise<VerifiedIdentity | null> {
    const token = bearerToken(request);
    if (!token) return null;

    try {
      const { data, error } = await this.createAuthenticatedClient(token).auth.getCurrentUser();
      if (error || !data.user?.id) return null;
      return {
        userId: data.user.id,
        legacyIdentity: data.user.email ?? null,
      };
    } catch {
      return null;
    }
  }
}

export function createConfiguredIdentityProvider(): InsforgeVerifiedIdentityProvider | null {
  const baseUrl = INSFORGE_URL().trim();
  const anonKey = INSFORGE_ANON_KEY().trim();
  return baseUrl && anonKey ? new InsforgeVerifiedIdentityProvider(baseUrl, anonKey) : null;
}
