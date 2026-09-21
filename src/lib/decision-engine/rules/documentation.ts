import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';

export class DocumentationRule implements DecisionRule {
  id = 'RULE_NODO14_DOCUMENTATION';
  name = 'Evaluación de Entrega de Documentos y Notificación Física';
  priority = 8;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.7.e';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const raw = caseData.rawDecisionData;
    const speechOmitted = raw?.speechConvalidacionLatamOmitido;

    if (speechOmitted) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'Se identificó omisión en el speech informativo sobre documentación física y validación de antecedentes. Esta evidencia respalda reclamaciones del estudiante por desinformación.',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['AUDIO_CIERRE_VENTA'],
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
      explanation: 'No se detectan irregularidades ni omisiones relativas a la notificación de entrega de documentos físicos.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: [],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return ['AUDIO_CIERRE_VENTA_SPEECH_DOCS', 'EXPEDIENTE_DIGITAL_SIU'];
  }
}
