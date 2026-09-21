function resolveEnv(key: string): string {
  try {
    const fromImportMeta = (import.meta as any).env?.[key];
    if (fromImportMeta) return fromImportMeta;
  } catch {}
  if (typeof process !== 'undefined' && process.env) {
    const fromProcess = process.env[key];
    if (fromProcess) return fromProcess;
  }
  return '';
}

export function getHeavyApiBase(): string {
  const baseUrl = resolveEnv('VITE_HEAVY_API_BASE').trim();
  if (!baseUrl) {
    throw new Error('VITE_HEAVY_API_BASE is required to use the heavy audit API.');
  }
  return baseUrl.replace(/\/$/, '');
}