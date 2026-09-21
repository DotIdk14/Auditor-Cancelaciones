import { CallRecord, EducationLevel, TranscriptSegment, EffectiveContactResult } from '../../types/domain';

export type CancellationClassification =
  | 'CANCELACION_VENTA'
  | 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE'
  | 'CANCELACION_VENTA_ILOCALIZABLE'
  | 'CANCELACION_VENTA_OPERATIVA'
  | 'CANCELACION_VENTA_PROMESA_NO_CUMPLIDA'
  | 'CANCELACION_DE_MATRICULA'
  | 'BAJA'
  | 'REQUIERE_REVISION';

// Backwards compatibility alias
export type CancellationType =
  | 'CANCELACION_VENTA_OPERATIVA'
  | 'CANCELACION_VENTA_ILOCALIZABLE'
  | 'CANCELACION_VENTA_REGULAR'
  | 'CANCELACION_VENTA_PROMESA'
  | 'CANCELACION_VENTA_AJUSTE_NO_APLICADO'
  | 'CANCELACION_MATRICULA_MYSTERY'
  | 'BAJA_POR_CALIFICACIONES'
  | 'BAJA_ACADEMICA_EXTEMPORANEA'
  | 'BAJA_RETENCION_NO_ACEPTADA'
  | 'REQUIERE_REVISION_MANUAL'
  | CancellationClassification;

export type OperationalSubtype =
  | 'OP_DECISION_35'
  | 'OP_FINANZAS'
  | 'OP_COBRANZA'
  | 'OP_FALTA_CANALIZACION'
  | 'OP_ERROR_SEGUIMIENTO'
  | 'OP_VALIDACION_PAQUETE'
  | 'OP_CARGA_MATERIAS'
  | 'OP_OTRO';

export type SalesPromiseStatus =
  | 'NOT_DETECTED'
  | 'SUSPECTED'
  | 'SUPPORTED'
  | 'CONFIRMED';

export interface WrittenInteraction {
  id: string;
  date: string;
  time?: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'TICKET' | 'OTHER';
  received: boolean;
  replied?: boolean;
  summary?: string;
}

export interface EffectiveContact {
  contactId: string;
  date: string;
  isEffective: boolean;
  titularConfirmed: boolean;
  purposeExplained: boolean;
  cycleInfoProvided: boolean;
  institutionIdentified: boolean;
  personalDataConfirmed: boolean;
  decisionManifested: boolean;
  notes?: string;
}

export interface CaseStudent {
  name: string;
  enrollmentId: string;
  program: string;
  educationLevel: EducationLevel;
}

export interface CaseDates {
  creationDate?: string;
  startDate?: string;
  requestDate?: string;
  decision35Date?: string;
  decision53Date?: string;
}

export interface CaseRequest {
  wantsToContinue: boolean;
  explicitCancellationRequest: boolean;
  reason?: string;
  requestType?: 'REQUEST_EXPLICIT' | 'REQUEST_INFERRED';
}

export interface CaseAcademic {
  enteredVirtualClassroom: boolean;
  selectedEvaluationMethod?: boolean;
  hasActivities?: boolean;
  hasGrades?: boolean;
  activeSubjects?: number;
  enteredAnyActiveSubject?: boolean;
  participatedInForum?: boolean;
  /** Fase 5 — clics detectados en bitácora del aula virtual (hecho visual). */
  clicksDetected?: boolean;
  /** Fase 5 — acceso reciente al curso visible en captura (hecho visual). */
  recentAccess?: boolean;
}

export interface CaseContacts {
  calls: CallRecord[];
  writtenInteractions: WrittenInteraction[];
  effectiveContacts: EffectiveContact[];
}

export interface CaseOperational {
  operationalError?: boolean;
  financialError?: boolean;
  collectionsError?: boolean;
  enrollmentError?: boolean;
  incorrectProgram?: boolean;
  incorrectPackage?: boolean;
  incorrectStartCycle?: boolean;
  incorrectCampus?: boolean;
  missingAdjustment?: boolean;
  missingPromotion?: boolean;
  paymentNotReflected?: boolean;
  materialLoadError?: boolean;
  areaFailedToChannel?: boolean;
  operationalSubType?: OperationalSubtype;
  studentUpsetByError?: boolean;
  causalLinkWithCancellation?: boolean;
}

export interface CaseRetention {
  attempted?: boolean;
  successful?: boolean;
  acceptedBenefit?: boolean;
}

export interface CaseSalesPromise {
  status?: SalesPromiseStatus;
  suspected?: boolean;
  proven?: boolean;
  advisorResponsible?: boolean;
  validationError?: boolean;
  evidenceText?: string;
}

export interface CaseCycleChange {
  requested?: boolean;
  requestedBeforeStart?: boolean;
  managedBy?: 'MATRICULA' | 'EXITO_ESTUDIANTIL' | 'OTHER';
  newCycleStarted?: boolean;
  studentEnteredNewCycle?: boolean;
  isRevalidation?: boolean;
  isRetentionStrategyAtStart?: boolean;
}

export interface Evidence {
  id: string;
  type: string;
  title: string;
  source: string;
  date?: string;
  relevance?: string;
  url?: string;
  description?: string;
  data?: any;
}

