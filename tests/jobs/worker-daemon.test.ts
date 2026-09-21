import './env.js';
import assert from 'node:assert/strict';
import { FakeRepo, makeFakeStorageClient } from './fake-repo.js';
import { buildImageEvidence } from './pdf-fixtures.js';
import { startWorker, stopWorker } from '../../src/lib/jobs/audit-worker.js';
import type { AuditJobEvidence } from '../../src/lib/jobs/audit-job-repository.js';

export interface JTest { name: string; passed: boolean; detail?: string }

function tf(name: string, fn: () => boolean | Promise<boolean>, detail?: string): JTest {
  return { name, passed: !!fn(), detail };
}

function quickVision() {
  return async (_buf: Buffer, _mime: string) => ({
    result: { hechos: [{ tipo: 'v', valor: 'ok', confianza: 'ALTA' }], visual_facts: { c: { campo: 'm', valor: 'ok', confianza: 'ALTA' } } },
  });
}

export async function runWorkerDaemonTests(): Promise<JTest[]> {
  const tests: JTest[] = [];

  // ---------------------------------------------------------------
  // Daemon: continuously polls, processes, stays alive after first job
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const png = await buildImageEvidence();
    // maxJobs=0 = unlimited (never auto-stop)
    startWorker(0, 150, {
      repo,
      extractImageWithVision: quickVision() as any,
      readBuffer: async () => png,
      synthesize: async () => ({ clasificacion: 'APROBADA' }),
    });

    // Seed first job → immediately claimed
    const j1 = repo.seedJob({ id: 'd1', attempts: 0, max_attempts: 5 });
    repo.seedEvidence(j1.id, { type: 'IMAGE', filename: 'a.png', mime_type: 'image/png', storage_key: 'a.png' });

    await new Promise(r => setTimeout(r, 500));

    const j1After = repo.jobs.get('d1')!;
    tests.push(tf('Daemon: primer job procesado (status success)', () => j1After.status === 'success',
      `status=${j1After.status} attempts=${j1After.attempts}`));

    // Seed second job → proof that polling continues (worker stays alive)
    const j2 = repo.seedJob({ id: 'd2', attempts: 0, max_attempts: 5 });
    repo.seedEvidence(j2.id, { type: 'IMAGE', filename: 'b.png', mime_type: 'image/png', storage_key: 'b.png' });

    await new Promise(r => setTimeout(r, 500));

    const j2After = repo.jobs.get('d2')!;
    tests.push(tf('Daemon: segundo job también procesado (worker sigo vivo)', () => j2After.status === 'success',
      `status=${j2After.status}`));

    // Stop → third job NOT processed
    stopWorker();
    const j3 = repo.seedJob({ id: 'd3', attempts: 0, max_attempts: 5 });
    repo.seedEvidence(j3.id, { type: 'IMAGE', filename: 'c.png', mime_type: 'image/png', storage_key: 'c.png' });

    await new Promise(r => setTimeout(r, 400));

    const j3After = repo.jobs.get('d3')!;
    tests.push(tf('Daemon: tras stopWorker, job nuevo NO se procesa', () => j3After.status === 'queued',
      `status=${j3After.status}`));
  }

  // ---------------------------------------------------------------
  // Heartbeat renews: with interval=40, long processing=160ms → ≥3 heartbeats
  // ---------------------------------------------------------------
  {
    // already tested in worker-flow.test.ts via runJobProcessing heartbeatMs=50 + 200ms work
    // but this is a second signal via the daemon path: processEvidenceBatch with slow vision
    // startWorker was just stopped above; re-use repo+evidence approach to count heartbeat calls
    const repo = new FakeRepo();
    const hbJob = repo.seedJob({ id: 'hb-daemon', attempts: 0, max_attempts: 5 });
    repo.seedEvidence(hbJob.id, { type: 'IMAGE', filename: 'slow.png', mime_type: 'image/png', storage_key: 'slow.png' });

    const png = await buildImageEvidence();
    let visionCalls = 0;
    const slowVision = async () => {
      visionCalls++;
      await new Promise(r => setTimeout(r, 180));
      return { result: { hechos: [{ tipo: 'v', valor: 'ok', confianza: 'ALTA' }], visual_facts: { c: { campo: 'm', valor: 'ok', confianza: 'ALTA' } } }};
    };

    // re-start daemon with heartbeat interval 40ms
    startWorker(1, 500, {
      repo,
      extractImageWithVision: slowVision as any,
      readBuffer: async () => png,
      heartbeatMs: 40,
      synthesize: async () => ({ clasificacion: 'APROBADA' }),
    });

    // Wait for processing (heartbeatMs=40, work=180ms → ≥4 heartbeats in ~180ms)
    await new Promise(r => setTimeout(r, 600));
    stopWorker();

    const hbCount = repo.calls.filter(c => c === 'updateJobHeartbeat').length;
    tests.push(tf('Daemon heartbeat: ≥ 2 heartbeats durante procesamiento lento',
      () => hbCount >= 2,
      `heartbeatCalls=${hbCount}`));
    tests.push(tf('Daemon heartbeat: job completado después del procesamiento',
      () => (repo.jobs.get('hb-daemon')?.status ?? '') === 'success',
      `status=${repo.jobs.get('hb-daemon')?.status}`));
  }

  const passed = tests.filter(t => t.passed).length;
  console.log(`\n[Worker Daemon] ${passed}/${tests.length} aprobadas`);
  return tests;
}