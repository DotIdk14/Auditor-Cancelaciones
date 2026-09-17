import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';

export function evaluateDecision53(caseData: CancellationCase): {
  hasDecision53: boolean;
  fulfilledRequirements: boolean;
  notes: string;
} {
  const dates = caseData.dates;
  const raw = caseData.rawDecisionData;
  const hasDecision53 = Boolean(dates?.decision53Date || raw?.decision53);

  return {
    hasDecision53,
    fulfilledRequirements: false,
    notes: hasDecision53 ? 'Requisitos evaluados mediante Decisión 53.' : 'Sin registro de Decisión 53.'
  };
}

export class Decision53Rule implements DecisionRule {
  id = 'RULE_NODO13_DECISION_53';
  name = 'Evaluación de Decisión 53';
  priority = 3;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.9 / Decisión 53';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const d53 = evaluateDecision53(caseData);

    if (!d53.hasDecision53) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'No aplica: El caso no involucra procedimiento de Decisión 53.',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: [],
        missingEvidence: []
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      fulfilled: true,
      determinant: false,
      priority: this.priority,
      article: this.article,
      explanation: 'Decisión 53 identificada en expediente; conforme a política se requiere verificación de cumplimiento de requisitos posterior al inicio.',
      targetClassification: 'REQUIERE_REVISION',
      targetRootCause: 'REVISION_DECISION_53',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['dates.decision53Date'],
      missingEvidence: ['DICTAMEN_DECISION_53', 'COMPROBACION_REQUISITOS_POSTERIORES']
    };
  }

  requiredEvidence(): string[] {
    return ['EXPEDIENTE_DECISION_53'];
  }
}
