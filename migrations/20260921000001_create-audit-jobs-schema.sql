-- ============================================================================
-- 1. audit_jobs — trabajos de auditoría persistentes
-- ============================================================================
CREATE TABLE public.audit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'queued',
  detail TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  worker_id TEXT,
  locked_at TIMESTAMPTZ,
  heartbeat_at TIMESTAMPTZ,
  error TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_jobs_status_idx ON public.audit_jobs (status);
CREATE INDEX audit_jobs_created_at_idx ON public.audit_jobs (created_at);
CREATE INDEX audit_jobs_updated_at_idx ON public.audit_jobs (updated_at);
CREATE INDEX audit_jobs_worker_id_idx ON public.audit_jobs (worker_id) WHERE status = 'processing';

-- ============================================================================
-- 2. audit_job_evidences — evidencias asociadas a cada job
-- ============================================================================
CREATE TABLE public.audit_job_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.audit_jobs(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PDF', 'IMAGE', 'AUDIO')),
  storage_key TEXT NOT NULL,
  storage_url TEXT,
  extraction JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_job_evidences_job_id_idx ON public.audit_job_evidences (job_id);
CREATE INDEX audit_job_evidences_type_idx ON public.audit_job_evidences (type);
CREATE INDEX audit_job_evidences_status_idx ON public.audit_job_evidences (status);

-- ============================================================================
-- 3. Función atómica de reclamación de job (usando FOR UPDATE SKIP LOCKED)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_next_audit_job(worker_id TEXT)
RETURNS audit_jobs%ROWTYPE AS $$
DECLARE
  claimed_job audit_jobs%ROWTYPE;
BEGIN
  -- Seleccionar un job en estado 'queued', bloquearlo y marcarlo como 'processing'
  UPDATE public.audit_jobs
     SET status = 'processing',
         attempts = attempts + 1,
         worker_id = worker_id,
         locked_at = NOW(),
         heartbeat_at = NOW(),
         started_at = COALESCE(started_at, NOW())
   WHERE id IN (
     SELECT id FROM public.audit_jobs
     WHERE status = 'queued'
     ORDER BY created_at ASC
     FOR UPDATE SKIP LOCKED
     LIMIT 1
   )
   RETURNING * INTO claimed_job;

  IF claimed_job IS NULL THEN
    -- No hay jobs disponibles
    RETURN NULL;
  END IF;

  RETURN claimed_job;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Función de heartbeat para mantener el lock vivo
-- ============================================================================
CREATE OR REPLACE FUNCTION public.heartbeat_audit_job(job_id UUID, worker_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  job audit_jobs%ROWTYPE;
BEGIN
  UPDATE public.audit_jobs
     SET heartbeat_at = NOW(),
         updated_at = NOW()
   WHERE id = job_id
     AND worker_id = worker_id
     AND status = 'processing'
   RETURNING * INTO job;

  IF job IS NULL THEN
    RETURN FALSE; -- Job no encontrado o ya no processing
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Función de reencolado de jobs abandonados (sin heartbeat reciente)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.requeue_stale_audit_jobs(heartbeat_timeout_ms INTEGER DEFAULT 300000)
RETURNS INTEGER AS $$
DECLARE
  job audit_jobs%ROWTYPE;
  stale_threshold_ms INTEGER := heartbeat_timeout_ms;
  requeued_count INTEGER := 0;
BEGIN
  FOR job IN
    SELECT id, locked_at, heartbeat_at, started_at, updated_at
      FROM public.audit_jobs
     WHERE status = 'processing'
  LOOP
    -- Job está abandonado si:
    -- 1. No tiene heartbeat reciente O
    -- 2. Tiene locked_at antiguo y no ha empezado (never started)
    IF job.heartbeat_at IS NULL 
       OR (job.locked_at IS NOT NULL 
           AND job.locked_at < NOW() - (SELECT setting::integer / 1000 FROM (SELECT 300000 AS setting) AS params) 
           AND job.started_at IS NULL) THEN

      -- Reencolarlo a 'queued'
      UPDATE public.audit_jobs
         SET status = 'queued',
             worker_id = NULL,
             locked_at = NULL,
             heartbeat_at = NULL,
             attempts = 0,
             updated_at = NOW()
       WHERE id = job.id;

      requeued_count := requeued_count + 1;
    END IF;
  END LOOP;

  RETURN requeued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Trigger para actualizar updated_at en audit_jobs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_audit_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_jobs_updated_at_trigger
  BEFORE UPDATE ON public.audit_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audit_jobs_updated_at();