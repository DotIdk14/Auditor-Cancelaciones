export type FieldConfidence = 'ALTA' | 'MEDIA' | 'BAJA' | 'CONFLICTO';

export interface ExtractedField<T = string> {
  valor: T | null;
  confianza: FieldConfidence;
  evidenciaId: string | null;
  pagina?: number;
  timestamp?: string;
  textoCitado?: string;
  conflicto?: string;
}

export interface StudentData {
  folio: ExtractedField;
  matricula: ExtractedField;
  nombre: ExtractedField;
  nivel: ExtractedField<'LICENCIATURA' | 'MAESTRIA' | 'DOCTORADO' | 'POSGRADO'>;
  programa: ExtractedField;
  canal: ExtractedField;
  telefono: ExtractedField;
}

export interface RequestData {
  fechaInicio: ExtractedField;
  fechaSolicitud: ExtractedField;
  motivo: ExtractedField;
}

export interface AcademicIndicators {
  contactoEfectivo: ExtractedField<boolean>;
  llamadas: ExtractedField<number>;
  mensajes: ExtractedField<number>;
  ingresoAula: ExtractedField<boolean>;
  materiasCargadas: ExtractedField<boolean>;
  fallaCargaMaterias: ExtractedField<boolean>;
  calificaciones: ExtractedField<boolean>;
  erroresOperativos: ExtractedField<boolean>;
  erroresFinancieros: ExtractedField<boolean>;
  errorInscripcion: ExtractedField<boolean>;
  promesaVenta: ExtractedField<boolean>;
  retencionRealizada: ExtractedField<boolean>;
  retencionAceptada: ExtractedField<boolean>;
  intencionCancelacionManifiesta: ExtractedField<boolean>;
}

export interface DraftCase {
  student: StudentData;
  request: RequestData;
  academic: AcademicIndicators;
  evidencias: EvidenceDraft[];
  conflictos: ConflictItem[];
  completitud: number;
}

export interface EvidenceDraft {
  id: string;
  file: File;
  nombreArchivo: string;
  tipo: 'PDF' | 'IMAGE' | 'AUDIO';
  fuente: string;
  estado: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';
  extraccion?: {
    textoExtraido?: string;
    resumen?: string;
    hechos?: ExtractedFact[];
    transcriptSegments?: { speaker: string; start: number; end: number; text: string }[];
  };
  error?: string;
}

export interface ExtractedFact {
  id: string;
  tipo: string;
  valor: string;
  confianza: FieldConfidence;
  evidenciaId: string;
  pagina?: number;
  timestamp?: string;
  textoCitado?: string;
}

export interface ConflictItem {
  campo: string;
  valores: { valor: any; evidenciaId: string; confianza: FieldConfidence }[];
  descripcion: string;
}

export interface ProcessResult {
  draft: DraftCase;
  evidenceResults: EvidenceProcessResult[];
  usage?: {
    llmCalls: number;
    inputTokens: number;
    outputTokens: number;
    visionCalls: number;
    fallbackCalls: number;
  };
}

export interface EvidenceProcessResult {
  evidenceId: string;
  nombreArchivo: string;
  success: boolean;
  error?: string;
  extractedFields: Record<string, any>;
}
