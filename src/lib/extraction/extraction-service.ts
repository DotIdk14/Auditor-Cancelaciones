import {
  DraftCase,
  EvidenceDraft,
  ExtractedField,
  ProcessResult,
  StudentData,
  RequestData,
  AcademicIndicators,
  ExtractedFact,
  ConflictItem,
  FieldConfidence,
} from './types';
import { UsageCollector } from '../ai/usage';
import { getExtractionConcurrency } from '../ai/models';
import { ValidatedExtractionResult } from '../ai/schemas';
import { extractPdfTextLocally, renderPdfPagesToImages } from './pdf-extractor';
import { extractFromImage } from './image-extractor';
import { extractStructuredFromText, normalizeFacts } from './structured-extractor';
import { formatTranscriptSegments, transcribeAudio, TranscriptSegment } from './audio-extractor';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 10;

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface InternalEvidenceDraft {
  id: string;
  file: MulterFile;
  nombreArchivo: string;
  tipo: 'PDF' | 'IMAGE' | 'AUDIO';
  fuente: string;
  estado: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';
  extraccion?: {
    textoExtraido?: string;
    resumen?: string;
    hechos?: ExtractedFact[];
    transcriptSegments?: TranscriptSegment[];
  };
  error?: string;
}

function validateFiles(files: MulterFile[]): string | null {
  if (files.length === 0) return 'No se proporcionaron archivos';
  if (files.length > MAX_FILES) return `Máximo ${MAX_FILES} archivos permitidos`;

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) return `Tipo de archivo no permitido: ${file.mimetype}`;
    if (file.size > MAX_FILE_SIZE) return `Archivo demasiado grande: ${file.originalname} (máx 50MB)`;
  }
  return null;
}

function emptyField<T = string>(valor: T | null = null, confianza: FieldConfidence = 'BAJA', evidenciaId: string | null = null, textoCitado?: string): ExtractedField<T> {
  return { valor, confianza, evidenciaId, textoCitado };
}

function emptyExtraction(evidenceId: string | null = null): ValidatedExtractionResult {
  const field = () => ({ valor: null, confianza: 'BAJA' as const, evidencia_id: evidenceId, pagina: null, timestamp: null, texto_citado: null });
  return {
    estudiante: {
      folio: field(), matricula: field(), nombre: field(), nivel: field(), programa: field(), canal: field(), telefono: field(),
    },
    solicitud: {
      fecha_inicio: field(), fecha_solicitud: field(), motivo: field(),
    },
    indicadores: {
      contacto_efectivo: field(), llamadas: field(), mensajes: field(), ingreso_aula: field(), materias_cargadas: field(), falla_carga_materias: field(),
      calificaciones: field(), errores_operativos: field(), errores_financieros: field(), error_inscripcion: field(), promesa_venta: field(),
      retencion_realizada: field(), retencion_aceptada: field(), intencion_cancelacion_manifiesta: field(),
    },
    hechos: [],
  };
}

