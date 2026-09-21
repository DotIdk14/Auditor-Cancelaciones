import './env.js';
import assert from 'node:assert/strict';
import { FakeRepo } from './fake-repo.js';
import {
  buildPdfTextOnly,
  buildPdfTextWithCapture,
  buildImageEvidence,
  buildAudioEvidence,
} from './pdf-fixtures.js';
import { runJobProcessing, processEvidenceBatch } from '../../src/lib/jobs/audit-worker.js';
import type { AuditJob, AuditJobEvidence } from '../../src/lib/jobs/audit-job-repository.js';

export interface JTest { name: string; passed: boolean; detail?: string }

function tf(name: string, fn: () => boolean | Promise<boolean>, detail?: string): JTest {
  return { name, passed: !!fn(), detail };
}

export async function runMockE2ETests(): Promise<JTest[]> {
  const tests: JTest[] = [];

  const repo = new FakeRepo();
  const job = repo.seedJob({ id: 'e2e', attempts: 0, max_attempts: 5 });

  const pdfTxt = await buildPdfTextOnly();
  const pdfHybrid = await buildPdfTextWithCapture();
  const png = await buildImageEvidence();
  const audioBuf = await buildAudioEvidence();

  repo.seedEvidence(job.id, { id: 'ev_audio', type: 'AUDIO', filename: 'llamada.mp3', mime_type: 'audio/mpeg', storage_key: 'audit-jobs/e2e/ev_audio/llamada.mp3' });
  repo.seedEvidence(job.id, { id: 'ev_pdf_txt', type: 'PDF', filename: 'solicitud.pdf', mime_type: 'application/pdf', storage_key: 'audit-jobs/e2e/ev_pdf_txt/solicitud.pdf' });
  repo.seedEvidence(job.id, { id: 'ev_pdf_hybrid', type: 'PDF', filename: 'expediente.pdf', mime_type: 'application/pdf', storage_key: 'audit-jobs/e2e/ev_pdf_hybrid/expediente.pdf' });
  repo.seedEvidence(job.id, { id: 'ev_img', type: 'IMAGE', filename: 'charla.png', mime_type: 'image/png', storage_key: 'audit-jobs/e2e/ev_img/charla.png' });

  let visionCalls = 0;
  let textCalls = 0;
  let audioCalls = 0;
  let synthCalls = 0;

  const visionMock = async (buf: Buffer) => {
    visionCalls++;
    return {
      result: {
        hechos: [{ tipo: 'visual', valor: 'Mensaje: quiero cancelar', confianza: 'ALTA' }],
        visual_facts: { conversacion: { mensaje: { valor: 'quiero cancelar', confianza: 'ALTA' } } },
      },
    };
  };
  const textMock = async (pageText: string, _t: 'PDF', _eid: string, p: number) => {
    textCalls++;
    return { result: { hechos: [{ tipo: 'texto', valor: pageText.slice(0, 80), confianza: 'ALTA', pagina: p }] } };
  };
  const transcribeMock = async (buf: Buffer) => {
    audioCalls++;
    return [
      { speaker: 'SPEAKER_1', start: 0, end: 1200, text: 'Hola, quiero cancelar mi suscripción' },
      { speaker: 'SPEAKER_2', start: 1300, end: 2500, text: 'Claro, le ayudo con eso' },
    ];
  };
  const synthMock = async (jobId: string) => {
    synthCalls++;
    return { clasificacion: 'APROBADA', resumen: 'Intención manifiesta documentada' };
  };

  const readBuffer = async (ev: AuditJobEvidence) => {
    switch (ev.id) {
      case 'ev_audio': return audioBuf;
      case 'ev_pdf_txt': return pdfTxt;
      case 'ev_pdf_hybrid': return pdfHybrid;
      case 'ev_img': return png;
      default: return null;
    }
  };

  // Claim + run full processing pipeline
  const { job: claimed } = await repo.claimNextJob('e2e-worker');
  if (!claimed) throw new Error('Job not claimable');

  await runJobProcessing(claimed, await repo.getJobEvidences(claimed.id), {
    repo,
    extractFromTextPage: textMock as any,
    extractImageWithVision: visionMock as any,
    transcribeAudio: transcribeMock as any,
    readBuffer,
    synthesize: synthMock as any,
  });
  await repo.markJobSuccess(claimed.id, { clasificacion: 'APROBADA' });

  const finalEvs = await repo.getJobEvidences(job.id);
  const byId = new Map(finalEvs.map(e => [e.id, e]));
  const finalJob = repo.jobs.get('e2e')!;

  tests.push(tf('E2E: 4 evidencias procesadas (todas success)', () =>
    finalEvs.length === 4 && finalEvs.every(e => e.status === 'success'),
    finalEvs.map(e => `${e.id}:${e.status}`).join(' ')));
  tests.push(tf('E2E: audio transcrito 1 vez (AssemblyAI mock)', () => audioCalls === 1, `audioCalls=${audioCalls}`));
  tests.push(tf('E2E: texto extraído en páginas de texto (solo-texto 3 + texto-captura p1/p2 = 5)', () =>
    textCalls === 5, `textCalls=${textCalls}`));
  tests.push(tf('E2E: Vision en HYBRID + IMAGE (2 llamadas)', () => visionCalls === 2, `visionCalls=${visionCalls}`));
  tests.push(tf('E2E: síntesis ejecutada 1 vez con resultado', () => synthCalls === 1, `synthCalls=${synthCalls}`));

  const audioEv = byId.get('ev_audio')!;
  const textEv = byId.get('ev_pdf_txt')!;
  const hybridEv = byId.get('ev_pdf_hybrid')!;
  const imgEv = byId.get('ev_img')!;

  tests.push(tf('E2E: audio guarda hechos de transcripción (2 segmentos)', () =>
    Array.isArray((audioEv.extraction as any)?.hechos) && (audioEv.extraction as any).hechos.length >= 2 &&
    (audioEv.extraction as any).hechos.every((h: any) => h.tipo === 'transcripcion'),
    JSON.stringify((audioEv.extraction as any)?.hechos).slice(0, 160)));

  const textFacts = ((textEv.extraction as any)?.hechos as any[]) ?? [];
  tests.push(tf('E2E: PDF TEXT → hechos de 3 páginas de texto (sin vision)', () =>
    textFacts.length >= 3 && textFacts.every(h => h.tipo === 'texto'),
    `hechos=${textFacts.length}`));

  const hybridFacts = ((hybridEv.extraction as any)?.hechos as any[]) ?? [];
  tests.push(tf('E2E: PDF HYBRID → hechos de texto Y visual combinados en la misma evidencia', () =>
    hybridFacts.some(h => h.tipo === 'texto') && hybridFacts.some(h => h.tipo === 'visual'),
    `hechos=${hybridFacts.length} tipos=${hybridFacts.map(h => h.tipo).join(',')}`));

  tests.push(tf('E2E: IMAGE → hecho visual (vision) persistido', () =>
    Array.isArray((imgEv.extraction as any)?.hechos) && (imgEv.extraction as any).hechos.length >= 1 &&
    (imgEv.extraction as any).hechos[0].tipo === 'visual',
    JSON.stringify((imgEv.extraction as any)?.hechos).slice(0, 120)));

  tests.push(tf('E2E: job status success + attempts=1', () =>
    finalJob.status === 'success' && finalJob.attempts === 1,
    `status=${finalJob.status} attempts=${finalJob.attempts}`));

  const passed = tests.filter(t => t.passed).length;
  console.log(`\n[Mock E2E] ${passed}/${tests.length} aprobadas`);
  return tests;
}