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

export const ExtractionResultSchema = z.object({
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
}).strict();

export type ValidatedExtractionResult = z.infer<typeof ExtractionResultSchema>;

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

  const result = ExtractionResultSchema.safeParse(parsed);
  if (!result.success) return { success: false, error: result.error.message };
  return { success: true, data: result.data };
}