function normalizeField(field: any): ExtractedField<any> {
  return {
    valor: field?.valor ?? null,
    confianza: field?.confianza ?? 'BAJA',
    evidenciaId: field?.evidenciaId ?? field?.evidencia_id ?? null,
    pagina: field?.pagina ?? undefined,
    timestamp: field?.timestamp ?? undefined,
    textoCitado: field?.textoCitado ?? field?.texto_citado ?? undefined,
    conflicto: field?.conflicto ?? undefined,
  };
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeField(candidates: any[]): ExtractedField<any> {
  const withValue = candidates.filter(field => field && field.valor !== null && field.valor !== undefined && field.valor !== '');
  if (withValue.length === 0) return normalizeField(candidates[0]);

  const first = withValue[0];
  const conflict = withValue.some(field => !sameValue(field.valor, first.valor));
  if (conflict) {
    return {
      ...normalizeField(first),
      confianza: 'CONFLICTO',
      conflicto: withValue.map(field => `${field.valor} (${field.evidencia_id || field.evidenciaId || 'sin evidencia'})`).join(' vs '),
    };
  }

  const sorted = [...withValue].sort((a, b) => confidenceRank(b.confianza) - confidenceRank(a.confianza));
  return normalizeField(sorted[0]);
}

function confidenceRank(confidence: FieldConfidence): number {
  return { ALTA: 4, MEDIA: 3, BAJA: 2, CONFLICTO: 1 }[confidence];
}

function mergeExtractionResults(results: ValidatedExtractionResult[]): Partial<DraftCase> {
  const source = results.length > 0 ? results : [emptyExtraction()];
  const pick = (section: 'estudiante' | 'solicitud' | 'indicadores', key: string) => mergeField(source.map(result => (result as any)[section][key]));

  return {
    student: {
      folio: pick('estudiante', 'folio'),
      matricula: pick('estudiante', 'matricula'),
      nombre: pick('estudiante', 'nombre'),
      nivel: pick('estudiante', 'nivel'),
      programa: pick('estudiante', 'programa'),
      canal: pick('estudiante', 'canal'),
      telefono: pick('estudiante', 'telefono'),
    } as any,
    request: {
      fecha_inicio: pick('solicitud', 'fecha_inicio'),
      fecha_solicitud: pick('solicitud', 'fecha_solicitud'),
      motivo: pick('solicitud', 'motivo'),
    } as any,
    academic: {
      contacto_efectivo: pick('indicadores', 'contacto_efectivo'),
      llamadas: pick('indicadores', 'llamadas'),
      mensajes: pick('indicadores', 'mensajes'),
      ingreso_aula: pick('indicadores', 'ingreso_aula'),
      materias_cargadas: pick('indicadores', 'materias_cargadas'),
      falla_carga_materias: pick('indicadores', 'falla_carga_materias'),
      calificaciones: pick('indicadores', 'calificaciones'),
      errores_operativos: pick('indicadores', 'errores_operativos'),
      errores_financieros: pick('indicadores', 'errores_financieros'),
      error_inscripcion: pick('indicadores', 'error_inscripcion'),
      promesa_venta: pick('indicadores', 'promesa_venta'),
      retencion_realizada: pick('indicadores', 'retencion_realizada'),
      retencion_aceptada: pick('indicadores', 'retencion_aceptada'),
      intencion_cancelacion_manifiesta: pick('indicadores', 'intencion_cancelacion_manifiesta'),
    } as any,
    evidencias: [],
    conflictos: [],
    completitud: 0,
  };
}

function detectConflicts(hechos: ExtractedFact[], draft: Partial<DraftCase>): ConflictItem[] {
  const conflictos: ConflictItem[] = [];
  const byField: Record<string, ExtractedFact[]> = {};
  for (const h of hechos) {
    if (!byField[h.tipo]) byField[h.tipo] = [];
    byField[h.tipo].push(h);
  }

  for (const [tipo, items] of Object.entries(byField)) {
    const uniqueValues = new Set(items.map(i => i.valor));
    if (uniqueValues.size > 1 || items.some(i => i.confianza === 'CONFLICTO')) {
      conflictos.push({
        campo: tipo,
        valores: items.map(i => ({ valor: i.valor, evidenciaId: i.evidenciaId, confianza: i.confianza })),
        descripcion: `Valores contradictorios para ${tipo}: ${Array.from(uniqueValues).join(' vs ')}`,
      });
    }
  }

  for (const [sectionName, section] of Object.entries({ student: draft.student, request: draft.request, academic: draft.academic })) {
    for (const [key, field] of Object.entries(section || {}) as [string, ExtractedField][]) {
      if (field.confianza === 'CONFLICTO') {
        conflictos.push({
          campo: `${sectionName}.${key}`,
          valores: [{ valor: field.valor, evidenciaId: field.evidenciaId || '', confianza: field.confianza }],
          descripcion: field.conflicto || `Conflicto detectado en ${key}`,
        });
      }
    }
  }

  return conflictos;
}

function calculateCompletitud(draft: Partial<DraftCase>): number {
  const fields = [
    ...Object.values(draft.student || {}),
    ...Object.values(draft.request || {}),
    ...Object.values(draft.academic || {}),
  ] as ExtractedField[];
  const withValue = fields.filter(f => f.valor !== null && f.valor !== undefined && f.confianza !== 'BAJA').length;
  return fields.length > 0 ? Math.round((withValue / fields.length) * 100) : 0;
}

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function processSingleEvidence(ev: InternalEvidenceDraft, usage: UsageCollector): Promise<ValidatedExtractionResult | null> {
  if (ev.tipo === 'IMAGE') {
    const extraction = await extractFromImage(ev.file.buffer, ev.file.mimetype, ev.id, usage);
    const hechos = normalizeFacts(extraction.result, ev.id);
    ev.extraccion = { textoExtraido: '', resumen: 'Extracción vision estructurada', hechos };
    return extraction.result;
  }

  if (ev.tipo === 'AUDIO') {
    const segments = await transcribeAudio(ev.file.buffer);
    const text = formatTranscriptSegments(segments);
    const extraction = await extractStructuredFromText({ evidenceId: ev.id, tipo: 'AUDIO', text }, usage);
    const hechos = normalizeFacts(extraction.result, ev.id);
    ev.extraccion = { textoExtraido: text, resumen: text.slice(0, 500), hechos, transcriptSegments: segments };
    return extraction.result;
  }

  const pdfText = await extractPdfTextLocally(ev.file.buffer);
  if (pdfText.hasUsefulText) {
    const extraction = await extractStructuredFromText({ evidenceId: ev.id, tipo: 'PDF', text: pdfText.text }, usage);
    const hechos = normalizeFacts(extraction.result, ev.id);
    ev.extraccion = { textoExtraido: pdfText.text, resumen: pdfText.reason, hechos };
    return extraction.result;
  }

  const pages = await renderPdfPagesToImages(ev.file.buffer, 3);
  const results: ValidatedExtractionResult[] = [];
  const allFacts: ExtractedFact[] = [];
  for (const page of pages) {
    const extraction = await extractFromImage(page.data, page.mimeType, ev.id, usage);
    results.push(extraction.result);
    allFacts.push(...normalizeFacts(extraction.result, ev.id).map(f => ({ ...f, pagina: page.page })));
  }
  ev.extraccion = { textoExtraido: '', resumen: pdfText.reason, hechos: allFacts };
  return mergeExtractionResults(results) as any as ValidatedExtractionResult;
}

export async function processEvidences(files: MulterFile[]): Promise<ProcessResult> {
  const validationError = validateFiles(files);
  if (validationError) throw new Error(validationError);

  const usage = new UsageCollector();
  const evidenceDrafts: InternalEvidenceDraft[] = files.map((file, idx) => ({
    id: `ev_${String(idx + 1).padStart(3, '0')}`,
    file,
    nombreArchivo: file.originalname,
    tipo: file.mimetype.startsWith('audio/') ? 'AUDIO' : file.mimetype === 'application/pdf' ? 'PDF' : 'IMAGE',
    fuente: inferSource(file.originalname, file.mimetype),
    estado: 'PROCESANDO',
  }));

  const results = await mapLimit(evidenceDrafts, getExtractionConcurrency(), async ev => {
    try {
      const result = await processSingleEvidence(ev, usage);
      ev.estado = 'COMPLETADO';
      return result;
    } catch (error) {
      ev.estado = 'ERROR';
      ev.error = error instanceof Error ? error.message : 'Error desconocido';
      ev.extraccion = ev.extraccion || { textoExtraido: '', resumen: '' };
      return null;
    }
  });

  const validResults = results.filter((result): result is ValidatedExtractionResult => Boolean(result));
  const draft = mergeExtractionResults(validResults);
  const hechos = evidenceDrafts.flatMap(ev => ev.extraccion?.hechos || []);
  const conflictos = detectConflicts(hechos, draft);

  const fullDraft: DraftCase = {
    student: draft.student as StudentData,
    request: draft.request as RequestData,
    academic: draft.academic as AcademicIndicators,
    evidencias: evidenceDrafts.map(ev => ({
      id: ev.id,
      file: new File([ev.file.buffer], ev.file.originalname, { type: ev.file.mimetype }),
      nombreArchivo: ev.nombreArchivo,
      tipo: ev.tipo,
      fuente: ev.fuente,
      estado: ev.estado,
      extraccion: ev.extraccion,
      error: ev.error,
    })),
    conflictos,
    completitud: calculateCompletitud(draft),
  };

  return {
    draft: fullDraft,
    evidenceResults: evidenceDrafts.map(ev => ({
      evidenceId: ev.id,
      nombreArchivo: ev.nombreArchivo,
      success: ev.estado === 'COMPLETADO',
      error: ev.error,
      extractedFields: {
        ...(ev.extraccion?.hechos?.reduce((acc, h) => ({ ...acc, [h.tipo]: h.valor }), {}) || {}),
      },
    })),
    usage: usage.summary(),
  };
}

function inferSource(filename: string, mimeType: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('siu')) return 'SIU';
  if (lower.includes('flokzu')) return 'Flokzu';
  if (lower.includes('i6') || lower.includes('llamada')) return 'I6';
  if (lower.includes('aula') || lower.includes('virtual')) return 'Aula Virtual';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('correo') || lower.includes('email')) return 'Correo';
  if (mimeType === 'audio/mpeg' || mimeType === 'audio/wav') return 'AUDIO';
  return 'Documentos';
}

export { extractPdfTextLocally, extractFromImage, transcribeAudio };
