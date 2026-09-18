import { EducationLevel } from '../../types/domain';
import type { CaseDecisionData } from '../decision-engine/types';
import {
  AuditCase,
  CaseStatus,
  DictamenData,
  EvidenceItem,
  EvidenceSource,
  EvidenceStatus,
  TimelineEvent,
} from '../../types/audit';
import { CallRecord } from '../../types/domain';
import { CreateTicketInput, DecisionRunRow, EvidenceRow, TicketSnapshot } from './types';
import { evidenceFileUrl } from './persist-api';

const EDUCATION_LEVELS: EducationLevel[] = ['LICENCIATURA', 'POSGRADO', 'EJECUTIVA', 'ALIANZA', 'UNKNOWN'];

function validLevel(value: unknown): EducationLevel {
  const candidate = String(value ?? '').toUpperCase();
  return (EDUCATION_LEVELS as string[]).includes(candidate) ? (candidate as EducationLevel) : 'LICENCIATURA';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDisplayDate(value?: string | null): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return value.split('T')[0].split('-').reverse().join('/');
}

function formatDisplayDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDisplayDate(value.split('T')[0]);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoDate(value?: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (year.length === 4) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return value;
}

export function dbStatusToUi(status: string): CaseStatus {
  switch (status) {
    case 'CERRADO':
    case 'APROBADO':
      return 'APROBADO';
    case 'DICTAMINADO':
      return 'DICTAMINADO';
    case 'PENDIENTE_REVISION':
    case 'DICTAMEN_PROPUESTO':
      return 'PENDIENTE_REVISION';
    case 'RECHAZADO':
      return 'RECHAZADO';
    case 'BORRADOR':
    case 'EN_ANALISIS':
    default:
      return 'EN_ANALISIS';
  }
}

export function uiStatusToDb(status: CaseStatus): string {
  switch (status) {
    case 'APROBADO':
      return 'APROBADO';
    case 'DICTAMINADO':
      return 'DICTAMINADO';
    case 'PENDIENTE_REVISION':
      return 'PENDIENTE_REVISION';
    case 'RECHAZADO':
      return 'RECHAZADO';
    default:
      return 'EN_ANALISIS';
  }
}

export const SOURCE_TO_FUENTE: Record<EvidenceSource, string> = {
  Flokzu: 'FLOKZU',
  SIU: 'SIU',
  I6: 'I6',
  'Aula Virtual': 'AULA_VIRTUAL',
  WhatsApp: 'WHATSAPP',
  Correo: 'CORREO',
  Capturas: 'CAPTURA',
  Documentos: 'DOCUMENTO',
  Otros: 'OTRO',
};

const FUENTE_TO_SOURCE: Record<string, EvidenceSource> = {
  FLOKZU: 'Flokzu',
  SIU: 'SIU',
  I6: 'I6',
  AULA_VIRTUAL: 'Aula Virtual',
  WHATSAPP: 'WhatsApp',
  CORREO: 'Correo',
  CAPTURA: 'Capturas',
  CAPTURAS: 'Capturas',
  DOCUMENTO: 'Documentos',
  DOCUMENTOS: 'Documentos',
  OTRO: 'Otros',
  OTROS: 'Otros',
};

export function fuenteToSource(fuente?: string | null): EvidenceSource {
  if (!fuente) return 'Otros';
  return FUENTE_TO_SOURCE[fuente.toUpperCase()] ?? 'Otros';
}

