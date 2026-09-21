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

export type EvidenceClassification =
  | 'AULA_PERFIL_USUARIO'
  | 'AULA_BITACORAS'
  | 'AULA_CALIFICACIONES'
  | 'SIU_DASHBOARD'
  | 'SIU_DATOS_PERSONALES'
  | 'I6_CONTACTO'
  | 'WHATSAPP'
  | 'CORREO'
  | 'OTRO'
  | 'DESCONOCIDA';

/**
 * Fase 1 — Modelo de hechos visuales.
 *
 * Las evidencias reales de los casos de cancelación son capturas de pantalla
 * (Aula Virtual, SIU) y PDFs FireShot sin texto seleccionable. Este modelo
 * captura únicamente hechos observables en las plataformas, sin interpretación
 * de política (el motor de decisiones sí interpreta).
 */
export interface AulaVirtualFacts {
  /** Índica si la captura muestra un acceso/examen al aula virtual. */
  ingresoAula: ExtractedField<boolean>;
  /** Fecha del último acceso al curso visible en la captura. */
  ultimoAccesoCurso: ExtractedField<string>;
  /** Hora del último acceso visible en la captura (ej. 21:27). */
  horaAcceso: ExtractedField<string>;
  /** Nombre del curso/asignatura mostrado. */
  curso: ExtractedField<string>;
  /** Grupo o USID mostrado en la cabecera del curso. */
  grupo: ExtractedField<string>;
  /** Calificación numérica visible (ej. 0.40, 8.5). */
  calificacion: ExtractedField<number>;
  /** Número de actividades/entregas registradas en la bitácora. */
  actividadesEntregadas: ExtractedField<number>;
  /** Clics detectados en la bitácora del aula virtual. */
  clicsDetectados: ExtractedField<number>;
  /** Indica si se ven materias/asignaturas cargadas en el aula. */
  materiasCargadas: ExtractedField<boolean>;
  /** Indica si se ve selección de modalidad de evaluación. */
  seleccionModalidad: ExtractedField<boolean>;
}

export interface SiuFacts {
  /** Estatus del alumno visible (ACTIVO, BAJA, etc.). */
  estatusAlumno: ExtractedField<string>;
  /** Fecha de la última sesión en el SIU. */
  ultimaSesion: ExtractedField<string>;
  /** Fecha de inicio de la inscripción visible en la ficha SIU. */
  fechaInicio: ExtractedField<string>;
  /** Fecha del primer pago visible. */
  primerPago: ExtractedField<string>;
  /** Monto del próximo pago visible (ej. 1035.00). */
  proximoPagoMonto: ExtractedField<number>;
  /** Teléfono registrado en SIU. */
  telefono: ExtractedField<string>;
  /** Correo registrado en SIU. */
  correo: ExtractedField<string>;
  /** Indica si la ficha SIU muestra calificaciones asentadas. */
  calificacionesRegistradas: ExtractedField<boolean>;
}

export interface ContactoFacts {
  /** Teléfono registrado para contacto. */
  telefonoRegistrado: ExtractedField<string>;
  /** Correo registrado para contacto. */
  correoRegistrado: ExtractedField<string>;
  /** Medio de contacto observado (WHATSAPP, EMAIL, SMS, OTRO). */
  medio: ExtractedField<string>;
  /** Fecha de la última interacción de contacto observable. */
  ultimaInteraccion: ExtractedField<string>;
}

export interface VisualFacts {
  aulaVirtual: AulaVirtualFacts;
  siu: SiuFacts;
  contacto: ContactoFacts;
}

export interface DraftCase {
  student: StudentData;
  request: RequestData;
  academic: AcademicIndicators;
  /** Fase 1 — hechos visuales extraídos de capturas/PDFs de plataformas. */
  visualFacts?: VisualFacts;
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
  /** Fase 2 — clasificación automática del tipo de evidencia. */
  tipoEvidencia?: EvidenceClassification;
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
  /** Fase 2 — clasificación automática de la evidencia. */
  tipoEvidencia?: EvidenceClassification;
}
