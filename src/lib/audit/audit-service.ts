import crypto from 'crypto';
import { readFile } from 'fs/promises';
import { getOpenRouterClient, wrapOpenRouterError } from '../ai/client.js';
import { getAiModels } from '../ai/models.js';
import { UsageCollector } from '../ai/usage.js';
import { extractPdfTextLocally, renderPdfPagesToImages } from '../extraction/pdf-extractor.js';
import { transcribeAudio, formatTranscriptSegments } from '../extraction/audio-extractor.js';
import { getPolicyTextForModel } from './policy.js';
import { buildAuditSystemPrompt, buildAuditUserMessage, AUDIT_PROMPT_VERSION } from './prompt.js';
import { validateAuditResult, validateResultIntegrity, shouldRetry } from './validator.js';
import type { AuditResult, AuditEvidenceItem, MultimodalAuditInput } from './types.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_PAGES_PER_PDF = 50;
const OVERSIZED_PAGE_THRESHOLD = 4000;
const MAX_RETRIES = 1;
const MAX_RESPONSE_TOKENS = 8000;
const PREP_CONCURRENCY = 2;

export interface AuditProgress {
  status: 'running' | 'success' | 'error';
  progress: number;
  detail: string;
}

export type AuditProgressCallback = (p: AuditProgress) => void;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readFileBytes(ev: MultimodalAuditInput['files'][0]): Promise<Buffer> {
  if (ev.buffer && ev.buffer.length > 0) return Promise.resolve(Buffer.from(ev.buffer));
  if (ev.path) return readFile(ev.path);
  return Promise.reject(new Error(`Sin contenido para ${ev.nombreArchivo}`));
}

function inferTipo(mimeType: string): 'PDF' | 'IMAGE' | 'AUDIO' {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'IMAGE';
}

function extractJsonContent(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : trimmed;
}

// ---------------------------------------------------------------------------
// Evidence preparation
// ---------------------------------------------------------------------------

interface PreparedEvidence {
  evidenceId: string;
  nombreArchivo: string;
  mimeType: string;
  tipo: 'PDF' | 'IMAGE' | 'AUDIO';
  buffer: Buffer;
  /** For PDFs: extracted text per page */
  textPages?: Array<{ page: number; text: string }>;
  /** For PDFs: rendered image pages (when text is insufficient) */
  imagePages?: Array<{ page: number; data: Buffer; mimeType: string }>;
  /** For images: base64 data URL */
  imageDataUrl?: string;
  /** For audio: transcript text */
  transcript?: string;
  transcriptSegments?: Array<{ speaker: string; start: number; end: number; text: string }>;
  inventory: AuditEvidenceItem;
}

async function preparePdfEvidence(
  ev: MultimodalAuditInput['files'][0]
): Promise<PreparedEvidence> {
  const buffer = await readFileBytes(ev);
  const pdfText = await extractPdfTextLocally(buffer);
  const inventory: AuditEvidenceItem = {
    evidenceId: ev.evidenceId,
    nombreArchivo: ev.nombreArchivo,
    mimeType: ev.mimeType,
    sizeBytes: ev.sizeBytes,
    sha256: sha256(buffer),
    tipo: 'PDF',
    pages: pdfText.pages,
    pagesSent: [],
    processingStatus: 'COMPLETADO',
  };

  const result: PreparedEvidence = {
    evidenceId: ev.evidenceId,
    nombreArchivo: ev.nombreArchivo,
    mimeType: ev.mimeType,
    tipo: 'PDF',
    buffer,
    inventory,
  };

  // If PDF has useful text, extract it per page
  if (pdfText.hasUsefulText) {
    // pdf-parse provides full text; we send it as-is for text-based analysis
    result.textPages = [{ page: 1, text: pdfText.text }];
    inventory.pagesSent = Array.from({ length: pdfText.pages }, (_, i) => i + 1);
    return result;
  }

  // PDF without useful text (scanned/FireShot): render to images
  const pagesToRender = Math.min(pdfText.pages, MAX_PAGES_PER_PDF);
  const rendered = await renderPdfPagesToImages(buffer, pagesToRender);

  const segments: AuditEvidenceItem['segments'] = [];
  const imagePages: PreparedEvidence['imagePages'] = [];

  for (const page of rendered) {
    const isOversized = page.data.length > OVERSIZED_PAGE_THRESHOLD * 100;

    if (isOversized) {
      // Split oversized page into segments (simplified: we send the full page
      // and let the model handle it; real splitting would use sharp/canvas)
      segments.push({ originalPage: page.page, segmentIndex: 0, totalSegments: 1 });
      imagePages.push({ page: page.page, data: page.data, mimeType: page.mimeType });
      inventory.pagesSent.push(page.page);
    } else {
      imagePages.push({ page: page.page, data: page.data, mimeType: page.mimeType });
      inventory.pagesSent.push(page.page);
    }
  }

  if (segments.length > 0) {
    inventory.segments = segments;
  }

  result.imagePages = imagePages;
  inventory.pagesSent = [...new Set(inventory.pagesSent)].sort((a, b) => a - b);
  return result;
}