export function evidenceRowToItem(row: EvidenceRow, backendId: string): EvidenceItem {
  const lowerName = row.nombre_archivo.toLowerCase();
  const isImage =
    row.tipo === 'IMAGE' || (row.mime_type ?? '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(lowerName);
  const isPdf = row.tipo === 'PDF' || row.mime_type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isAudio = row.tipo === 'AUDIO' || (row.mime_type ?? '').startsWith('audio/') || /\.(mp3|wav|m4a|ogg|opus)$/i.test(lowerName);
  const type: EvidenceItem['type'] = isAudio ? 'audio' : isPdf ? 'pdf' : isImage ? 'image' : 'document';

  const estadoLectura = String(row.estado_lectura ?? 'DISPONIBLE');
  const status: EvidenceStatus =
    estadoLectura === 'PENDIENTE' ? 'PENDIENTE' : estadoLectura === 'ERROR' ? 'ERROR' : 'DISPONIBLE';

  return {
    id: row.id,
    code: `EVID-${row.id.slice(0, 6).toUpperCase()}`,
    name: row.nombre_archivo,
    source: fuenteToSource(row.fuente),
    type,
    status,
    statusLabel: status === 'PENDIENTE' ? 'Pendiente de lectura' : 'Disponible',
    date: formatDisplayDateTime(row.fecha_evidencia ?? row.fecha_carga ?? row.created_at),
    description: typeof row.extraccion?.descripcion === 'string' ? row.extraccion.descripcion : 'Evidencia del expediente',
    fileSize: row.size_bytes ? formatBytes(row.size_bytes) : undefined,
    fileUrl: row.storage_key ? evidenceFileUrl(backendId, row.id) : undefined,
    previewType: isAudio ? 'doc_view' : isPdf ? 'pdf_view' : isImage ? 'image' : 'doc_view',
    previewData: {
      ...(row.extraccion ?? {}),
      nombreArchivo: row.nombre_archivo,
      tipoMIME: row.mime_type,
      fechaCarga: row.fecha_carga,
      origen: row.fuente,
      casoAsociado: backendId,
      tamano: row.size_bytes ? formatBytes(row.size_bytes) : '—',
      sha256: row.sha256,
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EVENT_LABELS: Record<string, string> = {
  TICKET_CREADO: 'Expediente creado',
  EVIDENCIA_CARGADA: 'Evidencia cargada',
  DECISION_GENERADA: 'Decisión generada',
  DICTAMEN_GUARDADO: 'Dictamen guardado',
  DICTAMEN_APROBADO: 'Dictamen aprobado',
};

function eventTypeLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

function eventToTimeline(e: { id: string; event_type: string; actor: string | null; description: string | null; created_at: string }): TimelineEvent {
  const created = new Date(e.created_at);
  return {
    id: e.id,
    date: formatDisplayDate(e.created_at),
    time: Number.isNaN(created.getTime()) ? '' : `${pad(created.getHours())}:${pad(created.getMinutes())}`,
    title: eventTypeLabel(e.event_type),
    description: e.description ?? '',
    actor: e.actor ?? 'Sistema',
    system: 'InsForge',
    type: e.event_type === 'DICTAMEN_APROBADO' ? 'success' : e.event_type === 'DECISION_GENERADA' ? 'info' : 'info',
  };
}

function placeholderCall(decisionData: CaseDecisionData, displayId: string): CallRecord {
  return {
    id: `CALL-${displayId}`,
    title: `Llamada de validación – ${formatDisplayDate(decisionData.fechaSolicitud)}`,
    duration: '00:00',
    durationSeconds: 0,
    date: formatDisplayDate(decisionData.fechaSolicitud),
    time: '12:00 h',
    status: 'EN_PROCESO',
    campaign: 'AUDITORIA_BACKEND',
    phoneNumber: 'Por capturar',
    intentsRatio: 'N/A',
    sentiment: 'Neutro',
    detectedIntentions: [],
    keyMoments: [],
    effectiveContact: { efectivo: false, criterios: [] },
    transcript: [],
  };
}

export function defaultValueForCaseDecisionData(partial: Record<string, unknown> = {}): CaseDecisionData {
  return {
    fechaInicio: toIsoDate(String(partial.fechaInicio ?? '')),
    fechaSolicitud: toIsoDate(String(partial.fechaSolicitud ?? '')),
    nivelEducativo: validLevel(partial.nivelEducativo),
    programa: String(partial.programa ?? ''),
    estatusAlumno: String(partial.estatusAlumno ?? 'En proceso de auditoría'),
    canalVenta: partial.canalVenta ? String(partial.canalVenta) : 'DIGITAL_FACEBOOK_ADS',
    contactoEfectivo: Boolean(partial.contactoEfectivo ?? false),
    llamadas: Number(partial.llamadas ?? 0),
    llamadasValidasPorHorario: Boolean(partial.llamadasValidasPorHorario),
    interaccionesEscritas: Number(partial.interaccionesEscritas ?? 0),
    ingresoAula: Boolean(partial.ingresoAula ?? false),
    seleccionModalidad: Boolean(partial.seleccionModalidad ?? false),
    calificaciones: Boolean(partial.calificaciones ?? false),
    materiasCargadas: Boolean(partial.materiasCargadas ?? false),
    fallaCargaMaterias: Boolean(partial.fallaCargaMaterias ?? false),
    erroresAdministrativos: Boolean(partial.erroresAdministrativos ?? false),
    erroresFinancieros: Boolean(partial.erroresFinancieros ?? false),
    errorInscripcion: Boolean(partial.errorInscripcion ?? false),
    promesaVenta: Boolean(partial.promesaVenta ?? false),
    solicitudAjuste: Boolean(partial.solicitudAjuste ?? false),
    ajusteDentroDe20Dias: partial.ajusteDentroDe20Dias === undefined ? true : Boolean(partial.ajusteDentroDe20Dias),
    ajusteRealizado: Boolean(partial.ajusteRealizado ?? false),
    contactoConExitoEstudiantil: Boolean(partial.contactoConExitoEstudiantil ?? false),
    areaOperativaCanalizoAExito: partial.areaOperativaCanalizoAExito === undefined ? true : Boolean(partial.areaOperativaCanalizoAExito),
    retencionRealizada: Boolean(partial.retencionRealizada ?? false),
    retencionAceptada: Boolean(partial.retencionAceptada ?? false),
    motivoSolicitud: String(partial.motivoSolicitud ?? ''),
    intencionCancelacionManifiesta: Boolean(partial.intencionCancelacionManifiesta ?? false),
  };
}

function dictamenFromSnapshot(snapshot: TicketSnapshot): DictamenData {
  const versions = [...snapshot.dictamenVersions].sort((a, b) => b.version - a.version);
  const latest = versions[0];
  const run = snapshot.decisionRun;
  const resultado = snapshot.ticket.resultado ?? {};

  if (latest) {
    return {
      classification: latest.classification ?? run?.classification ?? resultado.principal ?? 'REQUIERE_REVISION',
      confidence: latest.confidence ?? run?.confidence ?? resultado.confianza ?? 0,
      rootCause: latest.root_cause ?? run?.root_cause ?? resultado.rootCause ?? 'NO_DETERMINADA',
      text: latest.text,
      status: latest.status === 'APROBADO' ? 'APROBADO' : latest.status === 'PENDIENTE_REVISION' ? 'PENDIENTE_REVISION' : 'BORRADOR',
      approvedBy: latest.approved_by ?? undefined,
      approvedAt: latest.approved_at ?? undefined,
      modifiedByAuditor: latest.modified_by_auditor,
      reviewerNotes: latest.reviewer_notes ?? undefined,
    };
  }

  const status = dbStatusToUi(snapshot.ticket.status) === 'APROBADO' ? 'APROBADO' : 'PENDIENTE_REVISION';
  return {
    classification: run?.classification ?? resultado.principal ?? 'REQUIERE_REVISION',
    confidence: run?.confidence ?? resultado.confianza ?? 0,
    rootCause: run?.root_cause ?? resultado.rootCause ?? 'NO_DETERMINADA',
    text: run?.dictamen_sugerido ?? resultado.textoDictamen ?? '',
    status,
    modifiedByAuditor: false,
    approvedBy: resultado.aprobadoPor as string | undefined,
    approvedAt: snapshot.ticket.completed_at ?? undefined,
  };
}

export function snapshotToAuditCase(snapshot: TicketSnapshot): AuditCase {
  const ticket = snapshot.ticket;
  const estudiante = ticket.estudiante ?? {};
  const fechas = ticket.fechas ?? {};
  const solicitud = ticket.solicitud ?? {};
  const resultado = ticket.resultado ?? {};
  const decisionData: CaseDecisionData = defaultValueForCaseDecisionData(ticket.decision_data ?? {});

  const startIso = toIsoDate(decisionData.fechaInicio || fechas.fechaInicioCiclo);
  const requestIso = toIsoDate(decisionData.fechaSolicitud || fechas.fechaSolicitudTicket);
  const daysFromStart = startIso && requestIso
    ? Math.max(0, Math.ceil((new Date(requestIso).getTime() - new Date(startIso).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const uiStatus = dbStatusToUi(ticket.status);

  return {
    id: ticket.folio,
    backendId: ticket.id,
    status: uiStatus,
    statusLabel:
      uiStatus === 'APROBADO' ? 'Aprobado' : uiStatus === 'DICTAMINADO' ? 'Dictaminado' : uiStatus === 'RECHAZADO' ? 'Rechazado' : uiStatus === 'PENDIENTE_REVISION' ? 'Revisión pendiente' : 'En análisis',
    matricula: String(estudiante.matricula ?? 'Sin matrícula'),
    studentName: String(estudiante.nombre ?? 'Alumno sin nombre'),
    program: String(estudiante.programa ?? decisionData.programa ?? 'Programa no especificado'),
    level: validLevel(estudiante.nivel ?? decisionData.nivelEducativo),
    channel: decisionData.canalVenta ?? 'DIGITAL_FACEBOOK_ADS',
    startDate: formatDisplayDate(startIso),
    requestDate: formatDisplayDate(requestIso),
    daysFromStart,
    workingDaysFromStart: Math.max(0, Math.min(daysFromStart, 10)),
    requestedPolicy: resultado.politicaArticulo ?? snapshot.decisionRun?.politica_articulo ?? 'Cancelación de Venta',
    requestReason: String(solicitud.motivo ?? decisionData.motivoSolicitud ?? 'Motivo pendiente de documentar'),
    studentContactNumber: String(estudiante.telefono ?? ''),
    campaign: 'BACKEND_INFORGE',
    primaryCall: placeholderCall(decisionData, ticket.folio),
    secondaryCalls: [],
    evidences: snapshot.evidences.map(row => evidenceRowToItem(row, ticket.id)),
    timeline: snapshot.events.map(eventToTimeline),
    dictamen: dictamenFromSnapshot(snapshot),
    decisionData,
    manualOverrides: resultado.overrides as AuditCase['manualOverrides'] ?? {},
  };
}

export function buildCreateTicketInput(c: AuditCase): CreateTicketInput {
  const dd = c.decisionData;
  return {
    folio: c.id,
    status: uiStatusToDb(c.status),
    estudiante: {
      nombre: c.studentName,
      matricula: c.matricula,
      programa: c.program,
      nivel: c.level,
      telefono: c.studentContactNumber,
    },
    fechas: {
      fechaInicioCiclo: toIsoDate(dd.fechaInicio),
      fechaSolicitudTicket: toIsoDate(dd.fechaSolicitud),
    },
    solicitud: {
      motivo: c.requestReason,
    },
    decision_data: { ...dd },
    resultado: {},
  };
}

export function buildTicketUpdates(c: AuditCase, updates: Partial<AuditCase>): Record<string, unknown> {
  const dd: CaseDecisionData = { ...c.decisionData, ...(updates.decisionData ?? {}) };
  const studentName = updates.studentName ?? c.studentName;
  const matricula = updates.matricula ?? c.matricula;
  const program = updates.program ?? c.program;
  const channel = updates.channel ?? c.channel;
  const reason = updates.requestReason ?? c.requestReason;
  const startIso = toIsoDate(updates.startDate ?? formatDisplayDate(dd.fechaInicio));
  const requestIso = toIsoDate(updates.requestDate ?? formatDisplayDate(dd.fechaSolicitud));

  return {
    status: updates.status ? uiStatusToDb(updates.status) : uiStatusToDb(c.status),
    estudiante: { nombre: studentName, matricula, programa: program, nivel: c.level, telefono: updates.studentContactNumber ?? c.studentContactNumber },
    fechas: { fechaInicioCiclo: startIso, fechaSolicitudTicket: requestIso },
    solicitud: { motivo: reason },
    decision_data: { ...dd, canalVenta: channel, fechaInicio: startIso, fechaSolicitud: requestIso },
  };
}

export function mapEvidenceForUpload(evidence: EvidenceItem): {
  tipo: string;
  fuente: string;
  nombreArchivo: string;
} {
  const tipo =
    evidence.type === 'image' ? 'IMAGE' : evidence.type === 'pdf' ? 'PDF' : evidence.type === 'audio' ? 'AUDIO' : 'DOC';
  return {
    tipo,
    fuente: SOURCE_TO_FUENTE[evidence.source] ?? 'OTRO',
    nombreArchivo: evidence.name,
  };
}

export function decisionRunRowToResult(run: DecisionRunRow & { rules: unknown[] }): import('../../lib/decision-engine/types').DecisionResult {
  const output = (run.output ?? {}) as Record<string, unknown>;
  return {
    classification: (output.classification as never) ?? run.classification,
    status: run.status === 'APROBADO' ? 'DICTAMINADO' : (output.status as never) ?? 'PROPOSED',
    confidence: (output.confidence as number) ?? run.confidence ?? 0,
    rootCause: (output.rootCause as string) ?? run.root_cause ?? 'NO_DETERMINADA',
    hardBlockers: Array.isArray(output.hardBlockers) ? output.hardBlockers : run.hard_blockers,
    appliedRules: (output.appliedRules as never) ?? (run.output?.reglasAplicadas as never) ?? [],
    rejectedRules: (output.rejectedRules as never) ?? (run.output?.reglasDescartadas as never) ?? [],
    missingEvidence: Array.isArray(output.missingEvidence) ? output.missingEvidence : run.missing_evidence,
    inconsistencies: Array.isArray(output.inconsistencies) ? output.inconsistencies : run.inconsistencies,
    reasoning: Array.isArray(output.reasoning) ? output.reasoning : [],
    evidenceReferences: Array.isArray(output.evidenceReferences) ? output.evidenceReferences : [],
    classificationName: String(output.classificationName ?? run.classification_name ?? ''),
    causaRaiz: String(output.causaRaiz ?? run.root_cause ?? ''),
    dictamenSugerido: String(output.dictamenSugerido ?? run.dictamen_sugerido ?? ''),
    politicaArticulo: String(output.politicaArticulo ?? run.politica_articulo ?? ''),
    prioridadRegla: Number(output.prioridadRegla ?? 0),
    evidenciasNecesarias: Array.isArray(output.evidenciasNecesarias) ? output.evidenciasNecesarias : run.missing_evidence,
    analizadoEn: String(run.run_at),
  };
}