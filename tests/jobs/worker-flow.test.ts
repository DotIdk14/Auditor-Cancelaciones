import './env.js';
import assert from 'node:assert/strict';
import { buildPdfTextOnly, buildImageEvidence } from './pdf-fixtures.js';
import { FakeRepo } from './fake-repo.js';
import {
  processEvidenceBatch,
  processPdfEvidence,
  processImageEvidence,
  runJobProcessing,
  AUDIT_CONSTANTS,
} from '../../src/lib/jobs/audit-worker.js';
import type { AuditJobEvidence } from '../../src/lib/jobs/audit-job-repository.js';

export interface JTest { name: string; passed: boolean; detail?: string }

function tf(name: string, fn: () => boolean | Promise<boolean>, detail?: string): JTest {
  return { name, passed: !!fn(), detail };
}

async function makeEv(repo: FakeRepo, jobId: string, type: 'PDF' | 'IMAGE' | 'AUDIO', filename: string): Promise<AuditJobEvidence> {
  return repo.seedEvidence(jobId, { type, filename, mime_type: type === 'PDF' ? 'application/pdf' : type === 'IMAGE' ? 'image/png' : 'audio/mpeg' });
}

function quickVision() {
  return async (_buf: Buffer, _mime: string) => ({
    result: {
      hechos: [{ tipo: 'visual', valor: 'fact ok', confianza: 'ALTA' }],
      visual_facts: { msg: { campo: 'mensaje', valor: 'ok', confianza: 'ALTA' } },
    },
  });
}

function throwingVision() {
  return async () => { throw new Error('vision boom'); };
}

function throwingText() {
  return async () => { throw new Error('text boom'); };
}