async function prepareImageEvidence(
  ev: MultimodalAuditInput['files'][0]
): Promise<PreparedEvidence> {
  const buffer = await readFileBytes(ev);
  const inventory: AuditEvidenceItem = {
    evidenceId: ev.evidenceId,
    nombreArchivo: ev.nombreArchivo,
    mimeType: ev.mimeType,
    sizeBytes: ev.sizeBytes,
    sha256: sha256(buffer),
    tipo: 'IMAGE',
    pagesSent: [1],
    processingStatus: 'COMPLETADO',
  };

  return {
    evidenceId: ev.evidenceId,
    nombreArchivo: ev.nombreArchivo,
    mimeType: ev.mimeType,
    tipo: 'IMAGE',
    buffer,
    imageDataUrl: `data:${ev.mimeType};base64,${buffer.toString('base64')}`,
    inventory,
  };
}

async function prepareAudioEvidence(
  ev: MultimodalAuditInput['files'][0]
): Promise<PreparedEvidence> {
  const buffer = await readFileBytes(ev);
  const inventory: AuditEvidenceItem = {
    evidenceId: ev.evidenceId,
    nombreArchivo: ev.nombreArchivo,
    mimeType: ev.mimeType,
    sizeBytes: ev.sizeBytes,
    sha256: sha256(buffer),
    tipo: 'AUDIO',
    pagesSent: [],
    processingStatus: 'COMPLETADO',
  };

  try {
    const segments = await transcribeAudio(buffer);
    const transcript = formatTranscriptSegments(segments);
    inventory.pagesSent = [0]; // Represents the full audio
    return {
      evidenceId: ev.evidenceId,
      nombreArchivo: ev.nombreArchivo,
      mimeType: ev.mimeType,
      tipo: 'AUDIO',
      buffer,
      transcript,
      transcriptSegments: segments,
      inventory,
    };
  } catch (error) {
    inventory.processingStatus = 'ERROR';
    inventory.error = error instanceof Error ? error.message : 'Error de transcripción';
    return {
      evidenceId: ev.evidenceId,
      nombreArchivo: ev.nombreArchivo,
      mimeType: ev.mimeType,
      tipo: 'AUDIO',
      buffer,
      inventory,
    };
  }
}

// ---------------------------------------------------------------------------
// Build multimodal message content
// ---------------------------------------------------------------------------

