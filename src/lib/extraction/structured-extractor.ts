import { getOpenRouterClient } from '../ai/client.js';
import { getAiModels } from '../ai/models.js';
import { buildExtractionPrompt } from '../ai/prompts.js';
import { parseExtractionJson, ValidatedExtractionResult } from '../ai/schemas.js';
import { UsageCollector } from '../ai/usage.js';
import { ExtractedFact } from './types.js';

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

const VISUAL_FACT_LABELS: Record<string, string> = {
  'aula_virtual.ingreso_aula': 'AULA_INGRESO',
  'aula_virtual.ultimo_acceso_curso': 'AULA_ULTIMO_ACCESO',
  'aula_virtual.hora_acceso': 'AULA_HORA_ACCESO',
  'aula_virtual.curso': 'AULA_CURSO',
  'aula_virtual.grupo': 'AULA_GRUPO',
  'aula_virtual.calificacion': 'AULA_CALIFICACION',
  'aula_virtual.actividades_entregadas': 'AULA_ACTIVIDADES_ENTREGADAS',
  'aula_virtual.clics_detectados': 'AULA_CLICS_DETECTADOS',
  'aula_virtual.materias_cargadas': 'AULA_MATERIAS_CARGADAS',
  'aula_virtual.seleccion_modalidad': 'AULA_SELECCION_MODALIDAD',
  'siu.estatus_alumno': 'SIU_ESTATUS',
  'siu.ultima_sesion': 'SIU_ULTIMA_SESION',
  'siu.fecha_inicio': 'SIU_FECHA_INICIO',
  'siu.primer_pago': 'SIU_PRIMER_PAGO',
  'siu.proximo_pago_monto': 'SIU_PROXIMO_PAGO_MONTO',
  'siu.telefono': 'SIU_TELEFONO',
  'siu.correo': 'SIU_CORREO',
  'siu.calificaciones_registradas': 'SIU_CALIFICACIONES',
  'contacto.telefono_registrado': 'CONTACTO_TELEFONO',
  'contacto.correo_registrado': 'CONTACTO_CORREO',
  'contacto.medio': 'CONTACTO_MEDIO',
  'contacto.ultima_interaccion': 'CONTACTO_ULTIMA_INTERACCION',
};

export function normalizeFacts(result: ValidatedExtractionResult, defaultEvidenceId: string): ExtractedFact[] {
  const facts: ExtractedFact[] = result.hechos.map((h, index) => ({
    id: h.id || `fact-${defaultEvidenceId}-${index + 1}`,
    tipo: h.tipo,
    valor: h.valor === null ? '' : String(h.valor),
    confianza: h.confianza,
    evidenciaId: h.evidenceId || h.evidencia_id || defaultEvidenceId,
    pagina: h.pagina ?? undefined,
    timestamp: h.timestamp ?? undefined,
    textoCitado: h.textoCitado || h.texto_citado || undefined,
  }));

  // Fase 1 — hecho visual adicional cuando la captura muestra valor en plataforma
  const vf = result.visual_facts;
  if (vf) {
    let index = facts.length;
    for (const [section, entries] of Object.entries(vf) as [string, Record<string, any>][]) {
      for (const [key, field] of Object.entries(entries || {})) {
        const valor = field?.valor;
        if (valor === null || valor === undefined || valor === '') continue;
        if (field?.confianza === 'BAJA') continue;
        facts.push({
          id: `fact-visual-${defaultEvidenceId}-${index + 1}`,
          tipo: VISUAL_FACT_LABELS[`${section}.${key}`] || `${section}_${key}`.toUpperCase(),
          valor: typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor),
          confianza: field.confianza,
          evidenciaId: defaultEvidenceId,
          pagina: field.pagina ?? undefined,
          timestamp: field.timestamp ?? undefined,
          textoCitado: field.texto_citado || field.textoCitado || undefined,
        });
        index += 1;
      }
    }
  }

  return facts;
}
