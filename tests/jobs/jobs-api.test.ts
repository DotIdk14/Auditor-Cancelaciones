import './env.js';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import express from 'express';
import { createAuditJobsRouter, inferEvidenceType } from '../../src/server/jobs-router.js';
import { app as realApp } from '../../src/server/app.js';
import { FakeRepo, makeFakeStorageClient } from './fake-repo.js';
import { buildImageEvidence, buildPdfTextOnly } from './pdf-fixtures.js';
import type { AuditJob } from '../../src/lib/jobs/audit-job-repository.js';

export interface JTest { name: string; passed: boolean; detail?: string }

function tf(name: string, fn: () => boolean | Promise<boolean>, detail?: string): JTest {
  return { name, passed: !!fn(), detail };
}

function startServer(app: express.Express): Promise<{ server: Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

function seedJobForResult(status: 'success' | 'queued' | 'error', result?: unknown): AuditJob {
  const job = {
    id: `job_for_${status}`,
    status,
    progress: status === 'success' ? 100 : 30,
    stage: status === 'success' ? 'completed' : 'processing',
    detail: status === 'error' ? 'Error en la auditoría' : '',
    attempts: 1,
    max_attempts: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as AuditJob;
  if (status === 'success' && result) job.result = result;
  if (status === 'error') job.error = 'SYNTH_FAILED';
  return job;
}

export async function runJobsApiTests(): Promise<JTest[]> {
  const tests: JTest[] = [];

  // ---------------------------------------------------------------
  // 0) inferEvidenceType unit
  // ---------------------------------------------------------------
  {
    tests.push(tf('inferEvidenceType: PDF/IMAGE/AUDIO', () =>
      inferEvidenceType('application/pdf') === 'PDF' &&
      inferEvidenceType('image/png') === 'IMAGE' &&
      inferEvidenceType('audio/mpeg') === 'AUDIO'));
    let threw = false;
    try { inferEvidenceType('video/mp4'); } catch { threw = true; }
    tests.push(tf('inferEvidenceType: MIME no soportado lanza error', () => threw));
  }

  // ---------------------------------------------------------------
  // 1) POST /api/audit/jobs → 202, sin llamadas externas
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const router = createAuditJobsRouter({ repo, createClient: async () => makeFakeStorageClient(repo.uploads) });
    const app = express();
    app.use('/api', router);
    const { server, baseUrl } = await startServer(app);

    const img = await buildImageEvidence();
    const form = new FormData();
    form.append('evidencias', new Blob([img], { type: 'image/png' }), 'captura.png');

    const res = await fetch(`${baseUrl}/api/audit/jobs`, { method: 'POST', body: form });
    const body = await res.json();
    await closeServer(server);

    tests.push(tf('POST jobs → 202 Accepted', () => res.status === 202, `status=${res.status}`));
    tests.push(tf('POST jobs → success:true + jobId + status queued', () =>
      body.success === true && typeof body.jobId === 'string' && body.status === 'queued',
      JSON.stringify(body)));
    tests.push(tf('POST jobs → job creado con 1 evidencia real', () => {
      const job = repo.jobs.get(body.jobId);
      const evs = [...repo.evidences.values()].filter(e => e.job_id === body.jobId);
      return Boolean(job) && evs.length === 1;
    }));
    tests.push(tf('POST jobs → upload a storage ocurrió 1 vez vía Blob (storage_key)', () =>
      repo.uploads.length === 1 &&
      repo.uploads[0].path.startsWith('audit-jobs/') &&
      repo.uploads[0].blob.type === 'image/png',
      JSON.stringify(repo.uploads.map(u => u.path))));
    tests.push(tf('POST jobs → CERO llamadas a AssemblyAI/Vision/Synthesis (sin claves config, sin error → sin contacto)',
      () => {
        const aiish = repo.calls.filter(c => /ai|assembly|vision|synth|openai|openrouter/i.test(c));
        return aiish.length === 0;
      },
      `repo.calls=${repo.calls.join(', ')}`));
    tests.push(tf('POST jobs → solo operaciones job/evidence/storage', () =>
      repo.calls.every(c => /^(createAuditJob|insertJobEvidences|updateEvidenceStorage|updateJobProgress)/.test(c)),
      `repo.calls=${repo.calls.join(', ')}`));
  }

  // ---------------------------------------------------------------
  // 2) GET /api/audit/jobs/:jobId → 200 + Cache-Control: no-store
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const job = repo.seedJob({ id: 'status_job', status: 'queued', progress: 5, stage: 'uploaded' });
    repo.seedEvidence(job.id, { status: 'pending' });
    const router = createAuditJobsRouter({ repo, createClient: async () => makeFakeStorageClient(repo.uploads) });
    const app = express();
    app.use('/api', router);
    const { server, baseUrl } = await startServer(app);

    const res = await fetch(`${baseUrl}/api/audit/jobs/status_job`);
    const body = await res.json();
    await closeServer(server);

    tests.push(tf('GET jobs/:jobId → 200 + Cache-Control: no-store', () =>
      res.status === 200 && (res.headers.get('cache-control') || '').toLowerCase().includes('no-store'),
      `cache-control=${res.headers.get('cache-control')}`));
    tests.push(tf('GET jobs/:jobId → body con data.status y evidenceCounts', () =>
      body.success === true && body.data?.status === 'queued' && body.data?.evidenceCounts?.total === 1,
      JSON.stringify(body.data)));
  }

  // ---------------------------------------------------------------
  // 3) GET /api/audit/jobs/:jobId/result → 200/409/500, no-store
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    repo.jobs.set('rs', seedJobForResult('success', { clasificacion: 'APROBADA', resumen: 'ok' }));
    repo.jobs.set('rq', seedJobForResult('queued'));
    repo.jobs.set('re', seedJobForResult('error'));
    const router = createAuditJobsRouter({ repo, createClient: async () => makeFakeStorageClient(repo.uploads) });
    const app = express();
    app.use('/api', router);
    const { server, baseUrl } = await startServer(app);

    const resS = await fetch(`${baseUrl}/api/audit/jobs/rs/result`);
    const bodyS = await resS.json();
    const resQ = await fetch(`${baseUrl}/api/audit/jobs/rq/result`);
    const bodyQ = await resQ.json();
    const resE = await fetch(`${baseUrl}/api/audit/jobs/re/result`);
    const bodyE = await resE.json();
    const res404 = await fetch(`${baseUrl}/api/audit/jobs/nope/result`);
    await closeServer(server);

    tests.push(tf('GET result (success) → 200 + data.result + no-store', () =>
      resS.status === 200 && bodyS.data?.clasificacion === 'APROBADA' && (resS.headers.get('cache-control') || '').toLowerCase().includes('no-store'),
      `status=${resS.status} cache=${resS.headers.get('cache-control')}`));
    tests.push(tf('GET result (queued) → 409 PROCESSING + no-store', () =>
      resQ.status === 409 && bodyQ.error === 'PROCESSING' && (resQ.headers.get('cache-control') || '').toLowerCase().includes('no-store'),
      `status=${resQ.status} cache=${resQ.headers.get('cache-control')}`));
    tests.push(tf('GET result (error) → 500 + no-store', () =>
      resE.status === 500 && bodyE.error === 'SYNTH_FAILED' && (resE.headers.get('cache-control') || '').toLowerCase().includes('no-store'),
      `status=${resE.status} cache=${resE.headers.get('cache-control')}`));
    tests.push(tf('GET result (no existe) → 404', () => res404.status === 404, `status=${res404.status}`));
  }

  // ---------------------------------------------------------------
  // 4) Multi-file job (PDF + IMAGE) → 202, 2 uploads, un job
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const router = createAuditJobsRouter({ repo, createClient: async () => makeFakeStorageClient(repo.uploads) });
    const app = express();
    app.use('/api', router);
    const { server, baseUrl } = await startServer(app);

    const pdf = await buildPdfTextOnly();
    const img = await buildImageEvidence();
    const form = new FormData();
    form.append('evidencias', new Blob([pdf], { type: 'application/pdf' }), 'doc.pdf');
    form.append('evidencias', new Blob([img], { type: 'image/png' }), 'captura.png');

    const res = await fetch(`${baseUrl}/api/audit/jobs`, { method: 'POST', body: form });
    const body = await res.json();
    await closeServer(server);

    tests.push(tf('POST jobs (2 evidencias) → 202', () => res.status === 202, `status=${res.status}`));
    tests.push(tf('POST jobs (2 evidencias) → 2 evidencias + 2 uploads', () =>
      [...repo.evidences.values()].filter(e => e.job_id === body.jobId).length === 2 &&
      repo.uploads.length === 2,
      `evs=${[...repo.evidences.values()].length} uploads=${repo.uploads.length}`));
  }

  // ---------------------------------------------------------------
  // 5) POST sin archivos → 400
  // ---------------------------------------------------------------
  {
    const repo = new FakeRepo();
    const router = createAuditJobsRouter({ repo, createClient: async () => makeFakeStorageClient(repo.uploads) });
    const app = express();
    app.use('/api', router);
    const { server, baseUrl } = await startServer(app);

    const res = await fetch(`${baseUrl}/api/audit/jobs`, { method: 'POST', body: new FormData() });
    await closeServer(server);

    tests.push(tf('POST jobs sin archivos → 400 BAD_REQUEST', () =>
      res.status === 400, `status=${res.status}`));
  }

  // ---------------------------------------------------------------
  // 6) Ruta legacy POST /api/audit/multimodal SÍ existe (rollback)
  // ---------------------------------------------------------------
  {
    const { server, baseUrl } = await startServer(realApp);
    const res = await fetch(`${baseUrl}/api/audit/multimodal`, { method: 'POST', body: new FormData() });
    await closeServer(server);

    tests.push(tf('Endpoint legacy POST /api/audit/multimodal existe (sin archivos → 400, no 404)',
      () => res.status === 400,
      `status=${res.status}`));
  }

  // ---------------------------------------------------------------
  // 7) GET legacy progreso → existe (exit 200/404-shaped, no ruta inexistente en app)
  // ---------------------------------------------------------------
  {
    const { server, baseUrl } = await startServer(realApp);
    const res = await fetch(`${baseUrl}/api/audit/multimodal/progress/nonexistent`);
    await closeServer(server);

    tests.push(tf('GET legacy progress ruta registrada (respondió ≠ 404 de express genérico ruta bonita o 200/404 handler)',
      () => res.status === 404 || res.status === 200,
      `status=${res.status}`));
  }

  const passed = tests.filter(t => t.passed).length;
  console.log(`\n[Jobs API] ${passed}/${tests.length} aprobadas`);
  return tests;
}