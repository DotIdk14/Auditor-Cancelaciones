import './env.js';
import { FakeRepo } from './fake-repo.js';
import { buildImageEvidence } from './pdf-fixtures.js';
import { runJobProcessing } from '../../src/lib/jobs/audit-worker.js';

/**
 * Prueba real de renovación de heartbeat durante un job MOCK de ~30s.
 * Requisito: heartbeat_at debe renovarse DURANTE el procesamiento (no solo al claim).
 * Intervalo de heartbeat = 3000ms → ~10 renovaciones en 30s.
 */
async function main() {
  const repo = new FakeRepo();
  const job = repo.seedJob({ id: 'hb-30s', attempts: 0, max_attempts: 5 });
  repo.seedEvidence(job.id, { id: 'ev_hb', type: 'IMAGE', filename: 'slow.png', mime_type: 'image/png', storage_key: 'slow.png' });
  const png = await buildImageEvidence();

  const slowVision = async () => {
    await new Promise(r => setTimeout(r, 30000));
    return { result: { hechos: [{ tipo: 'v', valor: 'ok', confianza: 'ALTA' }], visual_facts: { c: { campo: 'm', valor: 'ok', confianza: 'ALTA' } } }};
  };

  const { job: claimed } = await repo.claimNextJob('hb-worker');
  if (!claimed) throw new Error('sin job');

  const t0 = Date.now();
  await runJobProcessing(claimed, await repo.getJobEvidences(claimed.id), {
    repo,
    extractImageWithVision: slowVision as any,
    readBuffer: async () => png,
    heartbeatMs: 3000,
    synthesize: async () => ({ clasificacion: 'APROBADA' }),
  });
  const elapsedMs = Date.now() - t0;

  const beats = repo.heartbeatTimestamps.filter(b => b.jobId === 'hb-30s');
  console.log(`\n[Heartbeat 30s] duración del job mock: ${elapsedMs}ms`);
  console.log(`[Heartbeat 30s] renovaciones de heartbeat (intervalo 3s): ${beats.length}`);
  const times = beats.map(b => new Date(b.at).getTime());
  const deltas = times.slice(1).map((t, i) => t - times[i]);
  console.log('[Heartbeat 30s] deltas entre heartbeats (ms):', deltas.join(', '));
  const freshAtEnd = beats.length > 0 ? new Date(beats[beats.length - 1].at).getTime() : 0;
  const lastBeatDeltaFromEnd = freshAtEnd ? Date.now() - freshAtEnd : Number.POSITIVE_INFINITY;
  console.log(`[Heartbeat 30s] último heartbeat hace ${lastBeatDeltaFromEnd}ms (debe ser < 3000 = renovado durante el job)`);
  console.log(`[Heartbeat 30s] heartbeat_at del job: ${repo.jobs.get('hb-30s')?.heartbeat_at}`);
  console.log(`[Heartbeat 30s] job status: ${repo.jobs.get('hb-30s')?.status}`);

  const ok = beats.length >= 8 && deltas.every(d => d >= 1500 && d <= 12000) && lastBeatDeltaFromEnd < 3000;
  console.log(`[Heartbeat 30s] ${ok ? 'PASÓ ✓' : 'FALLÓ ✗'}`);
  process.exitCode = ok ? 0 : 1;
}
void main();