function buildMultimodalContent(prepared: PreparedEvidence[]): Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
> {
  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];

  for (const ev of prepared) {
    if (ev.inventory.processingStatus === 'ERROR') {
      content.push({
        type: 'text',
        text: `\n--- EVIDENCIA ${ev.evidenceId} (${ev.nombreArchivo}) ---\nESTADO: ERROR - ${ev.inventory.error || 'No procesable'}\n`,
      });
      continue;
    }

    if (ev.tipo === 'PDF' && ev.textPages) {
      // Text-based PDF
      content.push({
        type: 'text',
        text: `\n--- EVIDENCIA ${ev.evidenceId} (${ev.nombreArchivo}) [PDF TEXTO, ${ev.inventory.pages} páginas] ---\n${ev.textPages.map(tp => tp.text).join('\n\n')}\n--- FIN EVIDENCIA ${ev.evidenceId} ---\n`,
      });
    } else if (ev.tipo === 'PDF' && ev.imagePages) {
      // Image-based PDF (FireShot/scanned)
      content.push({
        type: 'text',
        text: `\n--- EVIDENCIA ${ev.evidenceId} (${ev.nombreArchivo}) [PDF IMÁGENES, ${ev.imagePages.length} páginas] ---\n`,
      });
      for (const page of ev.imagePages) {
        content.push({
          type: 'text',
          text: `Página ${page.page}:`,
        });
        content.push({
          type: 'image_url',
          image_url: { url: `data:${page.mimeType};base64,${page.data.toString('base64')}` },
        });
      }
      content.push({
        type: 'text',
        text: `--- FIN EVIDENCIA ${ev.evidenceId} ---\n`,
      });
    } else if (ev.tipo === 'IMAGE' && ev.imageDataUrl) {
      content.push({
        type: 'text',
        text: `\n--- EVIDENCIA ${ev.evidenceId} (${ev.nombreArchivo}) [IMAGEN] ---\n`,
      });
      content.push({
        type: 'image_url',
        image_url: { url: ev.imageDataUrl },
      });
      content.push({
        type: 'text',
        text: `--- FIN EVIDENCIA ${ev.evidenceId} ---\n`,
      });
    } else if (ev.tipo === 'AUDIO' && ev.transcript) {
      content.push({
        type: 'text',
        text: `\n--- EVIDENCIA ${ev.evidenceId} (${ev.nombreArchivo}) [AUDIO TRANSCRIPCIÓN] ---\n${ev.transcript}\n--- FIN EVIDENCIA ${ev.evidenceId} ---\n`,
      });
    }
  }

  return content;
}

function buildEvidenceDescription(prepared: PreparedEvidence[]): string {
  return prepared.map(ev => {
    const status = ev.inventory.processingStatus;
    if (status === 'ERROR') return `${ev.evidenceId}: ${ev.nombreArchivo} — ERROR: ${ev.inventory.error}`;
    const pageInfo = ev.inventory.pages ? `, ${ev.inventory.pages} páginas` : '';
    return `${ev.evidenceId}: ${ev.nombreArchivo} (${ev.mimeType}${pageInfo}) — ${status}`;
  }).join('\n');
}

// ---------------------------------------------------------------------------
// Main audit function
// ---------------------------------------------------------------------------

export interface AuditServiceResult {
  resultado: AuditResult;
  evidencias: AuditEvidenceItem[];
  usage: ReturnType<UsageCollector['summary']>;
}

