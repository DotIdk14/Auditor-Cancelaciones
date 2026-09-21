import { AuditCase, ManualOverrides } from '../../types/audit';
import { DecisionResult } from '../decision-engine/types';
import { CaseDecisionData } from '../decision-engine/types';

export type FieldStatusKind = 'detected' | 'missing_optional' | 'missing_required' | 'manually_added';

export interface FieldStatus {
  key: string;
  label: string;
  group: string;
  status: FieldStatusKind;
  value?: unknown;
}

export interface PDFPreflightResult {
  canGenerate: boolean;
  blocking: FieldStatus[];
  optional: FieldStatus[];
  warnings: string[];
  fields: FieldStatus[];
}

export type OverrideKey = keyof ManualOverrides & string;

export interface OptionalFieldDef {
  key: OverrideKey;
  label: string;
  group: string;
  readSource: (caseData: AuditCase) => unknown;
}

const dc = (caseData: AuditCase): Record<string, unknown> => (caseData.decisionData || {}) as Record<string, unknown>;

export const OPTIONAL_FIELDS: OptionalFieldDef[] = [
  { key: 'correo', label: 'Correo', group: 'Datos del estudiante', readSource: c => dc(c).correo },
  { key: 'telefono', label: 'Teléfono', group: 'Datos del estudiante', readSource: c => c.studentContactNumber },
  { key: 'linkEvidencias', label: 'Link de evidencias (Drive)', group: 'Evidencias', readSource: () => undefined },
  { key: 'fechaCreacion', label: 'Fecha de creación', group: 'Fechas', readSource: c => dc(c).fechaCreacion },
  { key: 'fechaDecision', label: 'Fecha decisión', group: 'Fechas', readSource: c => dc(c).fechaDecision },
  { key: 'fechaAsignadoDictaminar', label: 'Asignado a dictaminar', group: 'Fechas', readSource: c => dc(c).fechaAsignadoDictaminar },
  { key: 'ultimaSesion', label: 'Última sesión', group: 'Fechas', readSource: c => dc(c).ultimaSesion },
  { key: 'primerPago', label: 'Primer pago', group: 'Solicitud', readSource: c => dc(c).primerPago },
  { key: 'comentariosBackOffice', label: 'Comentarios BO', group: 'Comentarios de áreas', readSource: c => dc(c).backOffice },
  { key: 'comentariosHelpDesk', label: 'Comentarios HelpDesk', group: 'Comentarios de áreas', readSource: c => dc(c).helpDesk },
  { key: 'comentariosSER', label: 'Comentarios SER', group: 'Comentarios de áreas', readSource: c => dc(c).ser },
  { key: 'comentariosFinanzas', label: 'Comentarios Finanzas', group: 'Comentarios de áreas', readSource: c => dc(c).finanzas },
  { key: 'observacionesFinales', label: 'Observaciones finales', group: 'Observaciones', readSource: c => c.dictamen?.reviewerNotes },
];

export function getOverrideValue(caseData: AuditCase, key: OverrideKey): unknown {
  const manual = caseData.manualOverrides?.[key];
  if (!isBlank(manual)) return manual;
  return undefined;
}

export function getResolvedValue(caseData: AuditCase, key: OverrideKey, readSource: (c: AuditCase) => unknown): unknown {
  const manual = getOverrideValue(caseData, key);
  if (manual !== undefined) return manual;
  const source = readSource(caseData);
  if (!isBlank(source)) return source;
  return undefined;
}

export function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function runPDFPreflight(caseData: AuditCase, result: DecisionResult | null, dictamenText?: string): PDFPreflightResult {
  const blocking: FieldStatus[] = [];
  const warnings: string[] = [];

  if (!caseData?.id) {
    blocking.push({ key: 'folio', label: 'Folio del expediente', group: 'Expediente', status: 'missing_required' });
  }

  if (isBlank(caseData.studentName) && isBlank(caseData.matricula)) {
    blocking.push({ key: 'identidad', label: 'Nombre o matrícula del estudiante', group: 'Expediente', status: 'missing_required' });
  }

  if (isBlank(caseData.requestedPolicy) && isBlank(caseData.requestReason)) {
    blocking.push({ key: 'solicitud', label: 'Política solicitada o motivo', group: 'Solicitud', status: 'missing_required' });
  }

  if (!caseData.evidences?.length) {
    blocking.push({ key: 'evidencia', label: 'Al menos una evidencia cargada', group: 'Evidencias', status: 'missing_required' });
  }

  const dictamenAvailable = Boolean(
    dictamenText ||
    result?.dictamenSugerido ||
    caseData.dictamen?.text ||
    caseData.decisionData
  );

  if (!dictamenAvailable) {
    blocking.push({ key: 'dictamen', label: 'Dictamen generado', group: 'Dictamen', status: 'missing_required' });
  }

  const fields: FieldStatus[] = OPTIONAL_FIELDS.map(field => {
    const manual = getOverrideValue(caseData, field.key);
    if (manual !== undefined) {
      return { key: field.key, label: field.label, group: field.group, status: 'manually_added', value: manual };
    }
    const source = field.readSource(caseData);
    if (!isBlank(source)) {
      return { key: field.key, label: field.label, group: field.group, status: 'detected', value: source };
    }
    return { key: field.key, label: field.label, group: field.group, status: 'missing_optional' };
  });

  const optional = fields
    .filter(f => f.status === 'missing_optional' || f.status === 'manually_added')
    .filter(f => f.status === 'missing_optional');

  const allowedIlocalizable = caseData.requestedPolicy?.toLowerCase().includes('ilocalizable')
    || caseData.requestReason?.toLowerCase().includes('ilocalizable');

  if (allowedIlocalizable) {
    const decision = caseData.decisionData as CaseDecisionData;
    const evidenceOfActivity = Boolean(
      decision?.ingresoAula ||
      decision?.calificaciones ||
      decision?.actividadesEntregadas ||
      decision?.seleccionModalidad ||
      decision?.materiasCargadas
    );
    if (evidenceOfActivity) {
      warnings.push('La política solicitada indica "Alumno ilocalizable", pero hay evidencia de actividad académica (ingreso a aula, calificaciones o materias). No procede CV por ilocalizable.');
    }
  }

  if ((result?.missingEvidence || []).length > 0) {
    warnings.push(`El motor reporta evidencia faltante: ${result?.missingEvidence.join(', ')}.`);
  }

  return {
    canGenerate: blocking.length === 0,
    blocking,
    optional,
    warnings,
    fields,
  };
}