import { auditJobRepository, DEFAULT_MAX_ATTEMPTS } from './audit-job-repository.js';
import type { AuditJob, AuditJobEvidence } from './audit-job-repository.js';
import { getOpenRouterClient } from '../ai/client.js';
import { getAiModels } from '../ai/models.js';
import {
  extractPdfPages,
  analyzePdfPageVisualContent,
  renderPdfPageToImage,
  classifyPdfPage,
  evaluatePdfTextQuality,
} from '../extraction/pdf-extractor.js';
import type { PdfPageVisualAnalysis } from '../extraction/pdf-extractor.js';

// Configuración por defecto (512MB / shared CPU)
const DEFAULT_CONCURRENCY = 1;

const AUDIT_WORKER_CONCURRENCY = Number(process.env.AUDIT_WORKER_CONCURRENCY || DEFAULT_CONCURRENCY);
const AUDIT_EVIDENCE_CONCURRENCY = Number(process.env.AUDIT_EVIDENCE_CONCURRENCY || 2);
const ASSEMBLYAI_TIMEOUT_MS = Number(process.env.ASSEMBLYAI_TIMEOUT_MS || 300000); // 5 min
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 300000); // 5 min
const HEARTBEAT_MS = Number(process.env.AUDIT_WORKER_HEARTBEAT_MS || 15000); // renovar heartbeat cada 15s
const STALE_TIMEOUT_MS = Number(process.env.AUDIT_JOB_STALE_MS || 300000); // 5 min sin heartbeat => stale

export interface ProcessedEvidence {
  evidenceId: string;
  type: 'PDF' | 'IMAGE' | 'AUDIO';
  filename: string;
  mimeType: string;
  sha256: string;
  storageKey: string;
  units: EvidenceUnit[];
  extraction: unknown;
}

export interface EvidenceUnit {
  unitId: string;
  page?: number;
  startSeconds?: number;
  endSeconds?: number;
  text?: string;
  visualDescription?: string | VisualDescriptionPart[];
  facts?: any[];
  metadata?: Record<string, unknown>;
}

/** Fragmento textual/estructurado de contenido visual (nunca se guardan imágenes). */
export interface VisualDescriptionPart {
  campo?: unknown;
  valor?: unknown;
  confianza?: unknown;
  page?: number;
  [key: string]: unknown;
}

function extractVisualDescription(visualFacts: unknown, pageNum?: number): VisualDescriptionPart[] | undefined {
  if (!visualFacts || typeof visualFacts !== 'object') return undefined;
  const parts: VisualDescriptionPart[] = [];
  for (const category of Object.values(visualFacts)) {
    if (!category || typeof category !== 'object') continue;
    for (const item of Object.values(category)) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      if (rec.valor) {
        parts.push({ ...rec, page: (pageNum ?? rec.page) as number | undefined });
      }
    }
  }
  return parts.length > 0 ? parts : undefined;
}

// ============================================================================
// Dependencias inyectables para pruebas (procesadores mockeables)
// ============================================================================
export type TextExtractionFn = (
  pageText: string,
  type: 'PDF',
  evidenceId: string,
  pageNum: number,
) => Promise<{ result: any } | null>;

export type VisionExtractionFn = (
  buffer: Buffer,
  mimeType: string,
  evidenceId: string,
  filename: string,
) => Promise<{ result: any } | null>;

export type SynthesisFn = (jobId: string, deps?: WorkerDeps) => Promise<unknown>;

export interface AudioSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export interface WorkerDeps {
  repo?: typeof auditJobRepository;
  extractFromTextPage?: TextExtractionFn;
  extractImageWithVision?: VisionExtractionFn;
  transcribeAudio?: (buffer: Buffer) => Promise<AudioSegment[]>;
  readBuffer?: (evidence: AuditJobEvidence) => Promise<Buffer | null>;
  synthesize?: SynthesisFn;
  heartbeatMs?: number;
}