export async function runMultimodalAudit(
  input: MultimodalAuditInput,
  policyPdfText?: string,
  onProgress?: AuditProgressCallback,
): Promise<AuditServiceResult> {
  const usage = new UsageCollector();

  // 1. Prepare all evidence files (bounded parallel pool, order preserved)
  const totalFiles = input.files.length;
  const prepared: PreparedEvidence[] = new Array(totalFiles);
  let nextIndex = 0;
  let completed = 0;

  const prepareOne = async (file: MultimodalAuditInput['files'][0]): Promise<PreparedEvidence> => {
    try {
      if (file.mimeType === 'application/pdf') return await preparePdfEvidence(file);
      if (file.mimeType.startsWith('audio/')) return await prepareAudioEvidence(file);
      return await prepareImageEvidence(file);
    } catch (error) {
      const buffer = await readFileBytes(file).catch(() => Buffer.alloc(0));
      return {
        evidenceId: file.evidenceId,
        nombreArchivo: file.nombreArchivo,
        mimeType: file.mimeType,
        tipo: inferTipo(file.mimeType),
        buffer,
        inventory: {
          evidenceId: file.evidenceId,
          nombreArchivo: file.nombreArchivo,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          sha256: sha256(buffer),
          tipo: inferTipo(file.mimeType),
          pagesSent: [],
          processingStatus: 'ERROR',
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
      };
    }
  };

  const workers = Array.from({ length: Math.min(PREP_CONCURRENCY, totalFiles) }, async () => {
    while (nextIndex < totalFiles) {
      const i = nextIndex++;
      prepared[i] = await prepareOne(input.files[i]);
      completed++;
      onProgress?.({
        status: 'running',
        progress: 8 + Math.round((completed / totalFiles) * 60),
        detail: `Preparando evidencias ${completed}/${totalFiles}...`,
      });
    }
  });
  await Promise.all(workers);

  const evidenceItems = prepared.map(p => p.inventory);
  const policyText = getPolicyTextForModel(policyPdfText);

  // 2. Build messages
  onProgress?.({ status: 'running', progress: 72, detail: 'Construyendo el análisis con la política institucional...' });
  const systemPrompt = buildAuditSystemPrompt(policyText);
  const multimodalContent = buildMultimodalContent(prepared);
  const evidenceDescription = buildEvidenceDescription(prepared);
  const userMessage = buildAuditUserMessage(evidenceDescription);

  // 3. Call model with retry
  let resultado: AuditResult | null = null;
  const models = getAiModels();
  const modelToUse = models.vision || models.fallback;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const isRetry = attempt > 0;
    const client = getOpenRouterClient();
    const callStarted = Date.now();
    onProgress?.({
      status: 'running',
      progress: 78,
      detail: isRetry
        ? `Enviando evidencias al modelo de IA (intento ${attempt + 1}/${MAX_RETRIES + 1}). Puede tardar varios minutos...`
        : 'Enviando evidencias al modelo de IA. Puede tardar varios minutos...',
    });

    try {
      const response = await client.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              ...multimodalContent,
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: MAX_RESPONSE_TOKENS,
      });

      usage.record({
        provider: 'openrouter',
        model: modelToUse,
        task: isRetry ? 'multimodal_audit_retry' : 'multimodal_audit',
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        latencyMs: Date.now() - callStarted,
        fallbackUsed: isRetry,
      });

      const rawContent = response.choices[0]?.message?.content || '';
      const rawJson = JSON.parse(extractJsonContent(rawContent));

      // Inject execution metadata
      rawJson.ejecucion = {
        ...rawJson.ejecucion,
        modelo: modelToUse,
        promptVersion: AUDIT_PROMPT_VERSION,
        fecha: new Date().toISOString(),
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        duracionMs: Date.now() - callStarted,
      };

      // Validate
      onProgress?.({ status: 'running', progress: 92, detail: 'Validando el resultado de la auditoría...' });
      const validation = validateAuditResult(rawJson);
      if (validation.valid || !shouldRetry(validation)) {
        resultado = rawJson as AuditResult;
        break;
      }

      // If invalid and can retry, continue
      if (attempt === MAX_RETRIES) {
        // Last attempt: use the raw result even if invalid
        resultado = rawJson as AuditResult;
        break;
      }
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw wrapOpenRouterError(error, `auditoría multimodal (intento ${attempt + 1}/${MAX_RETRIES + 1}, modelo ${modelToUse})`);
      }
      // Continue to retry
    }
  }

  if (!resultado) {
    throw new Error('No se obtuvo resultado de la auditoría');
  }

  // 4. Validate integrity
  const integrity = validateResultIntegrity(resultado, evidenceItems);
  if (integrity.warnings.length > 0) {
    console.warn('Audit integrity warnings:', integrity.warnings);
  }

  // 5. Return
  return {
    resultado,
    evidencias: evidenceItems,
    usage: usage.summary(),
  };
}
