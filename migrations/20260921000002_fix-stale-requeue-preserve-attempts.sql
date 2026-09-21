-- ============================================================================
-- FIX: requeue_stale_audit_jobs
-- 1. El reencolado de jobs abandonados debe PRESERVAR `attempts` para que
--    `max_attempts` siga acotando el número total de ejecuciones reales.
--    (La versión anterior hacía `attempts = 0`, permitiendo reintentos infinitos.)
-- 2. Un job es "stale" si su heartbeat_at es NULL o está vencido
--    (`heartbeat_at < now - timeout`). La versión anterior solo comprobaba
--    `heartbeat_at IS NULL`, por lo que un worker muerto con heartbeat viejo
--    nunca era reencolado.
-- 3. Respeta el parámetro heartbeat_timeout_ms (antes usaba 300000 hardcodeado).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.requeue_stale_audit_jobs(heartbeat_timeout_ms INTEGER DEFAULT 300000)
RETURNS INTEGER AS $$
DECLARE
  job audit_jobs%ROWTYPE;
  requeued_count INTEGER := 0;
BEGIN
  FOR job IN
    SELECT * FROM public.audit_jobs
     WHERE status = 'processing'
  LOOP
    IF job.heartbeat_at IS NULL
       OR job.heartbeat_at < NOW() - (heartbeat_timeout_ms || ' milliseconds')::INTERVAL
       OR (job.locked_at IS NOT NULL
           AND job.started_at IS NULL
           AND job.locked_at < NOW() - (heartbeat_timeout_ms || ' milliseconds')::INTERVAL) THEN

      -- Reencolar preservando `attempts`: el claim lo incrementará de nuevo.
      UPDATE public.audit_jobs
         SET status = 'queued',
             worker_id = NULL,
             locked_at = NULL,
             heartbeat_at = NULL,
             updated_at = NOW()
       WHERE id = job.id;

      requeued_count := requeued_count + 1;
    END IF;
  END LOOP;

  RETURN requeued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;