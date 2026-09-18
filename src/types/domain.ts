export type EducationLevel =
  | 'LICENCIATURA'
  | 'POSGRADO'
  | 'EJECUTIVA'
  | 'EJECUTIVAS'
  | 'LICENCIATURAS_ALIANZAS'
  | 'ALIANZA'
  | 'UNKNOWN';

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