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
  EvidenceClassification,
} from './types.js';
import { UsageCollector } from '../ai/usage.js';
import { getExtractionConcurrency } from '../ai/models.js';
import { ValidatedExtractionResult } from '../ai/schemas.js';
import { extractPdfTextLocally, renderPdfPagesToImages } from './pdf-extractor.js';
import { extractFromImage } from './image-extractor.js';
import { extractStructuredFromText, normalizeFacts } from './structured-extractor.js';
import { formatTranscriptSegments, transcribeAudio, TranscriptSegment } from './audio-extractor.js';

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
    tipo_evidencia: field(),
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
    visual_facts: {
      aula_virtual: {
        ingreso_aula: field(), ultimo_acceso_curso: field(), hora_acceso: field(), curso: field(), grupo: field(),
        calificacion: field(), actividades_entregadas: field(), clics_detectados: field(), materias_cargadas: field(), seleccion_modalidad: field(),
      },
      siu: {
        estatus_alumno: field(), ultima_sesion: field(), fecha_inicio: field(), primer_pago: field(), proximo_pago_monto: field(),
        telefono: field(), correo: field(), calificaciones_registradas: field(),
      },
      contacto: {
        telefono_registrado: field(), correo_registrado: field(), medio: field(), ultima_interaccion: field(),
      },
    },
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

function hasValue(field?: ExtractedField<any>): boolean {
  return field?.valor !== null && field?.valor !== undefined && field.valor !== '' && field.confianza !== 'BAJA';
}

function promoteField<T>(target: ExtractedField<T>, source?: ExtractedField<T>): ExtractedField<T> {
  if (hasValue(target) || !hasValue(source)) return target;
  return source as ExtractedField<T>;
}

function booleanFromVisual(source?: ExtractedField<any>, inferredValue?: boolean): ExtractedField<boolean> | null {
  if (hasValue(source) && typeof source?.valor === 'boolean') return source as ExtractedField<boolean>;
  if (hasValue(source) && inferredValue !== undefined) {
    return { ...source, valor: inferredValue, textoCitado: source?.textoCitado || String(source?.valor) } as ExtractedField<boolean>;
  }
  return null;
}

function firstValuedField<T>(...fields: (ExtractedField<T> | undefined)[]): ExtractedField<T> | undefined {
  return fields.find(field => hasValue(field));
}

function confidenceRank(confidence: FieldConfidence): number {
  return { ALTA: 4, MEDIA: 3, BAJA: 2, CONFLICTO: 1 }[confidence];
}