// ============================================================================
// Lectura de evidencias desde Storage (independiente de la request original)
// ============================================================================
export async function readEvidenceBuffer(evidence: AuditJobEvidence): Promise<Buffer | null> {
  try {
    const { createClient } = await import('@insforge/sdk');
    const client = createClient({
      baseUrl: process.env.INSFORGE_URL || '',
      anonKey: process.env.INSFORGE_ANON_KEY || '',
    });

    const { data, error } = await client.storage
      .from('dictamen-evidencias')
      .download(evidence.storage_key);

    if (error) {
      console.error(`[worker] Error downloading evidence ${evidence.id}:`, error);
      return null;
    }
    if (!data) return null;

    const chunks: Buffer[] = [];
    for await (const chunk of (data as unknown as AsyncIterable<Uint8Array>)) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (err) {
    console.error(`[worker] Error reading evidence ${evidence.id}:`, err);
    return null;
  }
}

// ============================================================================
// AUDIO
// ============================================================================
async function transcribeAudioWithTimeout(buffer: Buffer): Promise<AudioSegment[]> {
  const { AssemblyAI } = await import('assemblyai');
  const assemblyai = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY,
  });

  // API sync (v4+): sin speaker labels; timeout via SyncTranscribeOptions.
  const transcript = await assemblyai.sync.transcribe(buffer, {
    language_codes: ['es'],
    timestamps: true,
  }, { timeout: ASSEMBLYAI_TIMEOUT_MS });

  // Agrupar palabras por frases con timestamps reales (start/end en ms)
  const words = transcript.words || [];
  if (words.length > 0) {
    const segments: Array<{ speaker: string; start: number; end: number; text: string }> = [];
    let chunk: typeof words = [];
    for (const word of words) {
      chunk.push(word);
      if (chunk.length >= 8) {
        const text = chunk.map(w => w.text).join(' ').trim();
        if (text) {
          segments.push({
            speaker: 'SPEAKER_UNKNOWN',
            start: chunk[0].start ?? 0,
            end: chunk[chunk.length - 1].end ?? chunk[0].start ?? 0,
            text,
          });
        }
        chunk = [];
      }
    }
    const remainder = chunk.map(w => w.text).join(' ').trim();
    if (remainder) {
      segments.push({
        speaker: 'SPEAKER_UNKNOWN',
        start: chunk[0].start ?? 0,
        end: chunk[chunk.length - 1].end ?? chunk[0].start ?? 0,
        text: remainder,
      });
    }
    return segments;
  }

  if (!transcript.text) throw new Error('No se obtuvo transcripción');
  return [{ speaker: 'SPEAKER_UNKNOWN', start: 0, end: 0, text: transcript.text }];
}

async function processAudioEvidence(
  buffer: Buffer,
  evidence: AuditJobEvidence,
  deps: WorkerDeps = {},
): Promise<ProcessedEvidence> {
  const evidenceId = evidence.id;
  const filename = evidence.filename;
  const sha256 = evidence.sha256;
  const repo = deps.repo ?? auditJobRepository;
  const transcribe = deps.transcribeAudio ?? transcribeAudioWithTimeout;

  let segments: AudioSegment[];
  try {
    segments = await transcribe(buffer);
  } catch (error) {
    console.error(`[worker] Audio transcription failed for ${evidenceId}:`, error);
    await repo.updateEvidenceStatus(evidenceId, 'error');
    throw error;
  }

  const units: EvidenceUnit[] = segments.map((seg, idx) => ({
    unitId: `${evidenceId}_audio_${idx}`,
    startSeconds: seg.start,
    endSeconds: seg.end,
    text: seg.text,
    speaker: seg.speaker,
    metadata: { evidenceId },
  }));

  return { evidenceId, type: 'AUDIO', filename, mimeType: evidence.mime_type, sha256, storageKey: evidence.storage_key, units, extraction: {
    tipo_evidencia: 'AUDIO',
    hechos: segments.map(seg => ({
      tipo: 'transcripcion',
      valor: seg.text,
      confianza: 'ALTA',
      evidenciaId: evidenceId,
      pagina: null,
      timestamp: `${seg.start}s-${seg.end}s`,
      texto_citado: seg.text,
    })),
  } };
}

