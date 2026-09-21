import { useState, useCallback, useRef, useEffect } from 'react';
import type { AuditResult, AuditExecution } from '../lib/audit/types';
import { parseApiResponse } from '../lib/api/parse-response';
import { HEAVY_API_BASE } from '../lib/api/config';

interface UseMultimodalAuditReturn {
  /** Run the multimodal audit on uploaded files (architectura asíncrona: POST /api/audit/jobs) */
  runAudit: (files: File[], ticketId?: string) => Promise<AuditExecution | null>;
  /** Current audit result */
  resultado: AuditResult | null;
  /** Evidence inventory (se llena con el resultado final) */
  evidencias: any[];
  /** Whether audit is in progress */
  isAuditing: boolean;
  /** Error if audit failed */
  error: Error | null;
  /** Usage stats from the AI call */
  usage: { llmCalls: number; inputTokens: number; outputTokens: number } | null;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook del flujo asíncrono de auditoría:
 *   POST /api/audit/jobs   -> 202 + jobId (el worker procesa en segundo plano)
 *   GET  /api/audit/jobs/:jobId       -> estado / progreso
 *   GET  /api/audit/jobs/:jobId/result-> resultado final
 * Todas las llamadas usan `cache: 'no-store'`.
 */
export function useMultimodalAudit(): UseMultimodalAuditReturn {
  const [resultado, setResultado] = useState<AuditResult | null>(null);
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [usage, setUsage] = useState<{ llmCalls: number; inputTokens: number; outputTokens: number } | null>(null);
  const progressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopProgressPolling = useCallback(() => {
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
      progressPollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopProgressPolling();
  }, [stopProgressPolling]);

  const processFiles = useCallback(async (files: File[]): Promise<AuditExecution | null> => {
    if (files.length === 0) {
      setError(new Error('No se proporcionaron archivos'));
      return null;
    }

    setIsAuditing(true);
    setError(null);
    setEvidencias([]);
    setResultado(null);

    const formData = new FormData();
    files.forEach(f => formData.append('evidencias', f));

    try {
      // Paso 1: crear el job (202 inmediato; cero procesamiento síncrono)
      const response = await fetch(`${HEAVY_API_BASE}/api/audit/jobs`, {
        method: 'POST',
        body: formData,
      });

      const body = await parseApiResponse(response);

      if (!body.success || !body.jobId) {
        throw new Error(body.error || 'Error al crear trabajo de auditoría');
      }

      const jobId = body.jobId;
      const maxAttempts = 150; // 5 minutos (polling cada 2s)

      // Paso 2: polling de estado hasta estado terminal
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;

        progressPollRef.current = setInterval(async () => {
          attempts++;
          if (attempts > maxAttempts) {
            stopProgressPolling();
            reject(new Error('Timeout esperando el trabajo de auditoría'));
            return;
          }

          try {
            const progressRes = await fetch(`${HEAVY_API_BASE}/api/audit/jobs/${jobId}`, {
              cache: 'no-store',
            });
            const progressBody = await parseApiResponse(progressRes);

            if (!progressBody.success || !progressBody.data) {
              throw new Error(progressBody.error || 'Error consultando trabajo');
            }

            const { status } = progressBody.data;
            if (status === 'success' || status === 'error') {
              stopProgressPolling();
              resolve();
            }
          } catch (err) {
            stopProgressPolling();
            reject(err instanceof Error ? err : new Error('Error en el polling del trabajo'));
          }
        }, 2000);
      });

      // Paso 3: obtener el resultado final
      const resultRes = await fetch(`${HEAVY_API_BASE}/api/audit/jobs/${jobId}/result`, {
        cache: 'no-store',
      });
      const resultBody = await parseApiResponse(resultRes);

      if (resultBody.success && resultBody.data) {
        setResultado(resultBody.data as AuditResult);
        setEvidencias(resultBody.data.evidencias ?? []);
        setUsage(resultBody.data.usage ?? null);
      } else if (resultBody.error) {
        throw new Error(typeof resultBody.error === 'string' ? resultBody.error : resultBody.message || 'Error en resultado');
      }

      return null; // execution asíncrono: resultado disponible vía `resultado`
    } catch (err) {
      stopProgressPolling();
      setError(err instanceof Error ? err : new Error('Error procesando evidencias'));
      return null;
    } finally {
      setIsAuditing(false);
    }
  }, [stopProgressPolling]);

  const reset = useCallback(() => {
    stopProgressPolling();
    setResultado(null);
    setEvidencias([]);
    setIsAuditing(false);
    setError(null);
    setUsage(null);
  }, [stopProgressPolling]);

  return { runAudit: processFiles, resultado, evidencias, isAuditing, error, usage, reset };
}