function mergeExtractionResults(results: ValidatedExtractionResult[]): Partial<DraftCase> {
  const source = results.length > 0 ? results : [emptyExtraction()];
  const pick = (section: 'estudiante' | 'solicitud' | 'indicadores', key: string) => mergeField(source.map(result => (result as any)[section][key]));
  const pickVisual = (section: 'aula_virtual' | 'siu' | 'contacto', key: string) =>
    mergeField(source.map(result => (result as any).visual_facts?.[section]?.[key]));

  const merged: Partial<DraftCase> = {
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
      fechaInicio: pick('solicitud', 'fecha_inicio'),
      fechaSolicitud: pick('solicitud', 'fecha_solicitud'),
      motivo: pick('solicitud', 'motivo'),
    } as any,
    academic: {
      contactoEfectivo: pick('indicadores', 'contacto_efectivo'),
      llamadas: pick('indicadores', 'llamadas'),
      mensajes: pick('indicadores', 'mensajes'),
      ingresoAula: pick('indicadores', 'ingreso_aula'),
      materiasCargadas: pick('indicadores', 'materias_cargadas'),
      fallaCargaMaterias: pick('indicadores', 'falla_carga_materias'),
      calificaciones: pick('indicadores', 'calificaciones'),
      erroresOperativos: pick('indicadores', 'errores_operativos'),
      erroresFinancieros: pick('indicadores', 'errores_financieros'),
      errorInscripcion: pick('indicadores', 'error_inscripcion'),
      promesaVenta: pick('indicadores', 'promesa_venta'),
      retencionRealizada: pick('indicadores', 'retencion_realizada'),
      retencionAceptada: pick('indicadores', 'retencion_aceptada'),
      intencionCancelacionManifiesta: pick('indicadores', 'intencion_cancelacion_manifiesta'),
    } as any,
    visualFacts: {
      aulaVirtual: {
        ingresoAula: pickVisual('aula_virtual', 'ingreso_aula'),
        ultimoAccesoCurso: pickVisual('aula_virtual', 'ultimo_acceso_curso'),
        horaAcceso: pickVisual('aula_virtual', 'hora_acceso'),
        curso: pickVisual('aula_virtual', 'curso'),
        grupo: pickVisual('aula_virtual', 'grupo'),
        calificacion: pickVisual('aula_virtual', 'calificacion'),
        actividadesEntregadas: pickVisual('aula_virtual', 'actividades_entregadas'),
        clicsDetectados: pickVisual('aula_virtual', 'clics_detectados'),
        materiasCargadas: pickVisual('aula_virtual', 'materias_cargadas'),
        seleccionModalidad: pickVisual('aula_virtual', 'seleccion_modalidad'),
      },
      siu: {
        estatusAlumno: pickVisual('siu', 'estatus_alumno'),
        ultimaSesion: pickVisual('siu', 'ultima_sesion'),
        fechaInicio: pickVisual('siu', 'fecha_inicio'),
        primerPago: pickVisual('siu', 'primer_pago'),
        proximoPagoMonto: pickVisual('siu', 'proximo_pago_monto'),
        telefono: pickVisual('siu', 'telefono'),
        correo: pickVisual('siu', 'correo'),
        calificacionesRegistradas: pickVisual('siu', 'calificaciones_registradas'),
      },
      contacto: {
        telefonoRegistrado: pickVisual('contacto', 'telefono_registrado'),
        correoRegistrado: pickVisual('contacto', 'correo_registrado'),
        medio: pickVisual('contacto', 'medio'),
        ultimaInteraccion: pickVisual('contacto', 'ultima_interaccion'),
      },
    },
    evidencias: [],
    conflictos: [],
    completitud: 0,
  };

  const student = merged.student as StudentData;
  const request = merged.request as RequestData;
  const academic = merged.academic as AcademicIndicators;
  const vf = merged.visualFacts;

  if (vf) {
    student.telefono = promoteField(student.telefono, firstValuedField(vf.contacto.telefonoRegistrado, vf.siu.telefono));
    request.fechaInicio = promoteField(request.fechaInicio, vf.siu.fechaInicio);

    const ingresoAula = booleanFromVisual(vf.aulaVirtual.ingresoAula)
      || booleanFromVisual(vf.aulaVirtual.ultimoAccesoCurso, true)
      || booleanFromVisual(vf.aulaVirtual.clicsDetectados, Number(vf.aulaVirtual.clicsDetectados?.valor) > 0)
      || booleanFromVisual(vf.aulaVirtual.actividadesEntregadas, Number(vf.aulaVirtual.actividadesEntregadas?.valor) > 0);
    if (ingresoAula) academic.ingresoAula = promoteField(academic.ingresoAula, ingresoAula);

    const materiasCargadas = booleanFromVisual(vf.aulaVirtual.materiasCargadas);
    if (materiasCargadas) academic.materiasCargadas = promoteField(academic.materiasCargadas, materiasCargadas);

    const calificaciones = booleanFromVisual(vf.siu.calificacionesRegistradas)
      || booleanFromVisual(vf.aulaVirtual.calificacion, true);
    if (calificaciones) academic.calificaciones = promoteField(academic.calificaciones, calificaciones);
  }

  return merged;
}