// ============================================================================
// PDF — clasificación REAL por página: TEXT / VISUAL / HYBRID
// ============================================================================
export async function processPdfEvidence(
  buffer: Buffer,
  evidence: AuditJobEvidence,
  deps: WorkerDeps = {},
): Promise<ProcessedEvidence> {
  const evidenceId = evidence.id;
  const filename = evidence.filename;
  const sha256 = evidence.sha256;
  const textExtract = deps.extractFromTextPage ?? extractFromTextPage;
  const vision = deps.extractImageWithVision ?? extractImageWithVision;

  // Texto real por página (granularidad real de pdfjs-dist, no split por caracteres)
  const pageTexts = await extractPdfPages(buffer);

  const units: EvidenceUnit[] = [];
  const allFacts: any[] = [];

  for (const page of pageTexts) {
    const pageNum = page.page;
    const pageText = page.text;

    const quality = evaluatePdfTextQuality(pageText, 1);
    const visual: PdfPageVisualAnalysis = await analyzePdfPageVisualContent(buffer, pageNum);

    const classification = classifyPdfPage({
      hasUsefulText: quality.hasUsefulText,
      hasRelevantVisualContent: visual.hasRelevantVisualContent,
    });

    switch (classification) {
      case 'HYBRID': {
        // texto útil Y contenido visual relevante: extraer ambos y combinarlos
        console.log(`[worker] PDF ${filename} page ${pageNum} -> HYBRID (${visual.reason})`);
        const [textExtraction, visionExtraction] = await Promise.all([
          textExtract(pageText, 'PDF', evidenceId, pageNum),
          renderPdfPageToImage(buffer, pageNum)
            .then(img => vision(img, 'image/png', evidenceId, `PDF page ${pageNum}`))
            .catch(err => {
              console.error(`[worker] Vision failed for PDF page ${pageNum}:`, err);
              return null;
            }),
        ]);

        const textFacts = (textExtraction?.result?.hechos || []) as any[];
        const visionFacts = (visionExtraction?.result?.hechos || []) as any[];
        // Deduplicación conservadora por tipo+valor; sin eliminar info dudosa
        const mergedFacts = [...textFacts, ...visionFacts].filter(
          (f, i, arr) => arr.findIndex(fi => fi.tipo === f.tipo && (fi.valor ?? '') === (f.valor ?? '')) === i,
        );

        const visualDescription = extractVisualDescription(visionExtraction?.result?.visual_facts, pageNum);

        units.push({
          unitId: `${evidenceId}_pdf_page_${pageNum}_hybrid`,
          page: pageNum,
          text: pageText,
          visualDescription,
          facts: mergedFacts,
          metadata: { evidenceId, pageQuality: 'hybrid', visualReason: visual.reason },
        });
        allFacts.push(...mergedFacts);
        break;
      }
      case 'TEXT': {
        // texto útil sin visual relevante: solo extracción estructurada, sin Vision
        const extraction = await textExtract(pageText, 'PDF', evidenceId, pageNum);
        if (extraction?.result) {
          units.push({
            unitId: `${evidenceId}_pdf_page_${pageNum}_text`,
            page: pageNum,
            text: pageText,
            facts: extraction.result.hechos || [],
            metadata: { evidenceId, pageQuality: 'text' },
          });
          allFacts.push(...(extraction.result.hechos || []));
        }
        break;
      }
      case 'VISUAL': {
        // sin texto útil con contenido visual relevante (scan / captura sin OCR)
        console.log(`[worker] PDF ${filename} page ${pageNum} -> VISUAL (${visual.reason})`);
        try {
          const pageImage = await renderPdfPageToImage(buffer, pageNum);
          const visionExtraction = await vision(pageImage, 'image/png', evidenceId, `PDF page ${pageNum}`);
          if (visionExtraction?.result) {
            units.push({
              unitId: `${evidenceId}_pdf_page_${pageNum}_vision`,
              page: pageNum,
              visualDescription: extractVisualDescription(visionExtraction.result.visual_facts, pageNum),
              facts: visionExtraction.result.hechos || [],
              metadata: { evidenceId, pageQuality: 'vision', visualReason: visual.reason },
            });
            allFacts.push(...(visionExtraction.result.hechos || []));
          }
        } catch (error) {
          console.error(`[worker] Vision failed for PDF page ${pageNum}:`, error);
        }
        break;
      }
      case 'EMPTY':
      default:
        // Página sin señales aprovechables: no se agregan unidades ni se llama a Vision
        console.log(`[worker] PDF ${filename} page ${pageNum} -> EMPTY`);
        break;
    }
  }

  const extraction = {
    tipo_evidencia: 'PDF',
    hechos: allFacts.length > 0 ? allFacts : undefined,
    visual_facts: undefined,
  };

  return { evidenceId, type: 'PDF', filename, mimeType: evidence.mime_type, sha256, storageKey: evidence.storage_key, units, extraction };
}

