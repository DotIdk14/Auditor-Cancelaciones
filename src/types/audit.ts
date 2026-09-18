import { EducationLevel, CallRecord, TranscriptSegment, EffectiveContactResult, EffectiveContactCriterion } from './domain';

export type { EducationLevel, CallRecord, TranscriptSegment, EffectiveContactResult, EffectiveContactCriterion };

export type CaseStatus = 'EN_ANALISIS' | 'PENDIENTE_REVISION' | 'DICTAMINADO' | 'APROBADO' | 'RECHAZADO';

export type DictamenStatus = 'BORRADOR' | 'PENDIENTE_REVISION' | 'APROBADO';

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
  id: string;
  status: CaseStatus;
  statusLabel: string;
  matricula: string;
  studentName: string;
  program: string;
  level: EducationLevel;
  channel: string;
  startDate: string;
  requestDate: string;
  daysFromStart: number;
  workingDaysFromStart: number;
  requestedPolicy: string;
  requestReason: string;
  studentContactNumber: string;
  campaign: string;
  primaryCall: CallRecord;
  secondaryCalls?: CallRecord[];
  evidences: EvidenceItem[];
  timeline: TimelineEvent[];
  dictamen: DictamenData;
  decisionData: import('../lib/decision-engine/types').CaseDecisionData;
}