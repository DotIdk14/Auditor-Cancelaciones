import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';

export class MysteryShopperRule implements DecisionRule {
  id = 'RULE_NODO15_MYSTERY_SHOPPER';
  name = 'Cancelación de Matrícula por Canal Mystery Shopper';
  priority = 2; // Prioridad alta por regla de canal institucional
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.10.a';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const channel = (caseData.channel || caseData.rawDecisionData?.canalVenta || '').toUpperCase();
    const isMystery = channel.includes('MYSTERY') || caseData.rawDecisionData?.mysteryShopper === true;

    if (isMystery) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: this.article,
        explanation: 'El caso corresponde al canal evaluador institucional "Mystery Shopper". Conforme al Art. 5.10.a, Servicios Escolares aplica Cancelación de Matrícula y este trámite NO impacta el indicador de cancelaciones de venta.',
        targetClassification: 'CANCELACION_DE_MATRICULA',
        targetRootCause: 'CANAL_MYSTERY_SHOPPER',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['channel', 'TICKET_SERVICIOS_ESCOLARES'],
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
      explanation: 'No corresponde a venta generada por canal Mystery Shopper.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['channel'],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return ['SIU_REGISTRO_CANAL_VENTA', 'CONFIRMACION_SERVICIOS_ESCOLARES'];
  }
}
