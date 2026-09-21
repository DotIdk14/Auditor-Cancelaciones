/**
 * Fake repo en memoria (IMPLICACIONES DE TEST: no toca Postgres).
 * Implementa el contrato estructural de `AuditJobRepositoryLike` y registra
 * todas las llamadas para poder verificar "quién llamó a qué" (p.ej. probar
 * que el endpoint 202 NO llama a ningún servicio externo).
 */
import type { AuditJob, AuditJobEvidence, EvidenceInsertInput } from '../../src/lib/jobs/audit-job-repository.js';
import type { InsForgeClient } from '@insforge/sdk';

let seq = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(++seq).toString(36)}`;

export class FakeRepo {
  jobs = new Map<string, AuditJob>();
  evidences = new Map<string, AuditJobEvidence>();
  calls: string[] = [];
  uploads: Array<{ path: string; bucket: string; blob: any }> = [];
  heartbeatTimestamps: Array<{ jobId: string; at: string }> = [];

  private record(method: string) {
    this.calls.push(method);
  }

  seedJob(overrides: Partial<AuditJob> = {}): AuditJob {
    const job: AuditJob = {
      id: nextId('job'),
      status: 'queued',
      progress: 0,
      stage: 'queued',
      detail: '',
      attempts: 0,
      max_attempts: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    } as AuditJob;
    this.jobs.set(job.id, job);
    return job;
  }

  seedEvidence(jobId: string, overrides: Partial<AuditJobEvidence> = {}): AuditJobEvidence {
    const ev: AuditJobEvidence = {
      id: nextId('ev'),
      job_id: jobId,
      filename: 'fixture.bin',
      mime_type: 'application/pdf',
      size_bytes: 123,
      sha256: 'abc',
      type: 'PDF',
      storage_key: `audit-jobs/${jobId}/ev_1/fixture.bin`,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    } as AuditJobEvidence;
    this.evidences.set(ev.id, ev);
    return ev;
  }

  async createAuditJob(): Promise<AuditJob> {
    this.record('createAuditJob');
    return this.seedJob();
  }

  async insertJobEvidences(jobId: string, items: EvidenceInsertInput[]): Promise<AuditJobEvidence[]> {
    this.record('insertJobEvidences');
    return items.map(item => this.seedEvidence(jobId, {
      filename: item.filename,
      mime_type: item.mime_type,
      size_bytes: item.size_bytes,
      sha256: item.sha256,
      type: item.type,
      storage_key: item.storage_key,
      storage_url: item.storage_url,
    }));
  }

  async updateEvidenceStorage(evidenceId: string, storage: { storage_key?: string; storage_url?: string }): Promise<void> {
    this.record('updateEvidenceStorage');
    const ev = this.evidences.get(evidenceId);
    if (ev) {
      ev.storage_key = storage.storage_key ?? ev.storage_key;
      ev.storage_url = storage.storage_url ?? ev.storage_url;
    }
  }

  async updateEvidenceStatus(evidenceId: string, status: AuditJobEvidence['status'], extraction?: unknown): Promise<void> {
    this.record(`updateEvidenceStatus:${status}`);
    const ev = this.evidences.get(evidenceId);
    if (ev) {
      ev.status = status;
      if (extraction !== undefined) ev.extraction = extraction;
    }
  }

  async updateJobProgress(jobId: string, progress: number, stage: string, detail?: string): Promise<void> {
    this.record(`updateJobProgress:${stage}`);
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
      job.stage = stage;
      if (detail !== undefined) job.detail = detail;
    }
  }

  async updateJobResult(jobId: string, result: unknown): Promise<void> {
    this.record('updateJobResult');
    const job = this.jobs.get(jobId);
    if (job) job.result = result;
  }

  async updateJobHeartbeat(jobId: string): Promise<void> {
    this.record('updateJobHeartbeat');
    const job = this.jobs.get(jobId);
    if (job) {
      job.heartbeat_at = new Date().toISOString();
      this.heartbeatTimestamps.push({ jobId, at: new Date().toISOString() });
    }
  }

  async requeueStaleJobs(timeoutMs?: number): Promise<number> {
    this.record('requeueStaleJobs');
    const cutoff = Date.now() - (timeoutMs ?? 300000);
    let n = 0;
    for (const job of this.jobs.values()) {
      if (job.status !== 'processing') continue;
      const last = job.heartbeat_at ? new Date(job.heartbeat_at).getTime() : 0;
      const stale = !last || last < cutoff;
      if (stale) {
        job.status = 'queued';
        job.worker_id = null;
        job.locked_at = null;
        job.heartbeat_at = null;
        n++;
      }
    }
    return n;
  }

  async claimNextJob(workerId: string): Promise<{ job: AuditJob | null; client: any }> {
    this.record('claimNextJob');
    const queued = [...this.jobs.values()]
      .filter(j => j.status === 'queued')
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (queued.length === 0) return { job: null, client: null };
    const job = queued[0];
    job.status = 'processing';
    job.attempts += 1;
    job.worker_id = workerId;
    job.locked_at = new Date().toISOString();
    job.heartbeat_at = new Date().toISOString();
    return { job, client: null };
  }

  async releaseJob(jobId: string): Promise<void> {
    this.record('releaseJob');
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'queued';
    job.worker_id = null;
    job.locked_at = null;
    job.heartbeat_at = null;
  }

  async setJobError(jobId: string, error: string, maxAttempts: number = 5): Promise<void> {
    this.record('setJobError');
    const job = this.jobs.get(jobId);
    if (!job) return;
    // NO incrementa: el claim ya lo hizo (garantiza sin doble incremento)
    job.status = job.attempts >= maxAttempts ? 'error' : 'queued';
    job.error = error;
    job.worker_id = null;
    job.locked_at = null;
    job.heartbeat_at = null;
  }

  async markJobSuccess(jobId: string, result?: unknown, detail = 'Auditoría completada'): Promise<void> {
    this.record('markJobSuccess');
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'success';
    job.result = result ?? job.result ?? {};
    job.progress = 100;
    job.stage = 'completed';
    job.detail = detail;
    job.completed_at = new Date().toISOString();
    job.worker_id = null;
    job.locked_at = null;
    job.heartbeat_at = null;
  }

  async getJobEvidences(jobId: string): Promise<AuditJobEvidence[]> {
    this.record('getJobEvidences');
    return [...this.evidences.values()].filter(ev => ev.job_id === jobId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async getJobById(jobId: string): Promise<{ job: AuditJob | null }> {
    this.record('getJobById');
    return { job: this.jobs.get(jobId) ?? null };
  }

  async getJobProgress(jobId: string): Promise<{
    job: AuditJob | null;
    evidenceCounts: { total: number; pending: number; processing: number; success: number; error: number };
  }> {
    this.record('getJobProgress');
    const job = this.jobs.get(jobId) ?? null;
    const evs = [...this.evidences.values()].filter(ev => ev.job_id === jobId);
    const counts = { total: evs.length, pending: 0, processing: 0, success: 0, error: 0 };
    for (const ev of evs) counts[ev.status as keyof typeof counts] += 1;
    return { job, evidenceCounts: counts };
  }
}

/** Factory de cliente InsForge fake: registra uploads, nunca toca red/storage real. */
export function makeFakeStorageClient(uploads: Array<{ path: string; bucket: string; blob: any }>): InsForgeClient {
  return {
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, blob: any) => {
          uploads.push({ path, bucket, blob });
          const size = typeof blob?.size === 'number' ? blob.size : 0;
          return {
            data: {
              key: path,
              url: `https://storage.test/${bucket}/${path}`,
              size,
              bucket,
              mimeType: blob?.type ?? '',
              uploadedAt: new Date().toISOString(),
            },
            error: null,
          };
        },
      }),
    },
  } as unknown as InsForgeClient;
}