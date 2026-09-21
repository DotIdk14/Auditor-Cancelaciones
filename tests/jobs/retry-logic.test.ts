/**
 * PRUEBAS DE LOGICA DE REINTENTO (claim + setJobError + resolveJobStatusAfterFailure).
 *
 * Reglas documentadas:
 *   - claimNextJob incrementa `attempts` (+1 por ejecución real).
 *   - setJobError NO incrementa (evita doble incremento).
 *   - status = 'error' cuando attempts >= max_attempts, 'queued' en otro caso.
 *   - Con max_attempts = 5:
 *       5 fallos → intentos = 5 → estado 'error'.
 *       fallo, fallo, éxito → intentos = 3 → estado 'success'.
 */
import assert from 'node:assert/strict';
import { resolveJobStatusAfterFailure, DEFAULT_MAX_ATTEMPTS } from '../../src/lib/jobs/audit-job-repository.js';
import type { AuditJob } from '../../src/lib/jobs/audit-job-repository.js';
import { FakeRepo } from './fake-repo.js';

export interface JTest {
  name: string;
  passed: boolean;
  detail?: string;
}

function fakeJob(overrides: Partial<AuditJob> = {}): AuditJob {
  return {
    id: 'j1',
    status: 'queued',
    progress: 0,
    stage: 'queued',
    attempts: 0,
    max_attempts: DEFAULT_MAX_ATTEMPTS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as AuditJob;
}

export async function runRetryLogicTests(): Promise<JTest[]> {
  const tests: JTest[] = [];
  const tf = (name: string, fn: () => boolean | Promise<boolean>, detail?: string) =>
    tests.push({ name, passed: !!fn(), detail });

  try {
    // 1) resolveJobStatusAfterFailure: errores boundaries
    {
      tf('resolveJobStatusAfterFailure(1, 5) = queued (aún quedan reintentos)',
        () => resolveJobStatusAfterFailure(1, 5) === 'queued');
      tf('resolveJobStatusAfterFailure(4, 5) = queued',
        () => resolveJobStatusAfterFailure(4, 5) === 'queued');
      tf('resolveJobStatusAfterFailure(5, 5) = error (límite alcanzado)',
        () => resolveJobStatusAfterFailure(5, 5) === 'error');
      tf('resolveJobStatusAfterFailure(6, 5) = error (más allá del límite)',
        () => resolveJobStatusAfterFailure(6, 5) === 'error');
      tf('resolveJobStatusAfterFailure(3, 3) = error (max_attempts más bajo)',
        () => resolveJobStatusAfterFailure(3, 3) === 'error');
    }

    // 2) Sin doble incremento: claim + 1, setJobError 0
    {
      const repo = new FakeRepo();
      const job = repo.seedJob({ id: 'no-double', status: 'queued', attempts: 0, max_attempts: 5 });
      const claimed = await repo.claimNextJob('w1');
      tf('claimNextJob incrementa attempts de 0 a 1',
        () => Boolean(claimed.job && claimed.job.attempts === 1),
        `attempts after claim: ${claimed.job?.attempts}`);

      if (claimed.job) {
        await repo.setJobError(claimed.job.id, 'fallo', 5);
        const jobAfter = repo.jobs.get('no-double')!;
        tf('setJobError NO vuelve a incrementar: attempts sigue en 1',
          () => jobAfter.attempts === 1 && jobAfter.status === 'queued',
          `attempts=${jobAfter.attempts} status=${jobAfter.status}`);
      }
    }

    // 3) Simulación: 5 fallos → status error tras 5 ejecuciones reales
    {
      const repo = new FakeRepo();
      const job = repo.seedJob({ id: 'fail5', status: 'queued', attempts: 0, max_attempts: 5 });
      const maxExecutions = 5;
      for (let i = 0; i < maxExecutions; i++) {
        const { job: claimed } = await repo.claimNextJob(`w_${i}`);
        if (!claimed) throw new Error(`Expected queued job on iteration ${i}`);
        tf(`Iteración ${i + 1}: claim incrementa a attempts=${claimed.attempts}`,
          () => claimed.attempts === i + 1);
        await repo.setJobError(claimed.id, `fallo_${i + 1}`, claimed.max_attempts);
      }
      const final = repo.jobs.get('fail5')!;
      tf('Tras 5 fallos: status = error definitivo',
        () => final.status === 'error' && final.attempts === 5,
        `status=${final.status} attempts=${final.attempts}`);
    }

    // 4) Simulación: 2 fallos + éxito → 3 ejecuciones, status success
    {
      const repo = new FakeRepo();
      const job = repo.seedJob({ id: 'fail2', status: 'queued', attempts: 0, max_attempts: 5 });

      // 2 fallos
      for (let i = 0; i < 2; i++) {
        const { job: c } = await repo.claimNextJob('w_fail');
        if (c) await repo.setJobError(c.id, 'fallo', 5);
      }
      const afterFails = repo.jobs.get('fail2')!;
      tf('Tras 2 fallos: status queued, attempts=2',
        () => afterFails.status === 'queued' && afterFails.attempts === 2,
        `attempts=${afterFails.attempts} status=${afterFails.status}`);

      // Éxito en la 3ª ejecución
      const { job: c } = await repo.claimNextJob('w_success');
      if (c) await repo.markJobSuccess(c.id, { ok: true }, 'completado');
      const final = repo.jobs.get('fail2')!;
      tf('3ª ejecución éxito: status success, attempts=3',
        () => final.status === 'success' && final.attempts === 3,
        `attempts=${final.attempts} status=${final.status}`);
    }

    // 5) Recuperación de jobs huérfanos (claim-death-stale-recovery)
    {
      const repo = new FakeRepo();
      const staleJob = repo.seedJob({
        id: 'stale-dead',
        status: 'processing',
        worker_id: 'worker_muerto',
        heartbeat_at: new Date(Date.now() - 600000).toISOString(), // 10 min sin heartbeat
        locked_at: new Date(Date.now() - 600000).toISOString(),
        attempts: 1,
      });
      const freshJob = repo.seedJob({
        id: 'fresh-alive',
        status: 'processing',
        worker_id: 'worker_vivo',
        heartbeat_at: new Date().toISOString(), // heartbeat reciente
        locked_at: new Date().toISOString(),
        attempts: 1,
      });

      const requeued = await repo.requeueStaleJobs(300000);

      tf('Job con heartbeat caducado (10 min) se re-encola (status queued)',
        () => repo.jobs.get('stale-dead')!.status === 'queued' && requeued === 1,
        `requeued=${requeued} stale=${repo.jobs.get('stale-dead')!.status}`);
      tf('Job con heartbeat fresco NO se re-encola (sigue processing)',
        () => repo.jobs.get('fresh-alive')!.status === 'processing',
        `fresh=${repo.jobs.get('fresh-alive')!.status}`);

      // Un worker NUEVO puede reclamar y terminar el job huérfano
      const { job: recovered } = await repo.claimNextJob('worker_nuevo');
      tf('Worker nuevo reclama el job huérfano re-encolado',
        () => Boolean(recovered && recovered.id === 'stale-dead'),
        `recovered=${recovered?.id}`);
      if (recovered) {
        await repo.markJobSuccess(recovered.id, { ok: true }, 'recuperado');
        const final = repo.jobs.get('stale-dead')!;
        tf('Job huérfano recuperado: attempts=2, status success (sin doble incremento)',
          () => final.status === 'success' && final.attempts === 2,
          `attempts=${final.attempts} status=${final.status}`);
      }
    }
  } catch (err) {
    tests.push({ name: 'SUITE RETRY — ERROR INESPERADO', passed: false, detail: err instanceof Error ? err.stack : String(err) });
  }

  const passed = tests.filter(t => t.passed).length;
  console.log(`\n[Retry Logic] ${passed}/${tests.length} aprobadas`);
  return tests;
}