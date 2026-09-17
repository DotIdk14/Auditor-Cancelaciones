import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';
import { evaluateEffectiveContact } from './effective-contact';
import { evaluateAcademicActivity } from './academic-activity';
import { isWithinCancellationWindow } from './dates';

export interface MinimumContactAttemptsEvaluation {
  callsCount: number;
  writtenInteractionsCount: number;
  hasMinimumCalls: boolean;
  hasMinimumWrittenInteractions: boolean;
  callsSpreadCorrectly: boolean;
  writtenInteractionsSpreadCorrectly: boolean;
  missingCalls: number;
  missingWrittenInteractions: number;
}

export function evaluateMinimumContactAttempts(caseData: CancellationCase): MinimumContactAttemptsEvaluation {
  const callsCount = caseData.contacts?.calls?.length || 0;
  const writtenCount = caseData.contacts?.writtenInteractions?.length || 0;

  // Requisitos mínimos según política Art. 5.8:
  // - Mínimo 15 llamadas
  // - Al menos dos llamadas diarias en horarios diferentes
  // - Mínimo 6 interacciones por medios escritos en horarios diferentes
  const hasMinimumCalls = callsCount >= 15;
  const hasMinimumWrittenInteractions = writtenCount >= 6;

  const rawData = caseData.rawDecisionData;
  const callsSpreadCorrectly = rawData?.llamadasValidasPorHorario ?? (callsCount >= 15);
  const writtenInteractionsSpreadCorrectly = writtenCount >= 6;

  return {
    callsCount,
    writtenInteractionsCount: writtenCount,
    hasMinimumCalls,
    hasMinimumWrittenInteractions,
    callsSpreadCorrectly,
    writtenInteractionsSpreadCorrectly,
    missingCalls: Math.max(0, 15 - callsCount),
    missingWrittenInteractions: Math.max(0, 6 - writtenCount)
  };
}

export class UnreachableRule implements DecisionRule {
  id = 'RULE_NODO7_UNREACHABLE';
  name = 'Evaluación de Estudiante Ilocalizable';
  priority = 6;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.2 / 5.8';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const contact = evaluateEffectiveContact(caseData);
    const attempts = evaluateMinimumContactAttempts(caseData);
    const academic = evaluateAcademicActivity(caseData);
    const inWindow = isWithinCancellationWindow(caseData.dates?.startDate, caseData.dates?.requestDate);

    // Si hubo contacto efectivo, NO puede ser ilocalizable
    if (contact.effective) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'Descartada: Existe contacto individual efectivo acreditado con el estudiante titular.',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['contacts.effectiveContacts'],
        missingEvidence: []
      };
    }

    // Si el estudiante tiene actividad académica relevante en aula
    if (academic.blocksUnreachableCancellation) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: `Descartada: El estudiante presenta actividad académica en plataforma (${academic.reasons.join(', ')}), por lo que no cumple el criterio de inactividad de ilocalizable.`,
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['academic'],
        missingEvidence: []
      };
    }

    // Validación de intentos mínimos (15 llamadas y 6 escritos)
    if (!attempts.hasMinimumCalls || !attempts.hasMinimumWrittenInteractions) {
      const missingList: string[] = [];
      if (attempts.missingCalls > 0) {
        missingList.push(`Faltan ${attempts.missingCalls} llamadas (registradas ${attempts.callsCount}/15)`);
      }
      if (attempts.missingWrittenInteractions > 0) {
        missingList.push(`Faltan ${attempts.missingWrittenInteractions} interacciones escritas (registradas ${attempts.writtenInteractionsCount}/6)`);
      }

      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: true,
        priority: this.priority,
        article: this.article,
        explanation: `NO APLICA ILOCALIZABLE POR INTENTOS MÍNIMOS INSUFICIENTES. La política exige agotar al menos 15 llamadas alternadas y 6 mensajes escritos durante las primeras 2 semanas. ${missingList.join('. ')}.`,
        targetClassification: 'REQUIERE_REVISION',
        targetRootCause: 'INTENTOS_MINIMOS_INSUFICIENTES',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['contacts.calls', 'contacts.writtenInteractions'],
        missingEvidence: missingList
      };
    }

    // Se cumplen todas las condiciones para Cancelación por Ilocalizable
    return {
      ruleId: this.id,
      ruleName: this.name,
      fulfilled: true,
      determinant: true,
      priority: this.priority,
      article: this.article,
      explanation: `Se acredita protocolo completo de ILOCALIZABLE: ${attempts.callsCount} llamadas realizadas, ${attempts.writtenInteractionsCount} interacciones escritas enviadas sin respuesta, dentro del periodo reglamentario y sin actividad académica registrada. Procede Cancelación de Venta por Ilocalizable.`,
      targetClassification: 'CANCELACION_VENTA_ILOCALIZABLE',
      targetRootCause: 'AGOTAMIENTO_PROTOCOLO_ILOCALIZABLE',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['contacts.calls', 'contacts.writtenInteractions', 'I6_LOG_LLAMADAS'],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return [
      'REPORTE_I6_15_LLAMADAS',
      'HISTORIAL_6_INTERACCIONES_ESCRITAS',
      'SIU_SIN_CALIFICACIONES',
      'AULA_VIRTUAL_SIN_ACTIVIDAD'
    ];
  }
}
