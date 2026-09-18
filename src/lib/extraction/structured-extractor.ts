import { getOpenRouterClient } from '../ai/client';
import { getAiModels } from '../ai/models';
import { buildExtractionPrompt } from '../ai/prompts';
import { parseExtractionJson, ValidatedExtractionResult } from '../ai/schemas';
import { UsageCollector } from '../ai/usage';
import { ExtractedFact } from './types';

export type EvidenceKind = 'PDF' | 'IMAGE' | 'AUDIO' | 'TEXT';

export interface StructuredEvidenceInput {
  evidenceId: string;
  tipo: EvidenceKind;
  text: string;
  page?: number;
  timestamp?: string;
}

export interface StructuredExtractionOutput {
  result: ValidatedExtractionResult;
  fallbackUsed: boolean;
}

function extractJsonContent(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : trimmed;
}

function applyDeterministicFields(input: StructuredEvidenceInput, result: ValidatedExtractionResult): ValidatedExtractionResult {
  const text = input.text;
  const folio = text.match(/\bCAVE-[A-Z0-9-]{3,}\b/i)?.[0] || null;
  const matricula = text.match(/\b\d{8,9}\b/)?.[0] || null;
  const telefono = text.match(/(?:\+52\s*)?(?:\d[\s-]*){10}\b/)?.[0]?.trim() || null;

  if (folio && result.estudiante.folio.confianza !== 'CONFLICTO') {
    result.estudiante.folio = { valor: folio.toUpperCase(), confianza: 'ALTA', evidencia_id: input.evidenceId, pagina: input.page ?? null, timestamp: input.timestamp ?? null, texto_citado: folio };
  }
  if (matricula && result.estudiante.matricula.confianza !== 'CONFLICTO') {
    result.estudiante.matricula = { valor: matricula, confianza: 'ALTA', evidencia_id: input.evidenceId, pagina: input.page ?? null, timestamp: input.timestamp ?? null, texto_citado: matricula };
  }
  if (telefono && result.estudiante.telefono.confianza !== 'CONFLICTO') {
    result.estudiante.telefono = { valor: telefono, confianza: 'ALTA', evidencia_id: input.evidenceId, pagina: input.page ?? null, timestamp: input.timestamp ?? null, texto_citado: telefono };
  }

  return result;
}

export function shouldUseFallback(parsed: { success: boolean }, result?: ValidatedExtractionResult): boolean {
  if (!parsed.success || !result) return true;
  const critical = [
    result.solicitud.fecha_inicio,
    result.solicitud.fecha_solicitud,
    result.solicitud.motivo,
    result.indicadores.intencion_cancelacion_manifiesta,
  ];
  return critical.some(field => field.confianza === 'CONFLICTO' || field.confianza === 'BAJA');
}

async function callExtractionModel(
  model: string,
  task: string,
  input: StructuredEvidenceInput,
  usage: UsageCollector,
  fallbackUsed: boolean
): Promise<string> {
  const client = getOpenRouterClient();
  const started = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: buildExtractionPrompt() },
      {
        role: 'user',
        content: `EVIDENCIA ${input.evidenceId} (${input.tipo})\n${input.page ? `PAGINA ${input.page}\n` : ''}${input.timestamp ? `TIMESTAMP ${input.timestamp}\n` : ''}${input.text}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 4000,
  });

  usage.record({
    provider: 'openrouter',
    model,
    task,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
    latencyMs: Date.now() - started,
    fallbackUsed,
  });

  return response.choices[0]?.message?.content || '';
}

export async function extractStructuredFromText(input: StructuredEvidenceInput, usage: UsageCollector): Promise<StructuredExtractionOutput> {
  const models = getAiModels();
  const raw = await callExtractionModel(models.extraction, 'text_extraction', input, usage, false);
  const parsed = parseExtractionJson(extractJsonContent(raw));

  if (parsed.success && !shouldUseFallback(parsed, parsed.data)) {
    return { result: applyDeterministicFields(input, parsed.data), fallbackUsed: false };
  }

  const fallbackRaw = await callExtractionModel(models.fallback, 'text_extraction_fallback', input, usage, true);
  const fallbackParsed = parseExtractionJson(extractJsonContent(fallbackRaw));
  if (!fallbackParsed.success) {
    const error = (fallbackParsed as { success: false; error: string }).error;
    throw new Error(`Extracción inválida tras fallback: ${error}`);
  }

  return { result: applyDeterministicFields(input, fallbackParsed.data), fallbackUsed: true };
}

export function normalizeFacts(result: ValidatedExtractionResult, defaultEvidenceId: string): ExtractedFact[] {
  return result.hechos.map((h, index) => ({
    id: h.id || `fact-${defaultEvidenceId}-${index + 1}`,
    tipo: h.tipo,
    valor: h.valor === null ? '' : String(h.valor),
    confianza: h.confianza,
    evidenciaId: h.evidenceId || h.evidencia_id || defaultEvidenceId,
    pagina: h.pagina ?? undefined,
    timestamp: h.timestamp ?? undefined,
    textoCitado: h.textoCitado || h.texto_citado || undefined,
  }));
}
