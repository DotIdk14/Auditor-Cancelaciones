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

// Endpoints pesados (auditoría multimodal, extracción y transcripción) viven en
// el contenedor siempre-activo de InsForge Compute, sin el tope de 60s de Vercel.
// Sobrescribible con VITE_HEAVY_API_BASE si cambia la URL del servicio.
export const HEAVY_API_BASE =
  resolveEnv('VITE_HEAVY_API_BASE') ||
  'https://auditor-api-9e29e329-252e-481c-a632-95b71ee3df51.fly.dev';