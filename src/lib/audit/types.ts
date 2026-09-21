import { z } from 'zod';

// ---------------------------------------------------------------------------
// Evidence inventory (what was processed)
// ---------------------------------------------------------------------------

export interface AuditEvidenceItem {
  evidenceId: string;
  nombreArchivo: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  tipo: 'PDF' | 'IMAGE' | 'AUDIO';
  pages?: number;
  durationSeconds?: number;
  /** Pages/segments actually sent to the model */
  pagesSent: number[];
  /** Segmentation info for oversized pages */
  segments?: Array<{ originalPage: number; segmentIndex: number; totalSegments: number }>;
  processingStatus: 'COMPLETADO' | 'ERROR' | 'PARCIAL';
  error?: string;
}

// ---------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------

export type RuleEvaluationStatus =
  | 'CUMPLE'
  | 'NO_CUMPLE'
  | 'NO_ACREDITADO'
  | 'NO_APLICA'
  | 'INCONGRUENCIA';

export interface RuleEvaluation {
  numeral: string;
  title: string;
  status: RuleEvaluationStatus;
  fundamentacion: string;
  evidenceRefs: Array<{ evidenceId: string; page?: number; timestamp?: string }>;
  citasNormativas: string[];
}

// ---------------------------------------------------------------------------
// Inconsistencies / Incidents
// ---------------------------------------------------------------------------

export type InconsistencyType =
  | 'CONTRADICCION_ENTRE_EVIDENCIAS'
  | 'AMBIGUEDAD_NORMATIVA'
  | 'REFERENCIA_EXTERNA_NECESARIA'
  | 'EVIDENCIA_FALTANTE'
  | 'EVIDENCIA_ILEGIBLE'
  | 'PROCESAMIENTO_INCOMPLETO'
  | 'RESULTADO_INCONSISTENTE';

export interface Inconsistency {
  id: string;
  type: InconsistencyType;
  titulo: string;
  descripcion: string;
  evidenceRefs: Array<{ evidenceId: string; page?: number }>;
  normaRefs: string[];
  impacto: 'BLOQUEANTE' | 'RELEVANTE' | 'INFORMATIVO';
  resolucionRequerida?: string;
}

// ---------------------------------------------------------------------------
// Structured audit result (AI output contract)
// ---------------------------------------------------------------------------

export const AuditResultSchema = z.object({
  politica: z.object({
    codigo: z.string(),
    version: z.number(),
    fecha: z.string(),
    sha256: z.string(),
  }),

  ejecucion: z.object({
    modelo: z.string(),
    promptVersion: z.string(),
    fecha: z.string(),
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    duracionMs: z.number().optional(),
  }),

  expediente: z.object({
    folio: z.string().optional(),
    matricula: z.string().optional(),
    nombre: z.string().optional(),
    nivel: z.string().optional(),
    programa: z.string().optional(),
    canal: z.string().optional(),
    telefono: z.string().optional(),
    fechaInicio: z.string().optional(),
    fechaSolicitud: z.string().optional(),
    motivo: z.string().optional(),
  }),

  cobertura: z.array(z.object({
    evidenceId: z.string(),
    nombreArchivo: z.string(),
    paginasEnviadas: z.array(z.number()),
    estado: z.string(),
    error: z.string().optional(),
  })),

  cronologia: z.array(z.object({
    fecha: z.string(),
    evento: z.string(),
    evidenceRefs: z.array(z.string()),
    normaRef: z.string().optional(),
  })),

  hallazgos: z.array(z.object({
    id: z.string(),
    tipo: z.string(),
    descripcion: z.string(),
    confianza: z.enum(['ALTA', 'MEDIA', 'BAJA', 'CONFLICTO']),
    evidenceRefs: z.array(z.string()),
    pagina: z.number().optional(),
    timestamp: z.string().optional(),
  })),

  reglasEvaluadas: z.array(z.object({
    numeral: z.string(),
    title: z.string(),
    status: z.enum(['CUMPLE', 'NO_CUMPLE', 'NO_ACREDITADO', 'NO_APLICA', 'INCONGRUENCIA']),
    fundamentacion: z.string(),
    evidenceRefs: z.array(z.object({
      evidenceId: z.string(),
      page: z.number().optional(),
      timestamp: z.string().optional(),
    })),
    citasNormativas: z.array(z.string()),
  })),

  incidencias: z.array(z.object({
    id: z.string(),
    type: z.enum([
      'CONTRADICCION_ENTRE_EVIDENCIAS',
      'AMBIGUEDAD_NORMATIVA',
      'REFERENCIA_EXTERNA_NECESARIA',
      'EVIDENCIA_FALTANTE',
      'EVIDENCIA_ILEGIBLE',
      'PROCESAMIENTO_INCOMPLETO',
      'RESULTADO_INCONSISTENTE',
    ]),
    titulo: z.string(),
    descripcion: z.string(),
    evidenceRefs: z.array(z.object({
      evidenceId: z.string(),
      page: z.number().optional(),
    })),
    normaRefs: z.array(z.string()),
    impacto: z.enum(['BLOQUEANTE', 'RELEVANTE', 'INFORMATIVO']),
    resolucionRequerida: z.string().optional(),
  })),

  resultado: z.object({
    clasificacion: z.string(),
    causaRaiz: z.string(),
    confianza: z.number().min(0).max(1),
    dictamen: z.string(),
    accionesPrevistas: z.array(z.string()),
    hardBlockers: z.array(z.string()),
  }),
});

export type AuditResult = z.infer<typeof AuditResultSchema>;

// ---------------------------------------------------------------------------
// Full audit execution record
// ---------------------------------------------------------------------------

export interface AuditExecution {
  id: string;
  ticketId?: string;
  evidencias: AuditEvidenceItem[];
  resultado: AuditResult;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Input for the multimodal audit
// ---------------------------------------------------------------------------

export interface MultimodalAuditInput {
  ticketId?: string;
  files: Array<{
    evidenceId: string;
    nombreArchivo: string;
    mimeType: string;
    sizeBytes: number;
    /** File content: either an in-memory buffer or a path on disk (disk storage avoids holding the whole multipart in RAM). */
    buffer?: Buffer;
    path?: string;
  }>;
}
