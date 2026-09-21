import { createClient, createAdminClient, InsForgeClient } from '@insforge/sdk';

function resolveEnv(key: string): string {
  const viteKey = `VITE_${key}`;
  try {
    const fromImportMeta = (import.meta as any).env?.[viteKey];
    if (fromImportMeta) return fromImportMeta;
  } catch {}
  if (typeof process !== 'undefined' && process.env) {
    const fromProcess = process.env[viteKey] ?? process.env[key];
    if (fromProcess) return fromProcess;
  }
  return '';
}

export const INSFORGE_URL = () => resolveEnv('INSFORGE_URL');
export const INSFORGE_ANON_KEY = () => resolveEnv('INSFORGE_ANON_KEY');
export const INSFORGE_API_KEY = () => resolveEnv('INSFORGE_API_KEY');

export const EVIDENCE_BUCKET = 'dictamen-evidencias';

let adminClient: InsForgeClient | null = null;
let anonClient: InsForgeClient | null = null;

export function getAdminClient(): InsForgeClient {
  if (!adminClient) {
    const url = resolveEnv('INSFORGE_URL');
    const apiKey = resolveEnv('INSFORGE_API_KEY');
    if (!url || !apiKey) {
      throw new Error(
        'INSFORGE_URL and INSFORGE_API_KEY must be set. Add VITE_ prefix to .env.local.',
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
    const url = resolveEnv('INSFORGE_URL');
    const anonKey = resolveEnv('INSFORGE_ANON_KEY');
    if (!url || !anonKey) {
      throw new Error(
        'INSFORGE_URL and INSFORGE_ANON_KEY must be set. Add VITE_ prefix to .env.local.',
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