export interface CancellationCase {
  ticketId: string;
  student: CaseStudent;
  dates: CaseDates;
  request: CaseRequest;
  academic: CaseAcademic;
  contacts: CaseContacts;
  operational: CaseOperational;
  retention: CaseRetention;
  salesPromise: CaseSalesPromise;
  cycleChange: CaseCycleChange;
  evidence: Evidence[];
  channel?: string;
  rawDecisionData?: CaseDecisionData;
}

// Legacy structure for backwards compatibility with sandbox and existing UI
export interface CaseDecisionData {
  fechaInicio: string;
  fechaSolicitud: string;
  diasHabilesDesdeInicio?: number;
  semanasDesdeInicio?: number;
  nivelEducativo: EducationLevel;
  programa: string;
  estatusAlumno: string;
  canalVenta?: string;
  decision35?: boolean;
  decision35EnTiempo?: boolean;
  decision53?: boolean;
  invasionCiclo?: boolean;
  contactoEfectivo: boolean;
  contactoEfectivoDetalle?: any;
  llamadas: number;
  llamadasValidasPorHorario?: boolean;
  llamadasDistribuidasSemanas?: boolean;
  interaccionesEscritas: number;
  ingresoAula: boolean;
  ingresoAulaValidoPosgrado?: boolean;
  seleccionModalidad: boolean;
  actividadesEntregadas?: boolean;
  calificaciones: boolean;
  calificacionesDetalle?: string;
  /** Fase 1 — fecha del último acceso al curso visible en Aula Virtual (YYYY-MM-DD). */
  ultimoAccesoCurso?: string;
  /** Fase 1 — clics detectados en la bitácora del aula virtual. */
  clicsDetectados?: number;
  /** Fase 1 — cantidad de actividades/entregas visibles. */
  cantidadActividadesEntregadas?: number;
  /** Fase 1 — calificación numérica visible en la captura (ej. 0.40). */
  calificacionVisible?: number;
  materiasCargadas: boolean;
  fallaCargaMaterias?: boolean;
  erroresAdministrativos: boolean;
  erroresFinancieros: boolean;
  errorInscripcion: boolean;
  errorInscripcionTipo?: 'programa' | 'paquete' | 'ciclo' | 'campus' | 'ninguno';
  promesaVenta: boolean;
  promesaVentaEvidencia?: string;
  promesaVentaEstatus?: SalesPromiseStatus;
  speechConvalidacionLatamOmitido?: boolean;
  solicitudAjuste: boolean;
  ajusteDentroDe20Dias?: boolean;
  ajusteRealizado: boolean;
  contactoConExitoEstudiantil: boolean;
  areaOperativaCanalizoAExito?: boolean;
  retencionRealizada: boolean;
  retencionAceptada?: boolean;
  motivoSolicitud: string;
  intencionCancelacionManifiesta?: boolean;
  frasesDetectadas?: string[];
  cambioCicloGestionado?: 'antes_inicio' | 'despues_inicio' | 'ninguno';
  cambioCicloReincidenteNoIngreso?: boolean;
  cambioCicloRevalidacion?: boolean;
  mysteryShopper?: boolean;
  evidences?: Evidence[];
}

export interface AppliedRule {
  id: string;
  priority: number;
  title: string;
  article: string;
  description: string;
  evidenceSource: string[];
  verdictContribution: string;
  status: 'CUMPLIDA' | 'DETERMINANTE';
}

export interface RejectedRule {
  id: string;
  priority: number;
  title: string;
  article: string;
  reason: string;
  missingConditions: string[];
}

export interface RuleConflict {
  ruleA: {
    name: string;
    classification: CancellationClassification | string;
    priority: number;
    fundamento: string;
  };
  ruleB: {
    name: string;
    classification: CancellationClassification | string;
    priority: number;
    fundamento: string;
  };
  resolution: string;
  selectedClassification: CancellationClassification;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  fulfilled: boolean;
  determinant: boolean;
  priority: number;
  article: string;
  explanation: string;
  targetClassification?: CancellationClassification;
  targetRootCause?: string;
  requiredEvidence: string[];
  evidenceReferences: string[];
  missingEvidence: string[];
  inconsistencies?: string[];
  hardBlocker?: string;
}

export interface DecisionRule {
  id: string;
  name: string;
  priority: number;
  article: string;
  evaluate(caseData: CancellationCase): RuleEvaluationResult;
  requiredEvidence(): string[];
}

export interface DecisionResult {
  classification: CancellationClassification;
  status: 'PROPOSED' | 'DICTAMINADO' | 'REQUIERE_REVISION';
  confidence: number;
  rootCause: string;
  hardBlockers: string[];
  appliedRules: AppliedRule[];
  rejectedRules: RejectedRule[];
  missingEvidence: string[];
  inconsistencies: string[];
  reasoning: string[];
  evidenceReferences: string[];
  conflicts?: RuleConflict[];

  // Aliases for Spanish/UI compatibility
  reglasAplicadas?: AppliedRule[];
  reglasDescartadas?: RejectedRule[];
  conflictos?: RuleConflict[];

  // Compatibility fields for existing UI components
  tipo?: string;
  classificationName?: string;
  causaRaiz?: string;
  dictamenSugerido?: string;
  politicaArticulo?: string;
  prioridadRegla?: number;
  evidenciasNecesarias?: string[];
  analizadoEn?: string;
}
