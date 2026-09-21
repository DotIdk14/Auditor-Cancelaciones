import { createClient, InsForgeClient } from '@insforge/sdk';
import { Pool } from '@neondatabase/serverless';

// Configuración de la base de datos InsForge
const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.warn('[audit-job-repo] DATABASE_URL no configurada; usando modo simulado');
}

/** Máximo de ejecuciones reales de un job (attempts) antes del estado error definitivo. */
export const DEFAULT_MAX_ATTEMPTS = Number(process.env.AUDIT_JOB_MAX_ATTEMPTS || 5);

// Pool de conexiones PostgreSQL
let pool: Pool | null = null;

if (DATABASE_URL) {
  // En este runtime (Node 22) el driver usa fetch nativo; no hace falta
  // configurar fetchPostgres.
  pool = new Pool({ connectionString: DATABASE_URL });
}

// Tipos para audit_jobs
export interface AuditJob {
  id: string;
  status: 'queued' | 'processing' | 'success' | 'error' | 'retrying' | 'cancelled';
  progress: number;
  stage: string;
  detail?: string;
  attempts: number;
  max_attempts: number;
  worker_id?: string;
  locked_at?: string;
  heartbeat_at?: string;
  error?: string;
  result?: unknown;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface AuditJobEvidence {
  id: string;
  job_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  type: 'PDF' | 'IMAGE' | 'AUDIO';
  storage_key: string;
  storage_url?: string;
  extraction?: unknown;
  status: 'pending' | 'processing' | 'success' | 'error';
  created_at: string;
  updated_at: string;
}

export interface EvidenceInsertInput {
  filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  type: 'PDF' | 'IMAGE' | 'AUDIO';
  storage_key: string;
  storage_url?: string;
}

/** Tipo estructural del repositorio (permite fakes en tests). */
export type AuditJobRepositoryLike = typeof auditJobRepository;

/**
 * Decide el estado tras un fallo SIN incrementar `attempts` de nuevo.
 * `claimNextJob` ya incrementa `attempts` al reclamar (1 claim = 1 ejecución real).
 * Las reglas son:
 *   - attempts <  max_attempts  → 'queued' (reintentar)
 *   - attempts >= max_attempts  → 'error'  (fallo definitivo)
 *
 * Ejemplo con max_attempts = 5:
 *   claim#1 att=1 fail → queued ... claim#5 att=5 fail → error
 */
export function resolveJobStatusAfterFailure(attempts: number, maxAttempts: number): 'error' | 'queued' {
  return attempts >= maxAttempts ? 'error' : 'queued';
}

// Claim a job atomically using FOR UPDATE SKIP LOCKED
export async function claimNextJob(workerId: string): Promise<{ job: AuditJob | null; client: InsForgeClient }> {
  if (!pool) {
    throw new Error('DATABASE_URL no configurada');
  }

  let client: InsForgeClient;
  try {
    client = createClient({
      baseUrl: process.env.INSFORGE_URL || '',
      anonKey: process.env.INSFORGE_ANON_KEY || '',
    });
  } catch {
    // Si no hay InsForge (tests / sin configuración), continuamos para el job management
    client = null as unknown as InsForgeClient;
  }

  const result = await pool.query(`
    SELECT * FROM public.audit_jobs
    WHERE status = 'queued'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return { job: null, client };
  }

  const job = result.rows[0] as AuditJob;

  // `attempts + 1` en el claim: es el contador de ejecuciones REALES del job.
  // Nota: worker_id no debe ser el id del job (bug previo que rompía el heartbeat).
  await pool.query(`
    UPDATE public.audit_jobs
    SET status = 'processing',
        attempts = attempts + 1,
        worker_id = $1,
        locked_at = NOW(),
        heartbeat_at = NOW(),
        started_at = COALESCE(started_at, NOW())
    WHERE id = $2
  `, [workerId, job.id]);

  // Devolver el job con los valores ya incrementados
  const refreshed = await pool.query('SELECT * FROM public.audit_jobs WHERE id = $1', [job.id]);
  const updatedJob = refreshed.rows[0] as AuditJob;

  return { job: updatedJob, client };
}

// Release a job back to queued (uso manual)
export async function releaseJob(jobId: string): Promise<void> {
  if (!pool) return;

  await pool.query(`
    UPDATE public.audit_jobs
    SET status = 'queued',
        worker_id = NULL,
        locked_at = NULL,
        heartbeat_at = NULL,
        updated_at = NOW()
    WHERE id = $1
  `, [jobId]);
}

/**
 * Marca un job como fallido SIN volver a incrementar `attempts`
 * (el claim ya lo hizo). Decide 'queued' / 'error' según
 * `attempts` actual vs `maxAttempts`.
 */
export async function setJobError(jobId: string, error: string, maxAttempts: number = DEFAULT_MAX_ATTEMPTS): Promise<void> {
  if (!pool) return;

  const currentResult = await pool.query(
    'SELECT attempts FROM public.audit_jobs WHERE id = $1',
    [jobId],
  );
  const currentAttempts = currentResult.rows.length > 0 ? parseInt(currentResult.rows[0].attempts, 10) : 0;
  const status = resolveJobStatusAfterFailure(currentAttempts, maxAttempts);

  await pool.query(`
    UPDATE public.audit_jobs
    SET status = $2,
        error = $3,
        worker_id = NULL,
        locked_at = NULL,
        heartbeat_at = NULL,
        detail = $4,
        updated_at = NOW()
    WHERE id = $1
  `, [jobId, status, error, status === 'error' ? 'Fallo definitivo tras el límite de intentos' : 'Job reencolado para reintento']);
}

// Marca un job como completado con éxito
export async function markJobSuccess(jobId: string, result?: unknown, detail = 'Auditoría completada'): Promise<void> {
  if (!pool) return;

  await pool.query(`
    UPDATE public.audit_jobs
    SET status = 'success',
        result = $2,
        progress = 100,
        stage = 'completed',
        detail = $3,
        completed_at = NOW(),
        worker_id = NULL,
        locked_at = NULL,
        heartbeat_at = NULL,
        updated_at = NOW()
    WHERE id = $1
  `, [jobId, result ?? {}, detail]);
}

// Update job heartbeat (keeps lock alive)
export async function updateJobHeartbeat(jobId: string): Promise<void> {
  if (!pool) return;

  await pool.query(`
    UPDATE public.audit_jobs
    SET heartbeat_at = NOW(),
        updated_at = NOW()
    WHERE id = $1 AND status = 'processing'
  `, [jobId]);
}

// Reencola jobs abandonados (heartbeat vencido) preservando `attempts`
export async function requeueStaleJobs(timeoutMs: number = 300000): Promise<number> {
  if (!pool) return 0;
  const result = await pool.query('SELECT public.requeue_stale_audit_jobs($1) AS requeued', [timeoutMs]);
  return result.rows[0]?.requeued ?? 0;
}

// Get job by ID
export async function getJobById(jobId: string): Promise<{ job: AuditJob | null }> {
  if (!pool) return { job: null };

  const result = await pool.query(
    'SELECT * FROM public.audit_jobs WHERE id = $1',
    [jobId],
  );

  if (result.rows.length === 0) {
    return { job: null };
  }

  return { job: result.rows[0] as AuditJob };
}

// Update job progress and stage
export async function updateJobProgress(
  jobId: string,
  progress: number,
  stage: string,
  detail?: string,
): Promise<void> {
  if (!pool) return;

  await pool.query(`
    UPDATE public.audit_jobs
    SET progress = $2,
        stage = $3,
        detail = $4,
        updated_at = NOW()
    WHERE id = $1
  `, [jobId, progress, stage, detail || '']);
}

// Persiste el resultado sintetizado sin cambiar el estado (usado por el worker)
export async function updateJobResult(jobId: string, result: unknown): Promise<void> {
  if (!pool) return;

  await pool.query(`
    UPDATE public.audit_jobs
    SET result = $2,
        progress = 100,
        stage = 'completed',
        detail = 'Auditoría completada',
        updated_at = NOW()
    WHERE id = $1
  `, [jobId, result ?? {}]);
}

// Crea el job en estado 'queued' (sin filas de evidencia placeholder)
export async function createAuditJob(): Promise<AuditJob> {
  if (!pool) throw new Error('DATABASE_URL no configurada');

  const jobResult = await pool.query(`
    INSERT INTO public.audit_jobs (status, progress, stage, detail)
    VALUES ('queued', 0, 'queued', 'Job creado - esperando evidencias')
    RETURNING *
  `);

  return jobResult.rows[0] as AuditJob;
}

// Inserta las evidencias REALES del job con su metadata
export async function insertJobEvidences(jobId: string, items: EvidenceInsertInput[]): Promise<AuditJobEvidence[]> {
  if (!pool) return [];
  if (items.length === 0) return [];

  const rows: AuditJobEvidence[] = [];
  for (const item of items) {
    const result = await pool.query(`
      INSERT INTO public.audit_job_evidences
        (job_id, filename, mime_type, size_bytes, sha256, type, storage_key, storage_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `, [
      jobId,
      item.filename,
      item.mime_type,
      item.size_bytes,
      item.sha256,
      item.type,
      item.storage_key,
      item.storage_url || null,
    ]);
    rows.push(result.rows[0] as AuditJobEvidence);
  }
  return rows;
}

// Actualiza storage_key / storage_url de una evidencia tras el upload
export async function updateEvidenceStorage(
  evidenceId: string,
  storage: { storage_key?: string; storage_url?: string },
): Promise<void> {
  if (!pool) return;

  await pool.query(`
    UPDATE public.audit_job_evidences
    SET storage_key = COALESCE($2, storage_key),
        storage_url = COALESCE($3, storage_url),
        updated_at = NOW()
    WHERE id = $1
  `, [evidenceId, storage.storage_key ?? null, storage.storage_url ?? null]);
}

// Update evidence status for a job
export async function updateEvidenceStatus(
  evidenceId: string,
  status: 'pending' | 'processing' | 'success' | 'error',
  extraction?: unknown,
): Promise<void> {
  if (!pool) return;

  await pool.query(`
    UPDATE public.audit_job_evidences
    SET status = $2,
        extraction = $3,
        updated_at = NOW()
    WHERE id = $1
  `, [evidenceId, status, extraction ?? null]);
}

// Obtiene las evidencias de un job (filas frescas con su extracción)
export async function getJobEvidences(jobId: string): Promise<AuditJobEvidence[]> {
  if (!pool) return [];

  const result = await pool.query(
    `SELECT * FROM public.audit_job_evidences WHERE job_id = $1 ORDER BY created_at ASC`,
    [jobId],
  );
  return result.rows as AuditJobEvidence[];
}

// Get job progress with evidence counts
export async function getJobProgress(jobId: string): Promise<{
  job: AuditJob | null;
  evidenceCounts: { total: number; pending: number; processing: number; success: number; error: number };
}> {
  if (!pool) return { job: null, evidenceCounts: { total: 0, pending: 0, processing: 0, success: 0, error: 0 } };

  const jobResult = await pool.query('SELECT * FROM public.audit_jobs WHERE id = $1', [jobId]);
  const job = jobResult.rows.length > 0 ? jobResult.rows[0] as AuditJob : null;

  const evidenceResult = await pool.query(`
    SELECT status, COUNT(*) as count
      FROM public.audit_job_evidences
     WHERE job_id = $1
     GROUP BY status
  `, [jobId]);

  const evidenceCounts = {
    total: 0,
    pending: 0,
    processing: 0,
    success: 0,
    error: 0,
  };

  for (const row of evidenceResult.rows) {
    const status = row.status as keyof typeof evidenceCounts;
    if (Object.prototype.hasOwnProperty.call(evidenceCounts, status)) {
      evidenceCounts[status] = parseInt(row.count, 10);
    }
  }
  // total = suma de conteos, no rowCount de un GROUP BY (bug previo)
  evidenceCounts.total = evidenceCounts.pending + evidenceCounts.processing + evidenceCounts.success + evidenceCounts.error;

  return { job, evidenceCounts };
}

// Cierra el pool (usado en shutdown del worker)
export async function closePool(): Promise<void> {
  if (pool) {
    try { await pool.end(); } catch { /* noop */ }
    pool = null;
  }
}

export const auditJobRepository = {
  claimNextJob,
  releaseJob,
  setJobError,
  markJobSuccess,
  updateJobHeartbeat,
  requeueStaleJobs,
  getJobById,
  updateJobProgress,
  updateJobResult,
  createAuditJob,
  insertJobEvidences,
  updateEvidenceStorage,
  updateEvidenceStatus,
  getJobEvidences,
  getJobProgress,
};