// ============================================================================
// IMAGE
// ============================================================================
export async function processImageEvidence(
  buffer: Buffer,
  evidence: AuditJobEvidence,
  deps: WorkerDeps = {},
): Promise<ProcessedEvidence> {
  const evidenceId = evidence.id;
  const filename = evidence.filename;
  const sha256 = evidence.sha256;
  const vision = deps.extractImageWithVision ?? extractImageWithVision;

  const extraction = await vision(buffer, evidence.mime_type, evidenceId, filename);

  const units: EvidenceUnit[] = [];
  if (extraction?.result) {
    units.push({
      unitId: `${evidenceId}_image_1`,
      visualDescription: extraction.result.visual_facts
        ? JSON.stringify(extraction.result.visual_facts)
        : undefined,
      facts: extraction.result.hechos || [],
      metadata: { evidenceId },
    });
  } else {
    units.push({
      unitId: `${evidenceId}_image_1`,
      visualDescription: 'Imagen procesada por modelo de visión',
      facts: [],
      metadata: { evidenceId },
    });
  }

  return {
    evidenceId,
    type: 'IMAGE',
    filename,
    mimeType: evidence.mime_type,
    sha256,
    storageKey: evidence.storage_key,
    units,
    extraction: { tipo_evidencia: 'IMAGE', hechos: extraction?.result?.hechos, visual_facts: extraction?.result?.visual_facts },
  };
}

// ============================================================================
// Procesadores IA (OpenRouter)
// ============================================================================
export async function extractFromTextPage(
  pageText: string,
  type: 'PDF',
  evidenceId: string,
  pageNum: number,
): Promise<{ result: any } | null> {
  if (!pageText || pageText.trim().length < 20) {
    return null;
  }

  const client = getOpenRouterClient();
  const models = getAiModels();

  try {
    const response = await client.chat.completions.create({
      model: models.vision,
      messages: [
        {
          role: 'system',
          content: 'Eres un modelo de extracción de información. Extrae hechos estructurados del texto proporcionado. Devuelve un JSON con un campo "hechos" que es un array de objetos con tipo, valor y confianza.',
        },
        {
          role: 'user',
          content: `Extrae hechos del siguiente texto de la página ${pageNum}:\n\n${pageText}\n\nDevuelve solo un objeto JSON con la estructura: {"hechos": [{"tipo": "...", "valor": "...", "confianza": "ALTA|MEDIA|BAJA"}]}`,
        },
      ],
      temperature: 0,
      max_tokens: 2000,
    });

    const rawContent = response.choices[0]?.message?.content || '';
    return { result: JSON.parse(rawContent) };
  } catch (error) {
    console.error(`[worker] Text extraction failed for PDF page ${pageNum}:`, error);
    return null;
  }
}

