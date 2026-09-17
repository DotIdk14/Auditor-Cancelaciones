import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';
import { getDaysFromStart } from './dates';

export class EnrollmentErrorRule implements DecisionRule {
  id = 'RULE_NODO9_ENROLLMENT_ERROR';
  name = 'Evaluación de Error de Inscripción y Ajustes Administrativos';
  priority = 5;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.5 / Art. 5.3.c';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const op = caseData.operational || {};
    const raw = caseData.rawDecisionData;
    const days = getDaysFromStart(caseData.dates?.startDate, caseData.dates?.requestDate);

    const hasEnrollmentError =
      op.enrollmentError ||
      op.incorrectProgram ||
      op.incorrectPackage ||
      op.incorrectStartCycle ||
      op.incorrectCampus ||
      op.missingAdjustment ||
      raw?.errorInscripcion;

    if (!hasEnrollmentError) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'Descartada: No se reporta error de programa, paquete, ciclo, campus o ajuste de inscripción.',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: [],
        missingEvidence: []
      };
    }

    const requestedAdjustment = op.missingAdjustment || raw?.solicitudAjuste;
    const adjustmentCompleted = !op.missingAdjustment && (raw?.ajusteRealizado ?? false);
    const within20Days = days <= 20;

    // Verificar si el error causó la desvinculación
    const studentWantsToCancel = !caseData.request?.wantsToContinue || caseData.request?.explicitCancellationRequest;
    const hasCausalLink = op.causalLinkWithCancellation ?? (Boolean(hasEnrollmentError) && studentWantsToCancel);

    if (hasEnrollmentError && requestedAdjustment && !adjustmentCompleted && within20Days && hasCausalLink) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: 'Art. 5.5 / Plazo de 20 Días',
        explanation: `Se acreditó un error de inscripción solicitado dentro del plazo de 20 días hábiles posteriores al inicio (${days} días) que no fue subsanado oportunamente por la institución, provocando la desvinculación del estudiante. Procede Cancelación de Venta.`,
        targetClassification: 'CANCELACION_VENTA',
        targetRootCause: 'ERROR_INSCRIPCION_AJUSTE_NO_APLICADO',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['operational.enrollmentError', 'FLOKZU_TICKET_AJUSTE'],
        missingEvidence: []
      };
    }

    if (hasEnrollmentError && !within20Days) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: false,
        priority: this.priority,
        article: 'Art. 5.5 Extemporáneo',
        explanation: `El ajuste o reporte de error fue presentado de manera extemporánea (${days} días > 20 días límite). Conforme a política, el ajuste extemporáneo no exime de baja si no hay dolo institucional.`,
        targetClassification: 'BAJA',
        targetRootCause: 'AJUSTE_INSCRIPCION_EXTEMPORANEO',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['dates.requestDate'],
        missingEvidence: []
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      fulfilled: false,
      determinant: false,
      priority: this.priority,
      article: this.article,
      explanation: 'Se reportó inconsistencia de inscripción pero no se acreditó vínculo causal con la cancelación o el ajuste fue subsanado.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['operational'],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return ['TICKET_SOLICITUD_AJUSTE', 'SIU_OFERTA_INSCRIPCION', 'CORREO_O_LLAMADA_ACLARACION'];
  }
}
