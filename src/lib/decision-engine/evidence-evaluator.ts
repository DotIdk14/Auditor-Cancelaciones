import { CancellationCase, Evidence } from './types';

export interface RuleEvidenceStatus {
  ruleId: string;
  required: string[];
  available: string[];
  missing: string[];
  references: string[];
}

/**
 * NODO 21 — EVIDENCIA REQUERIDA
 * Cada regla define qué evidencia necesita y cómo se coteja.
 */
export function requiredEvidenceForRule(ruleId: string, caseData: CancellationCase): RuleEvidenceStatus {
  const allEvidences = caseData.evidence || [];
  const availableSources = new Set<string>();

  for (const ev of allEvidences) {
    if (ev.type) availableSources.add(ev.type.toUpperCase());
    if (ev.source) availableSources.add(ev.source.toUpperCase());
    if (ev.id) availableSources.add(ev.id.toUpperCase());
  }

  // Fuentes implícitas presentes en contacts/academic
  if (caseData.contacts?.calls && caseData.contacts.calls.length > 0) {
    availableSources.add('LLAMADA');
    availableSources.add('CALL');
    availableSources.add('AUDIO');
    availableSources.add('TRANSCRIPCION');
  }
  if (caseData.contacts?.writtenInteractions && caseData.contacts.writtenInteractions.length > 0) {
    availableSources.add('MENSAJE');
    availableSources.add('WHATSAPP');
    availableSources.add('CORREO');
  }
  if (caseData.academic?.hasGrades !== undefined) {
    availableSources.add('SIU');
    availableSources.add('KARDEX');
    availableSources.add('CALIFICACIONES');
  }
  if (caseData.academic?.enteredVirtualClassroom !== undefined) {
    availableSources.add('AULA_VIRTUAL');
  }

  let required: string[] = [];

  switch (ruleId) {
    case 'RULE_NODO7_UNREACHABLE':
      required = ['REPORTE_I6_15_LLAMADAS', 'HISTORIAL_6_INTERACCIONES_ESCRITAS', 'AULA_VIRTUAL_SIN_ACTIVIDAD'];
      break;
    case 'RULE_NODO10_SALES_PROMISE':
      required = ['AUDIO_O_TRANSCRIPCION_CIERRE_VENTA', 'EVIDENCIA_DOCUMENTAL_PROGRAMA'];
      break;
    case 'RULE_NODO11_OPERATIONAL_CANCELLATION':
    case 'RULE_NODO12_MATERIAL_LOAD_DELAY':
      required = ['SIU_HISTORIAL_CARGA_MATERIAS', 'FLOKZU_TICKET_SERVICIO', 'GRABACION_LLAMADA_O_CHAT_SOPORTE'];
      break;
    case 'RULE_ACADEMIC_GRADES_BLOCKER':
      required = ['SIU_KARDEX', 'HISTORIAL_ACADEMICO'];
      break;
    case 'RULE_NODO9_ENROLLMENT_ERROR':
      required = ['TICKET_SOLICITUD_AJUSTE', 'SIU_OFERTA_INSCRIPCION'];
      break;
    case 'RULE_NODO15_MYSTERY_SHOPPER':
      required = ['SIU_REGISTRO_CANAL_VENTA'];
      break;
    default:
      required = ['FECHA_INICIO', 'FECHA_SOLICITUD', 'MOTIVO_SOLICITUD'];
  }

  const missing: string[] = [];
  const references: string[] = [];

  for (const req of required) {
    const found = allEvidences.find(e =>
      e.type?.toUpperCase().includes(req) ||
      e.source?.toUpperCase().includes(req) ||
      e.title?.toUpperCase().includes(req)
    );
    if (found) {
      references.push(found.id);
    } else {
      missing.push(req);
    }
  }

  return {
    ruleId,
    required,
    available: Array.from(availableSources),
    missing,
    references
  };
}
