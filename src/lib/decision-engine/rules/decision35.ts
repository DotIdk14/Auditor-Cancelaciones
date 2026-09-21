import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';

export function evaluateDecision35(caseData: CancellationCase): {
  hasDecision35: boolean;
  isExtemporaneous: boolean;
  appliesCancellation: boolean;
  notes: string;
} {
  const dates = caseData.dates;
  const raw = caseData.rawDecisionData;
  const hasDecision35 = Boolean(dates?.decision35Date || raw?.decision35);
  const isExtemporaneous = raw?.decision35EnTiempo === false;

  return {
    hasDecision35,
    isExtemporaneous,
    appliesCancellation: hasDecision35 && isExtemporaneous,
    notes: hasDecision35
      ? isExtemporaneous
        ? 'Decisión 35 emitida fuera de tiempo por Servicios Escolares.'
        : 'Decisión 35 emitida en tiempo regular.'
      : 'Sin registro de Decisión 35.'
  };
}

export class Decision35Rule implements DecisionRule {
  id = 'RULE_NODO13_DECISION_35';
  name = 'Evaluación de Decisión 35 (Servicios Escolares)';
  priority = 3;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.9 / Decisión 35';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const d35 = evaluateDecision35(caseData);

    if (!d35.hasDecision35) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'No aplica: El caso no involucra dictamen de Decisión 35.',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: [],
        missingEvidence: []
      };
    }

    if (d35.appliesCancellation) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: this.article,
        explanation: 'Decisión 35 emitida de manera extemporánea después de la fecha de inicio de clases por Servicios Escolares, generando afectación que impide continuar.',
        targetClassification: 'CANCELACION_VENTA_OPERATIVA',
        targetRootCause: 'DECISION_35_EXTEMPORANEA',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['dates.decision35Date'],
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
      explanation: 'Decisión 35 gestionada conforme a plazos regulares; requiere análisis complementario si el estudiante no cuenta con documentación mínima.',
      targetClassification: 'REQUIERE_REVISION',
      targetRootCause: 'REVISION_DECISION_35',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['dates.decision35Date'],
      missingEvidence: ['DICTAMEN_ESCOLAR_DECISION_35']
    };
  }

  requiredEvidence(): string[] {
    return ['ACTA_DECISION_35', 'FECHA_NOTIFICACION_ESCOLAR'];
  }
}
