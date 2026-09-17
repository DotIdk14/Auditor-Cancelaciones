import {
  CancellationCase,
  CaseDecisionData,
  DecisionResult,
  EducationLevel
} from './types';
import { RuleEngine } from './rule-engine';
import { getDaysFromStart, isWithinDesertionPeriod, isWithinCancellationWindow, isPriorToStart } from './rules/dates';
import { evaluateAcademicActivity } from './rules/academic-activity';
import { evaluateEffectiveContact } from './rules/effective-contact';
import { evaluateMinimumContactAttempts } from './rules/unreachable';
import { evaluateStudentIntent } from './rules/student-request';
import { evaluateDecision35 } from './rules/decision35';
import { evaluateDecision53 } from './rules/decision53';
import { resolveDecisionConflict } from './conflict-resolver';
import { requiredEvidenceForRule } from './evidence-evaluator';

export {
  RuleEngine,
  getDaysFromStart,
  isWithinDesertionPeriod,
  isWithinCancellationWindow,
  isPriorToStart,
  evaluateAcademicActivity,
  evaluateEffectiveContact,
  evaluateMinimumContactAttempts,
  evaluateStudentIntent,
  evaluateDecision35,
  evaluateDecision53,
  resolveDecisionConflict,
  requiredEvidenceForRule
};

const defaultEngine = new RuleEngine();

/**
 * Normaliza un objeto CaseDecisionData (del mock/UI) a la estructura canónica CancellationCase
 */
export function normalizeToCancellationCase(input: CancellationCase | CaseDecisionData): CancellationCase {
  // Si ya es un CancellationCase canónico
  if ('ticketId' in input && 'student' in input && 'dates' in input) {
    return input as CancellationCase;
  }

  const d = input as CaseDecisionData;

  const normalizedEducationLevel: EducationLevel =
    d.nivelEducativo === 'LICENCIATURAS_ALIANZAS'
      ? 'ALIANZA'
      : d.nivelEducativo === 'EJECUTIVAS'
      ? 'EJECUTIVA'
      : (d.nivelEducativo as EducationLevel) || 'UNKNOWN';

  const calls: any[] = [];
  if (d.llamadas && d.llamadas > 0) {
    for (let i = 0; i < d.llamadas; i++) {
      calls.push({
        id: `call-norm-${i + 1}`,
        title: `Llamada de auditoría ${i + 1}`,
        date: d.fechaSolicitud || '2026-09-07',
        time: '14:00',
        duration: '05:00',
        durationSeconds: 300,
        status: 'TRANSCRIPCION_COMPLETADA',
        campaign: 'AUDITORIA',
        phoneNumber: '+525500000000',
        intentsRatio: '1/15',
        sentiment: 'Neutro',
        detectedIntentions: d.intencionCancelacionManifiesta ? ['Desea cancelar'] : [],
        keyMoments: [],
        effectiveContact: d.contactoEfectivoDetalle || {
          efectivo: d.contactoEfectivo,
          criterios: [
            { criterio: 'Titular', cumplido: d.contactoEfectivo, evidencia: 'Titular validado' }
          ]
        },
        transcript: d.frasesDetectadas?.map((f, idx) => ({
          id: `seg-${idx}`,
          speaker: 'customer',
          speakerName: 'Cliente',
          start: '00:10',
          end: '00:20',
          startSeconds: 10,
          endSeconds: 20,
          text: f
        })) || []
      });
    }
  }

  const writtenInteractions: any[] = [];
  if (d.interaccionesEscritas && d.interaccionesEscritas > 0) {
    for (let i = 0; i < d.interaccionesEscritas; i++) {
      writtenInteractions.push({
        id: `msg-${i + 1}`,
        date: d.fechaSolicitud || '2026-09-07',
        channel: 'WHATSAPP',
        received: true,
        summary: 'Mensaje de seguimiento de calidad'
      });
    }
  }

  return {
    ticketId: 'CAVE-AUDIT',
    student: {
      name: 'Estudiante de Auditoría',
      enrollmentId: '01000000',
      program: d.programa || '',
      educationLevel: normalizedEducationLevel
    },
    dates: {
      startDate: d.fechaInicio,
      requestDate: d.fechaSolicitud
    },
    request: {
      wantsToContinue: !d.intencionCancelacionManifiesta,
      explicitCancellationRequest: Boolean(d.intencionCancelacionManifiesta || d.motivoSolicitud?.toLowerCase().includes('cancel')),
      reason: d.motivoSolicitud
    },
    academic: {
      enteredVirtualClassroom: d.ingresoAula ?? false,
      selectedEvaluationMethod: d.seleccionModalidad ?? false,
      hasActivities: d.actividadesEntregadas ?? false,
      hasGrades: d.calificaciones ?? false,
      enteredAnyActiveSubject: d.ingresoAulaValidoPosgrado ?? d.ingresoAula ?? false,
      participatedInForum: d.ingresoAulaValidoPosgrado ?? false
    },
    contacts: {
      calls,
      writtenInteractions,
      effectiveContacts: [
        {
          contactId: 'eff-1',
          date: d.fechaSolicitud,
          isEffective: d.contactoEfectivo,
          titularConfirmed: d.contactoEfectivo,
          purposeExplained: d.contactoEfectivo,
          cycleInfoProvided: d.contactoEfectivo,
          institutionIdentified: d.contactoEfectivo,
          personalDataConfirmed: d.contactoEfectivo,
          decisionManifested: d.contactoEfectivo
        }
      ]
    },
    operational: {
      operationalError: d.erroresAdministrativos,
      financialError: d.erroresFinancieros,
      materialLoadError: d.fallaCargaMaterias || !d.materiasCargadas,
      enrollmentError: d.errorInscripcion,
      incorrectProgram: d.errorInscripcionTipo === 'programa',
      incorrectPackage: d.errorInscripcionTipo === 'paquete',
      missingAdjustment: d.solicitudAjuste && !d.ajusteRealizado,
      areaFailedToChannel: d.areaOperativaCanalizoAExito === false,
      studentUpsetByError: true,
      causalLinkWithCancellation: true
    },
    retention: {
      attempted: d.retencionRealizada,
      successful: d.retencionAceptada,
      acceptedBenefit: d.retencionAceptada
    },
    salesPromise: {
      proven: d.promesaVenta,
      evidenceText: d.promesaVentaEvidencia
    },
    cycleChange: {
      requested: Boolean(d.cambioCicloGestionado && d.cambioCicloGestionado !== 'ninguno'),
      requestedBeforeStart: d.cambioCicloGestionado === 'antes_inicio',
      managedBy: 'MATRICULA',
      isRevalidation: d.cambioCicloRevalidacion ?? false
    },
    evidence: [],
    channel: d.canalVenta,
    rawDecisionData: d
  };
}

/**
 * Función principal del Motor de Decisiones
 * analyzeCancellationCase(caseData) -> DecisionResult
 */
export function analyzeCancellationCase(caseData: CancellationCase | CaseDecisionData): DecisionResult {
  const normalizedCase = normalizeToCancellationCase(caseData);
  return defaultEngine.evaluate(normalizedCase);
}
