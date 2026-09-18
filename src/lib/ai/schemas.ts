import { z } from 'zod';

export const ConfidenceSchema = z.enum(['ALTA', 'MEDIA', 'BAJA', 'CONFLICTO']);

const FieldSchema = z.object({
  valor: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  confianza: ConfidenceSchema,
  evidencia_id: z.string().nullable().optional(),
  evidenceId: z.string().nullable().optional(),
  pagina: z.number().int().positive().nullable().optional(),
  timestamp: z.string().nullable().optional(),
  texto_citado: z.string().nullable().optional(),
  textoCitado: z.string().nullable().optional(),
  conflicto: z.string().nullable().optional(),
}).strict();

/**
 * Fase 1 — Hechos visuales extraídos de capturas de Aula Virtual / SIU
 * y PDFs FireShot renderizados a imagen. Solo hechos observables, sin
 * interpretación de política.
 */
const VisualFactsSchema = z.object({
  aula_virtual: z.object({
    ingreso_aula: FieldSchema,
    ultimo_acceso_curso: FieldSchema,
    hora_acceso: FieldSchema,
    curso: FieldSchema,
    grupo: FieldSchema,
    calificacion: FieldSchema,
    actividades_entregadas: FieldSchema,
    clics_detectados: FieldSchema,
    materias_cargadas: FieldSchema,
    seleccion_modalidad: FieldSchema,
  }).strict(),
  siu: z.object({
    estatus_alumno: FieldSchema,
    ultima_sesion: FieldSchema,
    fecha_inicio: FieldSchema,
    primer_pago: FieldSchema,
    proximo_pago_monto: FieldSchema,
    telefono: FieldSchema,
    correo: FieldSchema,
    calificaciones_registradas: FieldSchema,
  }).strict(),
  contacto: z.object({
    telefono_registrado: FieldSchema,
    correo_registrado: FieldSchema,
    medio: FieldSchema,
    ultima_interaccion: FieldSchema,
  }).strict(),
}).strict();

export const ExtractionResultSchema = z.object({
  /** Fase 2 — clasificación de esta evidencia (resultado por archivo). */
  tipo_evidencia: FieldSchema.optional(),
  estudiante: z.object({
    folio: FieldSchema,
    matricula: FieldSchema,
    nombre: FieldSchema,
    nivel: FieldSchema,
    programa: FieldSchema,
    canal: FieldSchema,
    telefono: FieldSchema,
  }).strict(),
  solicitud: z.object({
    fecha_inicio: FieldSchema,
    fecha_solicitud: FieldSchema,
    motivo: FieldSchema,
  }).strict(),
  indicadores: z.object({
    contacto_efectivo: FieldSchema,
    llamadas: FieldSchema,
    mensajes: FieldSchema,
    ingreso_aula: FieldSchema,
    materias_cargadas: FieldSchema,
    falla_carga_materias: FieldSchema,
    calificaciones: FieldSchema,
    errores_operativos: FieldSchema,
    errores_financieros: FieldSchema,
    error_inscripcion: FieldSchema,
    promesa_venta: FieldSchema,
    retencion_realizada: FieldSchema,
    retencion_aceptada: FieldSchema,
    intencion_cancelacion_manifiesta: FieldSchema,
  }).strict(),
  hechos: z.array(z.object({
    id: z.string().optional(),
    tipo: z.string().min(1),
    valor: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    confianza: ConfidenceSchema,
    evidencia_id: z.string().optional(),
    evidenceId: z.string().optional(),
    pagina: z.number().int().positive().nullable().optional(),
    timestamp: z.string().nullable().optional(),
    texto_citado: z.string().nullable().optional(),
    textoCitado: z.string().nullable().optional(),
  }).strict()),
  visual_facts: VisualFactsSchema.optional(),
}).strict();

export type ValidatedExtractionResult = z.infer<typeof ExtractionResultSchema>;

