import { DecisionResult } from '../decision-engine/types';

export interface TicketRow {
  id: string;
  folio: string;
  status: string;
  estudiante: Record<string, any>;
  fechas: Record<string, any>;
  solicitud: Record<string, any>;
  resultado: Record<string, any>;
  comentarios: Record<string, any>;
  decision_data: Record<string, any> | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceRow {
  id: string;
  ticket_id: string;
  nombre_archivo: string;
  tipo: string;
  fuente: string;
  storage_key: string | null;
  storage_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  sha256: string | null;
  fecha_evidencia: string | null;
  fecha_carga: string;
  orden_cronologico: number | null;
  estado_lectura: string;
  extraccion: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegmentRow {
  id: string;
  evidence_id: string;
  speaker: string | null;
  speaker_name: string | null;
  start_time: string | null;
  end_time: string | null;
  start_seconds: number | null;
  end_seconds: number | null;
  text: string;
  sentiment: string | null;
  key_moment: Record<string, any> | null;
  orden: number;
  created_at: string;
}

export interface ExtractedFactRow {
  id: string;
  evidence_id: string;
  tipo: string;
  valor: string | null;
  confianza: string;
  pagina: number | null;
  timestamp_ref: string | null;
  texto_citado: string | null;
  extra: Record<string, any> | null;
  created_at: string;
}

export interface DecisionRunRow {
  id: string;
  ticket_id: string;
  input: Record<string, any>;
  output: Record<string, any>;
  classification: string | null;
  classification_name: string | null;
  confidence: number | null;
  root_cause: string | null;
  status: string | null;
  hard_blockers: string[];
  missing_evidence: string[];
  inconsistencies: string[];
  dictamen_sugerido: string | null;
  politica_articulo: string | null;
  engine_version: string | null;
  is_current: boolean;
  created_by: string | null;
  run_at: string;
}

export interface RuleEvaluationRow {
  id: string;
  decision_run_id: string;
  rule_id: string | null;
  rule_name: string | null;
  rule_priority: number | null;
  article: string | null;
  description: string | null;
  status: string;
  reason: string | null;
  suggested_classification: string | null;
  suggested_root_cause: string | null;
  confidence_impact: number | null;
  missing_evidence: string[];
  evidence_ids: string[];
  orden: number;
  created_at: string;
}

export interface DictamenVersionRow {
  id: string;
  ticket_id: string;
  version: number;
  text: string;
  status: string;
  classification: string | null;
  confidence: number | null;
  root_cause: string | null;
  article: string | null;
  approved_by: string | null;
  approved_at: string | null;
  reviewer_notes: string | null;
  modified_by_auditor: boolean;
  created_by: string | null;
  created_at: string;
}

export interface GeneratedPdfRow {
  id: string;
  ticket_id: string;
  version: number | null;
  storage_key: string | null;
  storage_url: string | null;
  sha256: string | null;
  generated_automatic: boolean;
  generated_after_exception: boolean;
  created_at: string;
}

export interface AuditEventRow {
  id: string;
  ticket_id: string;
  event_type: string;
  actor: string | null;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
  description: string | null;
  created_at: string;
}

export interface TicketSnapshot {
  ticket: TicketRow;
  evidences: EvidenceRow[];
  transcripts: TranscriptSegmentRow[];
  facts: ExtractedFactRow[];
  decisionRun: (DecisionRunRow & { rules: RuleEvaluationRow[] }) | null;
  dictamenVersions: DictamenVersionRow[];
  pdfs: GeneratedPdfRow[];
  events: AuditEventRow[];
}

export interface CreateTicketInput {
  folio: string;
  status?: string;
  estudiante?: Record<string, any>;
  fechas?: Record<string, any>;
  solicitud?: Record<string, any>;
  resultado?: Record<string, any>;
  comentarios?: Record<string, any>;
  decision_data?: Record<string, any> | null;
  created_by?: string | null;
}

export interface SaveDecisionRunInput {
  ticketId: string;
  input: Record<string, any>;
  output: DecisionResult;
  engineVersion?: string;
}

export interface SaveDictamenInput {
  ticketId: string;
  text: string;
  status: string;
  classification?: string | null;
  confidence?: number | null;
  rootCause?: string | null;
  article?: string | null;
  reviewerNotes?: string | null;
  modifiedByAuditor?: boolean;
  createdBy?: string | null;
}