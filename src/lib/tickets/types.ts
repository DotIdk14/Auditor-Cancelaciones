export type TicketStatus =
  | 'BORRADOR'
  | 'EVIDENCIAS_PENDIENTES'
  | 'PROCESANDO'
  | 'REQUIERE_REVISION'
  | 'DICTAMEN_PROPUESTO'
  | 'PDF_EMITIDO'
  | 'CERRADO';

export type TicketResultadoPrincipal =
  | 'CANCELACION_VENTA'
  | 'BAJA'
  | 'NO_APLICA';

export type TicketSubtipo =
  | 'ILOCALIZABLE'
  | 'OPERATIVA'
  | 'PROMESA_VENTA_NO_CUMPLIDA'
  | 'ERROR_INSCRIPCION'
  | 'SOLICITUD_ESTUDIANTE'
  | 'MYSTERY_SHOPPER'
  | 'CAMBIO_CICLO'
  | 'CALIFICACIONES'
  | 'SIN_CLASIFICAR';

export type EvidenceSource =
  | 'FLOKZU'
  | 'SIU'
  | 'I6'
  | 'AULA_VIRTUAL'
  | 'WHATSAPP'
  | 'CORREO'
  | 'PDF'
  | 'CAPTURA'
  | 'AUDIO'
  | 'OTRO';

export type EvidenceType =
  | 'IMAGE'
  | 'PDF'
  | 'AUDIO'
  | 'DOC'
  | 'TRANSCRIPT'
  | 'SYSTEM_RECORD';

export interface ExtractedFact {
  id: string;
  evidenceId: string;
  tipo:
    | 'CONTACTO_EFECTIVO'
    | 'INTENTO_CONTACTO'
    | 'INGRESO_AULA'
    | 'SIN_INGRESO_AULA'
    | 'CALIFICACION'
    | 'SIN_CALIFICACION'
    | 'SOLICITUD_CANCELACION'
    | 'PROMESA_VENTA'
    | 'ERROR_OPERATIVO'
    | 'PAGO'
    | 'OTRO';
  valor: string;
  confianza: number;
  referencia: {
    pagina?: number;
    timestamp?: string;
    textoCitado?: string;
  };
}
export interface TranscriptSegment {  id: string;  evidenceId: string;  speaker: "advisor" | "customer";  speakerName: string;  start: string;  end: string;  startSeconds: number;  endSeconds: number;  text: string;}

export interface EvidenceItem {
  id: string;
  ticketId: string;
  nombreArchivo: string;
  tipo: EvidenceType;
  fuente: EvidenceSource;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  fechaEvidencia?: string;
  fechaCarga: string;
  ordenCronologico: number;
  transcript?: TranscriptSegment[];
  estadoLectura: 'PENDIENTE' | 'LEIDA' | 'ILEGIBLE' | 'DUPLICADA' | 'CONTRADICTORIA';
  extraccion?: {
    textoExtraido?: string;
    resumen?: string;
    fechasDetectadas?: string[];
    nombresDetectados?: string[];
    matriculasDetectadas?: string[];
    telefonosDetectados?: string[];
    hechosDetectados?: ExtractedFact[];
  };
}

export type RuleStatus =
  | 'APLICADA'
  | 'DESCARTADA'
  | 'BLOQUEANTE'
  | 'CONFLICTO'
  | 'PENDIENTE_EVIDENCIA'
  | 'PENDIENTE_ANEXO';

export interface RuleEvaluation {
  id: string;
  ticketId: string;
  codigoPolitica: string;
  nombre: string;
  versionPolitica: string;
  status: RuleStatus;
  resultadoSugerido?: TicketResultadoPrincipal;
  subtipoSugerido?: TicketSubtipo;
  razon: string;
  evidenciaIds: string[];
  hechosIds: string[];
  bloqueaAutomatizacion: boolean;
}

export interface TicketException {
  id: string;
  ticketId: string;
  campoModificado: string;
  valorAnterior: string;
  valorNuevo: string;
  motivo: string;
  evidenciaIds: string[];
  createdAt: string;
}

export interface GeneratedPdf {
  id: string;
  ticketId: string;
  version: number;
  storagePath: string;
  sha256: string;
  generadoAutomaticamente: boolean;
  generadoTrasExcepcion: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  folio: string;
  status: TicketStatus;
  estudiante: {
    nombre?: string;
    matricula?: string;
    correo?: string;
    telefono?: string;
    programa?: string;
    canal?: string;
  };
  fechas: {
    fechaCreacion?: string;
    fechaInicioCiclo?: string;
    fechaSolicitudTicket?: string;
    fechaDecision?: string;
    fechaAsignadoDictaminar?: string;
    fechaDictamenAplicado?: string;
  };
  solicitud: {
    politicaSolicitada?: string;
    motivo?: string;
    descripcion?: string;
    primerPago?: boolean;
  };
  resultado: {
    principal?: TicketResultadoPrincipal;
    subtipo?: TicketSubtipo;
    confianza?: number;
    automatico: boolean;
    requiereRevision: boolean;
    motivoRevision?: string[];
    textoDictamen?: string;
  };
  comentarios: {
    backOffice?: string;
    helpDesk?: string;
    ser?: string;
    finanzas?: string;
    auditor?: string;
  };
  evidencias: EvidenceItem[];
  reglas: RuleEvaluation[];
  excepciones: TicketException[];
  pdfsEmitidos: GeneratedPdf[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInitialTicketInput {
  folio: string;
  createdBy: string;
  now?: string;
}
