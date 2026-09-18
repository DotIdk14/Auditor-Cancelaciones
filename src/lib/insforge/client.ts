import { createClient, createAdminClient, InsForgeClient } from '@insforge/sdk';

export const INSFORGE_URL = () => process.env.INSFORGE_URL ?? '';
export const INSFORGE_ANON_KEY = () => process.env.INSFORGE_ANON_KEY ?? '';
export const INSFORGE_API_KEY = () => process.env.INSFORGE_API_KEY ?? '';

export const EVIDENCE_BUCKET = 'dictamen-evidencias';

let adminClient: InsForgeClient | null = null;
let anonClient: InsForgeClient | null = null;

export function getAdminClient(): InsForgeClient {
  if (!adminClient) {
    const url = process.env.INSFORGE_URL ?? '';
    const apiKey = process.env.INSFORGE_API_KEY ?? '';
    if (!url || !apiKey) {
      throw new Error(
        'INSFORGE_URL and INSFORGE_API_KEY must be set. Add them to .env.local.',
      );
    }
    adminClient = createAdminClient({
      baseUrl: url,
      apiKey,
      retryCount: 2,
      timeout: 30000,
    });
  }
  return adminClient;
}

export function getAnonClient(): InsForgeClient {
  if (!anonClient) {
    const url = process.env.INSFORGE_URL ?? '';
    const anonKey = process.env.INSFORGE_ANON_KEY ?? '';
    if (!url || !anonKey) {
      throw new Error(
        'INSFORGE_URL and INSFORGE_ANON_KEY must be set. Add them to .env.local.',
      );
    }
    anonClient = createClient({
      baseUrl: url,
      anonKey,
      retryCount: 2,
      timeout: 30000,
    });
  }
  return anonClient;
}