function mergeValidatedExtractionResults(results: ValidatedExtractionResult[]): ValidatedExtractionResult {
  const source = results.length > 0 ? results : [emptyExtraction()];
  const pick = (section: 'estudiante' | 'solicitud' | 'indicadores', key: string) => mergeField(source.map(result => (result as any)[section][key])) as any;
  const pickVisual = (section: 'aula_virtual' | 'siu' | 'contacto', key: string) =>
    mergeField(source.map(result => (result as any).visual_facts?.[section]?.[key])) as any;

  return {
    tipo_evidencia: mergeField(source.map(result => result.tipo_evidencia)) as any,
    estudiante: {
      folio: pick('estudiante', 'folio'),
      matricula: pick('estudiante', 'matricula'),
      nombre: pick('estudiante', 'nombre'),
      nivel: pick('estudiante', 'nivel'),
      programa: pick('estudiante', 'programa'),
      canal: pick('estudiante', 'canal'),
      telefono: pick('estudiante', 'telefono'),
    },
    solicitud: {
      fecha_inicio: pick('solicitud', 'fecha_inicio'),
      fecha_solicitud: pick('solicitud', 'fecha_solicitud'),
      motivo: pick('solicitud', 'motivo'),
    },
    indicadores: {
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
    },
    hechos: source.flatMap(result => result.hechos || []),
    visual_facts: {
      aula_virtual: {
        ingreso_aula: pickVisual('aula_virtual', 'ingreso_aula'),
        ultimo_acceso_curso: pickVisual('aula_virtual', 'ultimo_acceso_curso'),
        hora_acceso: pickVisual('aula_virtual', 'hora_acceso'),
        curso: pickVisual('aula_virtual', 'curso'),
        grupo: pickVisual('aula_virtual', 'grupo'),
        calificacion: pickVisual('aula_virtual', 'calificacion'),
        actividades_entregadas: pickVisual('aula_virtual', 'actividades_entregadas'),
        clics_detectados: pickVisual('aula_virtual', 'clics_detectados'),
        materias_cargadas: pickVisual('aula_virtual', 'materias_cargadas'),
        seleccion_modalidad: pickVisual('aula_virtual', 'seleccion_modalidad'),
      },
      siu: {
        estatus_alumno: pickVisual('siu', 'estatus_alumno'),
        ultima_sesion: pickVisual('siu', 'ultima_sesion'),
        fecha_inicio: pickVisual('siu', 'fecha_inicio'),
        primer_pago: pickVisual('siu', 'primer_pago'),
        proximo_pago_monto: pickVisual('siu', 'proximo_pago_monto'),
        telefono: pickVisual('siu', 'telefono'),
        correo: pickVisual('siu', 'correo'),
        calificaciones_registradas: pickVisual('siu', 'calificaciones_registradas'),
      },
      contacto: {
        telefono_registrado: pickVisual('contacto', 'telefono_registrado'),
        correo_registrado: pickVisual('contacto', 'correo_registrado'),
        medio: pickVisual('contacto', 'medio'),
        ultima_interaccion: pickVisual('contacto', 'ultima_interaccion'),
      },
    },
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

  // PDF FireShot / escaneado sin texto seleccionable: renderizar a imagen y usar visión
  const pages = await renderPdfPagesToImages(ev.file.buffer, 6);
  const results: ValidatedExtractionResult[] = [];
  const allFacts: ExtractedFact[] = [];
  for (const page of pages) {
    const extraction = await extractFromImage(page.data, page.mimeType, ev.id, usage);
    results.push(extraction.result);
    allFacts.push(...normalizeFacts(extraction.result, ev.id).map(f => ({ ...f, pagina: page.page })));
  }
  ev.extraccion = { textoExtraido: '', resumen: pdfText.reason, hechos: allFacts };
  return mergeValidatedExtractionResults(results);
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
    visualFacts: draft.visualFacts as DraftCase['visualFacts'],
    evidencias: evidenceDrafts.map(ev => ({
      id: ev.id,
      file: new File([ev.file.buffer], ev.file.originalname, { type: ev.file.mimetype }),
      nombreArchivo: ev.nombreArchivo,
      tipo: ev.tipo,
      fuente: ev.fuente,
      tipoEvidencia: classifyEvidence(ev, results[evidenceDrafts.indexOf(ev) as number] || null),
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
      tipoEvidencia: classifyEvidence(ev, results[evidenceDrafts.indexOf(ev) as number] || null),
      extractedFields: {
        ...(ev.extraccion?.hechos?.reduce((acc, h) => ({ ...acc, [h.tipo]: h.valor }), {}) || {}),
      },
    })),
    usage: usage.summary(),
  };
}

/**
 * Fase 2 — Clasificación automática del tipo de evidencia.
 * Combina la clasificación declarada por visión (tipo_evidencia) con
 * heurísticas de nombre de archivo y hechos visuales detectados.
 */
function classifyEvidence(ev: InternalEvidenceDraft, result: ValidatedExtractionResult | null): EvidenceClassification {
  const aiTipo = (result?.tipo_evidencia?.valor as EvidenceClassification | undefined) ?? null;
  const validTypes: EvidenceClassification[] = [
    'AULA_PERFIL_USUARIO', 'AULA_BITACORAS', 'AULA_CALIFICACIONES', 'SIU_DASHBOARD',
    'SIU_DATOS_PERSONALES', 'I6_CONTACTO', 'WHATSAPP', 'CORREO', 'OTRO', 'DESCONOCIDA',
  ];
  if (aiTipo && validTypes.includes(aiTipo)) return aiTipo;

  const lower = ev.nombreArchivo.toLowerCase();
  if (lower.includes('siu')) return 'SIU_DASHBOARD';
  if (lower.includes('i6') || lower.includes('llamada') || lower.includes('contacto')) return 'I6_CONTACTO';
  if (lower.includes('whatsapp') || lower.includes('wa_')) return 'WHATSAPP';
  if (lower.includes('correo') || lower.includes('email') || lower.includes('mail')) return 'CORREO';
  if (lower.includes('aula') || lower.includes('virtual') || lower.includes('moodle')) return 'AULA_BITACORAS';

  const facts = result?.visual_facts;
  const aulaVals = Object.values(facts?.aula_virtual || {}).map(f => f?.valor).filter(v => v !== null && v !== undefined);
  const siuVals = Object.values(facts?.siu || {}).map(f => f?.valor).filter(v => v !== null && v !== undefined);
  if (aulaVals.length > 0) return 'AULA_BITACORAS';
  if (siuVals.length > 0) return 'SIU_DASHBOARD';
  return 'DESCONOCIDA';
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