export async function extractImageWithVision(
  buffer: Buffer,
  mimeType: string,
  evidenceId: string,
  filename: string,
): Promise<{ result: any } | null> {
  const client = getOpenRouterClient();
  const models = getAiModels();

  if (buffer.length > 2 * 1024 * 1024) {
    console.warn(`[worker] Image ${filename} is ${(buffer.length / 1024 / 1024).toFixed(1)}MB, considering resize`);
  }

  try {
    const response = await client.chat.completions.create({
      model: models.vision,
      messages: [
        {
          role: 'system',
          content: 'Eres un modelo de visión por computadora. Analiza la imagen y extrae información estructurada. Devuelve un JSON con: "visual_description" (descripción del contenido visual), "hechos" (array de hechos extraídos con tipo, valor y confianza), y "visual_facts" con la información visual clave.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analiza esta imagen ${filename} y extrae la información relevante. ` },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}` } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 3000,
    });

    const rawContent = response.choices[0]?.message?.content || '';
    return { result: JSON.parse(rawContent) };
  } catch (error) {
    console.error(`[worker] Vision failed for ${filename}:`, error);
    return null;
  }
}

// ============================================================================
// Síntesis (reintentable: no reprocesa evidencias ya exitosas)
// ============================================================================
export async function synthesizeAuditResult(jobId: string, deps: WorkerDeps = {}): Promise<unknown> {
  const repo = deps.repo ?? auditJobRepository;

  // Evidencias FRESCAS con su extracción persistida (no el snapshot pre-procesamiento)
  const evidences = await repo.getJobEvidences(jobId);

  const allFacts: any[] = [];
  const evidenceSummaries: any[] = [];

  for (const ev of evidences) {
    const extraction = ev.extraction as any;
    if (extraction?.hechos) allFacts.push(...extraction.hechos);
    evidenceSummaries.push({ evidenceId: ev.id, filename: ev.filename, type: ev.type, status: ev.status });
  }

  const evidenceDescriptions = evidenceSummaries
    .map((ev, idx) => `EVIDENCIA ev${idx + 1}\nFuente: ${ev.filename}\nTipo: ${ev.type}\nEstado: ${ev.status}`)
    .join('\n\n');

  const factsText = allFacts.length > 0
    ? allFacts.map((f, idx) => `Hecho ${idx + 1}: tipo=${f.tipo || 'desconocido'}, valor="${String(f.valor ?? '').substring(0, 200)}", confianza=${f.confianza || 'BAJA'}`).join('\n')
    : 'No se extrajeron hechos';

  const client = getOpenRouterClient();
  const models = getAiModels();

  try {
    const response = await client.chat.completions.create({
      model: models.vision,
      messages: [
        {
          role: 'system',
          content: 'Eres un modelo de síntesis de auditoría. Basado en las evidencias extraídas, genera un resultado de auditoría estructurado. Debes clasificar el caso, identificar la causa raíz, determinar la confianza y listar las acciones previstas. Sé conciso y objetivo.',
        },
        {
          role: 'user',
          content: `SINTESIS DE AUDITORÍA\n\nEvidencias procesadas:\n${evidenceDescriptions}\n\nHechos extraídos:\n${factsText}\n\nGenera un resultado de auditoría en formato JSON con los campos: clasificacion, causaRaiz, confianza, dictamen, accionesPrevistas, hardBlockers, incidencias.`,
        },
      ],
      temperature: 0,
      max_tokens: 4000,
    });

    const rawContent = response.choices[0]?.message?.content || '';
    const synthesizedResult = JSON.parse(rawContent);

    await repo.updateJobResult(jobId, synthesizedResult);
    console.log(`[worker] Resultado sintetizado para job ${jobId}`);
    return synthesizedResult;
  } catch (error) {
    console.error(`[worker] Síntesis fallida para job ${jobId}:`, error);
    // Persistir el fallo para diagnóstico y relanzar para permitir retry del job
    await repo.updateJobProgress(jobId, 90, 'error_synthesis', 'Error en síntesis final');
    throw error;
  }
}

// ============================================================================
// Procesamiento de un lote de evidencias con concurrencia LIMITADA Y real
// ============================================================================
export async function processEvidenceBatch(
  evidences: AuditJobEvidence[],
  workerId: string,
  deps: WorkerDeps = {},
): Promise<ProcessedEvidence[]> {
  const repo = deps.repo ?? auditJobRepository;
  const concurrency = Math.max(1, Math.min(AUDIT_EVIDENCE_CONCURRENCY, evidences.length));
  const results: ProcessedEvidence[] = [];
  let cursor = 0;

  async function workerTask(): Promise<void> {
    while (cursor < evidences.length) {
      const idx = cursor++;
      const evidence = evidences[idx];
      try {
        // Evidencia ya exitosa con extracción persistida => NO reprocesar
        if (evidence.status === 'success' && evidence.extraction) {
          results[idx] = { evidenceId: evidence.id, type: evidence.type, filename: evidence.filename, mimeType: evidence.mime_type, sha256: evidence.sha256, storageKey: evidence.storage_key, units: [], extraction: evidence.extraction };
          continue;
        }

        await repo.updateEvidenceStatus(evidence.id, 'processing');
        const readBuffer = deps.readBuffer ?? readEvidenceBuffer;
        const buffer = await readBuffer(evidence);
        if (!buffer) throw new Error(`No se pudo leer la evidencia ${evidence.id} desde storage`);

        let result: ProcessedEvidence;
        switch (evidence.type) {
          case 'AUDIO': result = await processAudioEvidence(buffer, evidence, deps); break;
          case 'PDF': result = await processPdfEvidence(buffer, evidence, deps); break;
          case 'IMAGE': result = await processImageEvidence(buffer, evidence, deps); break;
          default: throw new Error(`Tipo de evidencia desconocido: ${evidence.type}`);
        }

        await repo.updateEvidenceStatus(evidence.id, 'success', result.extraction);
        results[idx] = result;

        const progress = 10 + Math.round(((idx + 1) / evidences.length) * 80);
        await repo.updateJobProgress(evidence.job_id, progress, 'processing_evidence');
      } catch (error) {
        console.error(`[worker] Evidence ${evidence.id} failed:`, error);
        await repo.updateEvidenceStatus(evidence.id, 'error');
        throw error;
      }
    }
  }

  // Lanzar N workers de la cola compartida: concurrencia real limitada
  const workers = Array.from({ length: concurrency }, () => workerTask());
  await Promise.all(workers);
  return results.filter((r): r is ProcessedEvidence => Boolean(r));
}

// ============================================================================
// Procesamiento completo de un job ya reclamado (testeable con repo fake)
// ============================================================================
export interface JobProcessingResult {
  outcome: 'success' | 'requeue';
  processedCount: number;
}

export async function runJobProcessing(
  job: AuditJob,
  evidences: AuditJobEvidence[],
  deps: WorkerDeps = {},
): Promise<JobProcessingResult> {
  const repo = deps.repo ?? auditJobRepository;
  const workerId = `worker_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const heartbeatMs = deps.heartbeatMs ?? HEARTBEAT_MS;

  if (job.attempts > (job.max_attempts || DEFAULT_MAX_ATTEMPTS)) {
    // intento fuera de límite: no procesar, derivar a error
    throw new Error(`Job ${job.id} superó el límite de intentos (${job.max_attempts})`);
  }

  const heartbeatTimer = setInterval(() => {
    void repo.updateJobHeartbeat(job.id).catch(() => {});
  }, heartbeatMs);
  heartbeatTimer.unref?.();

  try {
    await repo.updateJobProgress(job.id, 5, 'claiming');

    if (evidences.length === 0) {
      await repo.markJobSuccess(job.id, {});
      console.log(`[worker] Job ${job.id} completado sin evidencias`);
      return { outcome: 'success', processedCount: 0 };
    }

    await repo.updateJobProgress(job.id, 10, 'processing_evidence');
    await processEvidenceBatch(evidences, workerId, deps);

    await repo.updateJobProgress(job.id, 90, 'synthesizing');
    const synthesize = deps.synthesize ?? synthesizeAuditResult;
    await synthesize(job.id, deps);

    await repo.markJobSuccess(job.id, undefined, 'Auditoría completada');
    return { outcome: 'success', processedCount: evidences.length };
  } finally {
    clearInterval(heartbeatTimer);
  }
}

// ============================================================================
// Ciclo del worker
// ============================================================================
export interface WorkerCycleResult {
  processedJobs: number;
  failedJobs: number;
  requeuedJobs: number;
}

export async function runOneCycle(deps: WorkerDeps = {}): Promise<WorkerCycleResult> {
  return auditWorker(1, 0, deps);
}

export async function auditWorker(
  maxIterations: number = -1,
  iteration: number = 0,
  deps: WorkerDeps = {},
): Promise<WorkerCycleResult> {
  const repo = deps.repo ?? auditJobRepository;

  if (maxIterations > 0 && iteration >= maxIterations) {
    return { processedJobs: 0, failedJobs: 0, requeuedJobs: 0 };
  }

  console.log(`[worker] Iniciando iteración ${iteration + 1}...`);

  // Recuperar jobs abandonados (heartbeat vencido) preservando attempts
  try {
    await repo.requeueStaleJobs(STALE_TIMEOUT_MS);
  } catch (err) {
    console.warn('[worker] No se pudo reencolar jobs stale (función no aplicada aún):', err instanceof Error ? err.message : err);
  }

  const { job } = await repo.claimNextJob(`worker_${Date.now()}_${iteration}`);
  if (!job) {
    console.log('[worker] No hay jobs en cola, esperando...');
    return { processedJobs: 0, failedJobs: 0, requeuedJobs: 0 };
  }

  console.log(`[worker] Reclamado job ${job.id}, intento ${job.attempts}/${job.max_attempts}`);

  let processedThisPass = 0;
  let failedThisPass = 0;

  try {
    const evidences = await repo.getJobEvidences(job.id);
    const result = await runJobProcessing(job, evidences, deps);
    processedThisPass = result.outcome === 'success' ? 1 : 0;
    console.log(`[worker] Job ${job.id} procesado: ${result.outcome}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[worker] Job ${job.id} failed:`, message);
    failedThisPass = 1;
    await repo.setJobError(job.id, message, job.max_attempts || DEFAULT_MAX_ATTEMPTS);
  }

  let next: WorkerCycleResult = { processedJobs: 0, failedJobs: 0, requeuedJobs: 0 };
  if (maxIterations < 0 || iteration + 1 < maxIterations) {
    next = await auditWorker(maxIterations, iteration + 1, deps);
  }

  return {
    processedJobs: processedThisPass + next.processedJobs,
    failedJobs: failedThisPass + next.failedJobs,
    requeuedJobs: next.requeuedJobs,
  };
}

// ============================================================================
// Daemon
// ============================================================================
let pollTimer: ReturnType<typeof setInterval> | null = null;
let stopping = false;

function runDaemonCycle(maxJobs: number, deps: WorkerDeps = {}): void {
  if (stopping) return;
  void (async () => {
    try {
      const result = await auditWorker(maxJobs > 0 ? maxJobs : -1, 0, deps);
      if (maxJobs > 0 && result.processedJobs >= maxJobs) {
        console.log('[worker] Límite de jobs alcanzado, deteniendo worker');
        stopWorker();
      }
    } catch (error) {
      console.error('[worker] Error en ciclo principal:', error);
    }
  })();
}

export function startWorker(maxJobs: number = 0, pollInterval: number = 5000, deps: WorkerDeps = {}): void {
  console.log(`[worker] Worker iniciado (concurrency=${AUDIT_WORKER_CONCURRENCY}, evidConcurrency=${AUDIT_EVIDENCE_CONCURRENCY}, poll=${pollInterval}ms, heartbeat=${HEARTBEAT_MS}ms)`);
  stopping = false;
  runDaemonCycle(maxJobs, deps);
  // Intervalo con referencia activa: mantener el proceso vivo mientras haya polling
  pollTimer = setInterval(() => runDaemonCycle(maxJobs, deps), pollInterval);
}

export function stopWorker(): void {
  stopping = true;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log('[worker] Polling detenido (shutdown limpio)');
}

// Export para tests
export const AUDIT_CONSTANTS = { AUDIT_WORKER_CONCURRENCY, AUDIT_EVIDENCE_CONCURRENCY, ASSEMBLYAI_TIMEOUT_MS, OPENROUTER_TIMEOUT_MS, HEARTBEAT_MS };