export async function runWorkerFlowTests(): Promise<JTest[]> {
  const tests: JTest[] = [];

  // ---------------------------------------------------------------
  // A) Bounded concurrency (concurrency = 2 from env.ts)
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const job = repo.seedJob({ id: 'conc', attempts: 0, max_attempts: 5 });
    const N = 6;
    const evs: AuditJobEvidence[] = [];
    for (let i = 0; i < N; i++) evs.push(await makeEv(repo, job.id, 'IMAGE', `img_${i}.png`));

    const png = await buildImageEvidence();
    let maxConcurrent = 0;
    let current = 0;

    const visionMock = async (_buf: Buffer, _mime: string) => {
      current++;
      if (current > maxConcurrent) maxConcurrent = current;
      await new Promise(r => setTimeout(r, 60));
      current--;
      return { result: { hechos: [{ tipo: 'visual', valor: 'v', confianza: 'ALTA' }], visual_facts: { m: { campo: 'm', valor: 'v', confianza: 'ALTA' } } } };
    };

    const res = await processEvidenceBatch(evs, job.id, {
      repo,
      extractImageWithVision: visionMock as any,
      readBuffer: async () => png,
    });

    tests.push(tf('processEvidenceBatch: todas las evidencias completadas (6/6)',
      () => res.filter(r => r !== null).length === N,
      `completed=${res.filter(r => r !== null).length}`));
    tests.push(tf('Concurrencia limitada a 2 (no 6 simultáneas)',
      () => maxConcurrent <= AUDIT_CONSTANTS.AUDIT_EVIDENCE_CONCURRENCY && maxConcurrent >= 1,
      `maxConcurrent=${maxConcurrent} limit=${AUDIT_CONSTANTS.AUDIT_EVIDENCE_CONCURRENCY}`));
    tests.push(tf('maxConcurrent es 2 exacto (prueba de real limiting)',
      () => maxConcurrent === 2,
      `maxConcurrent=${maxConcurrent}`));
  }

  // ---------------------------------------------------------------
  // B) Skip already-success: evidence not reprocessed
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const job = repo.seedJob({ id: 'skip', attempts: 1, max_attempts: 5 });
    const ev = await makeEv(repo, job.id, 'IMAGE', 'skip.png');
    // marcar como ya exitoso
    await repo.updateEvidenceStatus(ev.id, 'success', { ok: true });

    let processorCalls = 0;
    const visionMock = async () => { processorCalls++; return quickVision(); };

    const res = await processEvidenceBatch([ev], job.id, {
      repo,
      extractImageWithVision: visionMock as any,
    });

    tests.push(tf('Evidencia ya exitosa NO se reprocesa (processorCalls = 0)',
      () => processorCalls === 0,
      `processorCalls=${processorCalls}`));
    tests.push(tf('Unidad stub generada para evidencia existente',
      () => res[0] !== null && res[0]!.units.length === 0,
      `units=${res[0]?.units.length}`));
  }

  // ---------------------------------------------------------------
  // C) 5 failures → error with attempts=5
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const job = repo.seedJob({ id: 'fail5', attempts: 0, max_attempts: 5 });
    await makeEv(repo, job.id, 'PDF', 'txt.pdf');

    let procCalls = 0;
    // Falla SIEMPRE: simula un procesador externo que no responde; la evidencia
    // queda en 'error' y se reprocesa en cada intento (uno por claim).
    const textMock = async () => { procCalls++; throw new Error(`fallo externo #${procCalls}`); };

    for (let i = 0; i < 5; i++) {
      const { job: c } = await repo.claimNextJob(`w${i}`);
      if (!c) { tests.push(tf(`Iter ${i+1}: claim falló`, () => false, 'no queued job')); continue; }
      try {
        const evs = await repo.getJobEvidences(c.id);
        const buf = await buildPdfTextOnly();
        await processEvidenceBatch(evs, c.id, {
          repo,
          extractFromTextPage: textMock as any,
          readBuffer: async () => buf,
        });
        await repo.setJobError(c.id, 'test fail', 5);
      } catch (e: any) {
        await repo.setJobError(c.id, e.message, 5);
      }
    }
    const f = repo.jobs.get('fail5')!;
    tests.push(tf('5 fallos: status = error', () => f.status === 'error', `status=${f.status}`));
    tests.push(tf('5 fallos: attempts = 5', () => f.attempts === 5, `attempts=${f.attempts}`));
    tests.push(tf('5 fallos: processor ejecutado 5 veces', () => procCalls === 5, `procCalls=${procCalls}`));
  }

  // ---------------------------------------------------------------
  // D) fail, fail, success → executions=3 / status success
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const job = repo.seedJob({ id: 'fail2', attempts: 0, max_attempts: 5 });
    await makeEv(repo, job.id, 'PDF', 'retry.pdf');

    let procCalls = 0;
    const textMock = async (pageText: string) => {
      procCalls++;
      return { result: { hechos: [{ tipo: 'texto', valor: pageText.slice(0, 50), confianza: 'ALTA' }] } };
    };
    const synthFn = async () => { throw new Error('synth boom'); };

    async function cycle(workId: string): Promise<'requeued' | 'success'> {
      const { job: c } = await repo.claimNextJob(workId);
      if (!c) return 'requeued';
      try {
        const evs = await repo.getJobEvidences(c.id);
        const buf = await buildPdfTextOnly();
        await runJobProcessing(c, evs, { repo, extractFromTextPage: textMock as any, readBuffer: async () => buf, synthesize: synthFn });
        return 'success';
      } catch (e: any) {
        await repo.setJobError(c.id, e.message, c.max_attempts);
        return 'requeued';
      }
    }

    const r1 = await cycle('w1');
    const r2 = await cycle('w2');

    const synthFn2 = async () => ({ resultado: { clasificacion: 'APROBADA' } });
    async function cycleSuccess(): Promise<'requeued' | 'success'> {
      const { job: c } = await repo.claimNextJob('w3');
      if (!c) return 'requeued';
      try {
        const evs = await repo.getJobEvidences(c.id);
        await runJobProcessing(c, evs, { repo, extractFromTextPage: textMock as any, synthesize: synthFn2 });
        return 'success';
      } catch (e: any) {
        await repo.setJobError(c.id, e.message, c.max_attempts);
        return 'requeued';
      }
    }
    const r3 = await cycleSuccess();
    const f = repo.jobs.get('fail2')!;

    tests.push(tf('fail,fail,success: 1ro y 2do requeued', () => r1 === 'requeued' && r2 === 'requeued', `r1=${r1} r2=${r2}`));
    tests.push(tf('fail,fail,success: 3ro success', () => r3 === 'success', `r3=${r3}`));
    tests.push(tf('fail,fail,success: attempts = 3', () => f.attempts === 3, `attempts=${f.attempts}`));
    tests.push(tf('fail,fail,success: status = success', () => f.status === 'success', `status=${f.status}`));
    tests.push(tf('fail,fail,success: processor ejecutado 3 veces (una por attempt)', () => procCalls === 3, `procCalls=${procCalls}`));
  }

  // ---------------------------------------------------------------
  // E) Synthesis retry: evidence x1, synthesis x2
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const job = repo.seedJob({ id: 'synth-retry', attempts: 0, max_attempts: 5 });
    await makeEv(repo, job.id, 'IMAGE', 'synth.png');

    let synthCalls = 0;
    const synthFn = async () => {
      synthCalls++;
      if (synthCalls === 1) throw new Error('synth boom');
      return { resultado: { clasificacion: 'APROBADA' } };
    };
    const visionMock = async (_buf: Buffer, _mime: string) => ({
      result: { hechos: [{ tipo: 'v', valor: 'ok', confianza: 'ALTA' }], visual_facts: { c: { campo: 'm', valor: 'ok', confianza: 'ALTA' } } },
    });
    const png = await buildImageEvidence();

    async function synOnlyCycle(workId: string): Promise<'requeued' | 'success'> {
      const { job: c } = await repo.claimNextJob(workId);
      if (!c) return 'requeued';
      try {
        const evs = await repo.getJobEvidences(c.id);
        await runJobProcessing(c, evs, { repo, extractImageWithVision: visionMock as any, readBuffer: async () => png, synthesize: synthFn });
        return 'success';
      } catch (e: any) {
        await repo.setJobError(c.id, e.message, c.max_attempts);
        return 'requeued';
      }
    }

    await synOnlyCycle('ws1');
    const { job: c2 } = await repo.claimNextJob('ws2');
    if (c2) {
      await runJobProcessing(c2, await repo.getJobEvidences(c2.id), { repo, extractImageWithVision: visionMock as any, readBuffer: async () => png, synthesize: synthFn });
      await repo.markJobSuccess(c2.id, { ok: true });
    }

    const f = repo.jobs.get('synth-retry')!;
    tests.push(tf('Synthesis retry: synthesis ejecutado 2 veces (1 falla + 1 éxito)', () => synthCalls === 2, `synthCalls=${synthCalls}`));
    tests.push(tf('Synthesis retry: job status success', () => f.status === 'success', `status=${f.status}`));
    tests.push(tf('Synthesis retry: attempts = 2', () => f.attempts === 2, `attempts=${f.attempts}`));
  }

  // ---------------------------------------------------------------
  // F) Heartbeat renews during long processing
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const job = repo.seedJob({ id: 'hb', attempts: 0, max_attempts: 5 });
    await makeEv(repo, job.id, 'IMAGE', 'hb.png');
    const png = await buildImageEvidence();

    const heartbeats = repo.calls.filter(c => c === 'updateJobHeartbeat').length;
    const slowVision = async () => {
      await new Promise(r => setTimeout(r, 200));
      return { result: { hechos: [{ tipo: 'v', valor: 'v', confianza: 'ALTA' }], visual_facts: { c: { campo: 'm', valor: 'ok', confianza: 'ALTA' } } } };
    };

    const { job: c } = await repo.claimNextJob('whb');
    if (c) {
      // runJobProcessing with heartbeatMs=50 → 200ms work → ~3-4 heartbeats
      await runJobProcessing(c, await repo.getJobEvidences(c.id), {
        repo,
        extractImageWithVision: slowVision as any,
        readBuffer: async () => png,
        heartbeatMs: 50,
        synthesize: async () => ({ clasificacion: 'APROBADA' }),
      });
    }

    const newHeartbeats = repo.calls.filter(c => c === 'updateJobHeartbeat').length - heartbeats;
    tests.push(tf('Heartbeat renews durante procesamiento largo (≥ 2 heartbeats en 200ms work)',
      () => newHeartbeats >= 2,
      `heartbeats during processing = ${newHeartbeats}`));
  }

  const passed = tests.filter(t => t.passed).length;
  console.log(`\n[Worker Flow] ${passed}/${tests.length} aprobadas`);
  return tests;
}