const STUDENT_FIELDS = ['folio', 'matricula', 'nombre', 'nivel', 'programa', 'canal', 'telefono'];
const REQUEST_FIELDS = ['fecha_inicio', 'fecha_solicitud', 'motivo'];
const INDICATOR_FIELDS = [
  'contacto_efectivo', 'llamadas', 'mensajes', 'ingreso_aula', 'materias_cargadas',
  'falla_carga_materias', 'calificaciones', 'errores_operativos', 'errores_financieros',
  'error_inscripcion', 'promesa_venta', 'retencion_realizada', 'retencion_aceptada',
  'intencion_cancelacion_manifiesta',
];
const AULA_FIELDS = [
  'ingreso_aula', 'ultimo_acceso_curso', 'hora_acceso', 'curso', 'grupo', 'calificacion',
  'actividades_entregadas', 'clics_detectados', 'materias_cargadas', 'seleccion_modalidad',
];
const SIU_FIELDS = [
  'estatus_alumno', 'ultima_sesion', 'fecha_inicio', 'primer_pago', 'proximo_pago_monto',
  'telefono', 'correo', 'calificaciones_registradas',
];
const CONTACTO_FIELDS = ['telefono_registrado', 'correo_registrado', 'medio', 'ultima_interaccion'];

function asField(value: unknown) {
  if (value && typeof value === 'object' && 'valor' in value) return value;
  return {
    valor: value ?? null,
    confianza: value === null || value === undefined || value === '' ? 'BAJA' : 'MEDIA',
    evidencia_id: null,
    pagina: null,
    timestamp: null,
    texto_citado: value === null || value === undefined ? null : String(value),
  };
}

function normalizeFields(container: Record<string, unknown>, fields: string[]) {
  for (const field of fields) container[field] = asField(container[field]);
}

function normalizeExtractionShape(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const data = parsed as Record<string, any>;

  data.tipo_evidencia = asField(data.tipo_evidencia ?? 'DESCONOCIDA');

  data.estudiante = data.estudiante && typeof data.estudiante === 'object' ? data.estudiante : {};
  normalizeFields(data.estudiante, STUDENT_FIELDS);

  data.solicitud = data.solicitud && typeof data.solicitud === 'object' ? data.solicitud : {};
  normalizeFields(data.solicitud, REQUEST_FIELDS);

  data.indicadores = data.indicadores && typeof data.indicadores === 'object' ? data.indicadores : {};
  normalizeFields(data.indicadores, INDICATOR_FIELDS);

  data.hechos = Array.isArray(data.hechos) ? data.hechos : [];

  data.visual_facts = data.visual_facts && typeof data.visual_facts === 'object' ? data.visual_facts : {};
  data.visual_facts.aula_virtual = data.visual_facts.aula_virtual && typeof data.visual_facts.aula_virtual === 'object' ? data.visual_facts.aula_virtual : {};
  normalizeFields(data.visual_facts.aula_virtual, AULA_FIELDS);
  data.visual_facts.siu = data.visual_facts.siu && typeof data.visual_facts.siu === 'object' ? data.visual_facts.siu : {};
  normalizeFields(data.visual_facts.siu, SIU_FIELDS);
  data.visual_facts.contacto = data.visual_facts.contacto && typeof data.visual_facts.contacto === 'object' ? data.visual_facts.contacto : {};
  normalizeFields(data.visual_facts.contacto, CONTACTO_FIELDS);

  return data;
}

export function parseExtractionJson(raw: string): { success: true; data: ValidatedExtractionResult } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'JSON inválido' };
  }

  const forbidden = ['decision', 'dictamen', 'clasificacion', 'reglaAplicable', 'deberiaCancelar'];
  if (parsed && typeof parsed === 'object') {
    for (const key of forbidden) {
      if (key in parsed) return { success: false, error: `Campo prohibido generado por IA: ${key}` };
    }
  }

  const result = ExtractionResultSchema.safeParse(normalizeExtractionShape(parsed));
  if (!result.success) return { success: false, error: result.error.message };
  return { success: true, data: result.data };
}
