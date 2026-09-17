export type EducationLevel = 'LICENCIATURA' | 'POSGRADO' | 'EJECUTIVAS' | 'LICENCIATURAS_ALIANZAS';

export type CaseStatus = 'EN_ANALISIS' | 'PENDIENTE_REVISION' | 'DICTAMINADO' | 'APROBADO' | 'RECHAZADO';

export type DictamenStatus = 'BORRADOR' | 'PENDIENTE_REVISION' | 'APROBADO';

export interface EffectiveContactCriterion {
  criterio: string;
  cumplido: boolean;
  evidencia: string;
  timestampRef?: string;
}

export interface EffectiveContactResult {
  efectivo: boolean;
  criterios: EffectiveContactCriterion[];
  observaciones?: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: 'advisor' | 'customer';
  speakerName: string;
  start: string;
  end: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated';
  highlightTags?: string[];
  keyMoment?: {
    type: 'contact_criteria' | 'cancellation_intent' | 'operational_complaint' | 'sales_promise';
    label: string;
  };
}

export interface CallRecord {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  durationSeconds: number;
  status: 'TRANSCRIPCION_COMPLETADA' | 'EN_PROCESO' | 'FALLIDA';
  campaign: string;
  phoneNumber: string;
  intentsRatio: string;
  audioUrl?: string;
  transcript: TranscriptSegment[];
  sentiment: 'Positivo' | 'Neutro' | 'Negativo' | 'Conflictivo';
  detectedIntentions: string[];
  keyMoments: Array<{
    timestamp: string;
    label: string;
    type: 'request' | 'error' | 'contact' | 'warning';
  }>;
  effectiveContact: EffectiveContactResult;
}

export type EvidenceSource = 
  | 'Flokzu' 
  | 'SIU' 
  | 'I6' 
  | 'Aula Virtual' 
  | 'WhatsApp' 
  | 'Correo' 
  | 'Capturas' 
  | 'Documentos' 
  | 'Otros';

export type EvidenceType = 'image' | 'pdf' | 'audio' | 'document' | 'system_record';

export type EvidenceStatus = 'DISPONIBLE' | 'PENDIENTE' | 'ERROR' | 'REQUERIDA';

export type EvidenceItem = {
  id: string;
  code: string;
  name: string;
  source: EvidenceSource;
  type: EvidenceType;
  status: EvidenceStatus;
  statusLabel?: string;
  date: string;
  description: string;
  fileSize?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  previewType: 'image' | 'pdf_view' | 'siu_table' | 'i6_log' | 'aula_log' | 'doc_view';
  previewData?: Record<string, any>;
};

export type AuditEvidence = EvidenceItem;

export interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
  actor: string;
  system: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface DictamenData {
  classification: string;
  confidence: number;
  rootCause: string;
  text: string;
  status: DictamenStatus;
  approvedBy?: string;
  approvedAt?: string;
  modifiedByAuditor: boolean;
  reviewerNotes?: string;
}

export interface AuditCase {
  id: string; // CAVE-30274
  status: CaseStatus;
  statusLabel: string;
  matricula: string;
  studentName: string;
  program: string;
  level: EducationLevel;
  channel: string;
  startDate: string; // 31/08/2026
  requestDate: string; // 07/09/2026
  daysFromStart: number; // 7 calendar days
  workingDaysFromStart: number; // 5 working days
  requestedPolicy: string;
  requestReason: string;
  studentContactNumber: string;
  campaign: string;
  primaryCall: CallRecord;
  secondaryCalls?: CallRecord[];
  evidences: EvidenceItem[];
  timeline: TimelineEvent[];
  dictamen: DictamenData;
  // Raw decision parameters for the engine
  decisionData: import('../lib/decision-engine/types').CaseDecisionData;
}
