import { Ticket } from './types';

export type TicketTemplateFieldName =
  | 'folio'
  | 'estudiante.nombre'
  | 'estudiante.matricula'
  | 'estudiante.correo'
  | 'estudiante.canal'
  | 'estudiante.programa'
  | 'estudiante.telefono'
  | 'fechas.fechaCreacion'
  | 'fechas.fechaDecision'
  | 'fechas.fechaInicioCiclo'
  | 'fechas.fechaSolicitudTicket'
  | 'fechas.fechaAsignadoDictaminar'
  | 'fechas.fechaDictamenAplicado'
  | 'solicitud.primerPago'
  | 'solicitud.politicaSolicitada'
  | 'solicitud.motivo'
  | 'solicitud.descripcion'
  | 'comentarios.backOffice'
  | 'comentarios.helpDesk'
  | 'comentarios.ser'
  | 'comentarios.finanzas'
  | 'resultado.textoDictamen'
  | 'evidencias.cronologicas'
  | 'comentarios.auditor';

export interface TemplateFieldDefinition {
  name: TicketTemplateFieldName;
  placeholder: string;
  label: string;
  source: 'TICKET' | 'EVIDENCE_TIMELINE' | 'DECISION_RESULT' | 'AUDITOR_REVIEW';
  requiredForPdf: boolean;
  affectsLayout: boolean;
}

export const REQUIRED_TICKET_TEMPLATE_FIELDS: TicketTemplateFieldName[] = [
  'folio',
  'estudiante.nombre',
  'estudiante.matricula',
  'estudiante.correo',
  'estudiante.canal',
  'estudiante.programa',
  'estudiante.telefono',
  'fechas.fechaCreacion',
  'fechas.fechaDecision',
  'fechas.fechaInicioCiclo',
  'fechas.fechaSolicitudTicket',
  'fechas.fechaAsignadoDictaminar',
  'fechas.fechaDictamenAplicado',
  'solicitud.primerPago',
  'solicitud.politicaSolicitada',
  'solicitud.motivo',
  'solicitud.descripcion',
  'comentarios.backOffice',
  'comentarios.helpDesk',
  'comentarios.ser',
  'comentarios.finanzas',
  'resultado.textoDictamen',
  'evidencias.cronologicas',
  'comentarios.auditor'
];

export const CAVE_28259_TEMPLATE_FIELDS: TemplateFieldDefinition[] = [
  field('folio', '{{folio}}', 'Folio del expediente', 'TICKET'),
  field('estudiante.nombre', '{{estudiante_nombre}}', 'Nombre del estudiante', 'TICKET'),
  field('estudiante.matricula', '{{estudiante_matricula}}', 'Matrícula', 'TICKET'),
  field('estudiante.correo', '{{estudiante_correo}}', 'Correo', 'TICKET'),
  field('estudiante.canal', '{{estudiante_canal}}', 'Canal', 'TICKET'),
  field('estudiante.programa', '{{estudiante_programa}}', 'Programa', 'TICKET'),
  field('estudiante.telefono', '{{estudiante_telefono}}', 'Teléfono', 'TICKET'),
  field('fechas.fechaCreacion', '{{fecha_creacion}}', 'Fecha de creación', 'TICKET'),
  field('fechas.fechaDecision', '{{fecha_decision}}', 'Fecha Decisión', 'TICKET'),
  field('fechas.fechaInicioCiclo', '{{fecha_inicio_ciclo}}', 'Fecha de inicio de ciclo', 'TICKET'),
  field('fechas.fechaSolicitudTicket', '{{fecha_solicitud_ticket}}', 'Fecha solicitud de ticket', 'TICKET'),
  field('fechas.fechaAsignadoDictaminar', '{{asignado_dictaminar}}', 'Asignado a dictaminar', 'TICKET'),
  field('fechas.fechaDictamenAplicado', '{{dictamen_aplicado_fecha}}', 'Dictamen aplicado el', 'DECISION_RESULT'),
  field('solicitud.primerPago', '{{primer_pago}}', 'Primer pago', 'TICKET'),
  field('solicitud.politicaSolicitada', '{{politica_solicitada}}', 'Política que aplica/solicitada', 'DECISION_RESULT'),
  field('solicitud.motivo', '{{motivo}}', 'Motivo', 'TICKET'),
  field('solicitud.descripcion', '{{descripcion}}', 'Descripción', 'TICKET'),
  field('comentarios.backOffice', '{{comentarios_bo}}', 'Comentarios BO', 'AUDITOR_REVIEW'),
  field('comentarios.helpDesk', '{{comentarios_helpdesk}}', 'Comentarios HelpDesk', 'AUDITOR_REVIEW'),
  field('comentarios.ser', '{{comentarios_ser}}', 'Comentarios SER', 'AUDITOR_REVIEW'),
  field('comentarios.finanzas', '{{comentarios_finanzas}}', 'Comentarios Finanzas', 'AUDITOR_REVIEW'),
  field('resultado.textoDictamen', '{{texto_dictamen}}', 'Dictamen', 'DECISION_RESULT'),
  field('evidencias.cronologicas', '{{evidencias_cronologicas}}', 'Evidencias en orden cronológico', 'EVIDENCE_TIMELINE'),
  field('comentarios.auditor', '{{observaciones_finales}}', 'Observaciones finales', 'AUDITOR_REVIEW')
];

export interface TemplateFieldCoverageResult {
  valid: boolean;
  missingFields: TicketTemplateFieldName[];
  layoutSafe: boolean;
}

export function validateTemplateFieldCoverage(
  ticket: Ticket,
  fields: TemplateFieldDefinition[]
): TemplateFieldCoverageResult {
  const missingFields = fields
    .filter(item => item.requiredForPdf)
    .filter(item => isEmpty(readTicketPath(ticket, item.name)))
    .map(item => item.name);

  const layoutSafe = fields.every(item => item.affectsLayout === false);

  return {
    valid: missingFields.length === 0 && layoutSafe,
    missingFields,
    layoutSafe
  };
}

function field(
  name: TicketTemplateFieldName,
  placeholder: string,
  label: string,
  source: TemplateFieldDefinition['source']
): TemplateFieldDefinition {
  return {
    name,
    placeholder,
    label,
    source,
    requiredForPdf: true,
    affectsLayout: false
  };
}

function readTicketPath(ticket: Ticket, path: TicketTemplateFieldName): unknown {
  if (path === 'evidencias.cronologicas') return ticket.evidencias.length > 0 ? ticket.evidencias : undefined;

  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, ticket);
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
