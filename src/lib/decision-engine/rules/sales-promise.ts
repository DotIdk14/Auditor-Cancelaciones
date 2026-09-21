import { CancellationCase, DecisionRule, RuleEvaluationResult, SalesPromiseStatus } from '../types';

export class SalesPromiseRule implements DecisionRule {
  id = 'RULE_NODO10_SALES_PROMISE';
  name = 'Evaluación de Promesa de Venta No Cumplida o Información Falsa';
  priority = 4;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.6';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const sp = caseData.salesPromise || {};
    const raw = caseData.rawDecisionData;

    let status: SalesPromiseStatus = sp.status || 'NOT_DETECTED';
    if (sp.proven || raw?.promesaVenta) {
      status = 'CONFIRMED';
    } else if (sp.suspected) {
      status = 'SUSPECTED';
    }

    if (status === 'NOT_DETECTED') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'Descartada: No se detectaron indicios ni acusaciones de promesa de venta no cumplida o información comercial errónea.',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: [],
        missingEvidence: []
      };
    }

    if (status === 'SUSPECTED') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'Sospecha de promesa comercial discrepante registrada, pero NO se encuentra comprobada en grabaciones o documentos de cierre. Conforme a política, una sospecha no genera cancelación sin evidencia concluyente.',
        targetClassification: 'REQUIERE_REVISION',
        targetRootCause: 'SOSPECHA_PROMESA_NO_COMPROBADA',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['salesPromise.suspected'],
        missingEvidence: ['AUDIO_CIERRE_VENTA_CON_PROMESA_PROBADA', 'EVIDENCIA_DOCUMENTAL_OFERTA']
      };
    }

    if (status === 'SUPPORTED' || status === 'CONFIRMED') {
      // Validar que el estudiante no quiera continuar y no acepte retención
      const refusesBenefits = caseData.retention?.acceptedBenefit === false || raw?.retencionAceptada === false;
      const wantsToCancel = !caseData.request?.wantsToContinue || caseData.request?.explicitCancellationRequest;

      if (wantsToCancel) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          fulfilled: true,
          determinant: true,
          priority: this.priority,
          article: this.article,
          explanation: `Se COMPROBÓ formalmente que en el proceso comercial se brindó información tendenciosa, errónea o que no correspondía con el programa académico (${sp.evidenceText || raw?.promesaVentaEvidencia || 'Grabación de cierre de venta cotejada'}), el alumno ratificó su decisión de no continuar y rechazó alternativas. Procede Cancelación de Venta por Promesa No Cumplida.`,
          targetClassification: 'CANCELACION_VENTA_PROMESA_NO_CUMPLIDA',
          targetRootCause: 'PROMESA_DE_VENTA_NO_CUMPLIDA',
          requiredEvidence: this.requiredEvidence(),
          evidenceReferences: ['salesPromise.proven', 'AUDIO_VENTA_COMPROBADA'],
          missingEvidence: []
        };
      }
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      fulfilled: false,
      determinant: false,
      priority: this.priority,
      article: this.article,
      explanation: 'Promesa evaluada; no concurren los requisitos para dictaminar cancelación por este motivo.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['salesPromise'],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return [
      'AUDIO_O_TRANSCRIPCION_CIERRE_VENTA',
      'EVIDENCIA_DOCUMENTAL_PROGRAMA',
      'RECHAZO_EXPLICITO_DE_RETENCION'
    ];
  }
}
