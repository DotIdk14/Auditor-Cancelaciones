import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';
import { isPriorToStart } from './dates';

export class RetentionRule implements DecisionRule {
  id = 'RULE_NODO16_RETENTION';
  name = 'Evaluación de Procedimiento de Retención Institucional';
  priority = 7; // Prioridad residual
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.3.a.II / 5.3.b';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const ret = caseData.retention;
    const raw = caseData.rawDecisionData;
    const prior = isPriorToStart(caseData.dates?.startDate, caseData.dates?.requestDate);

    // Si la solicitud es previa al inicio, la retención no es forzosa para baja
    if (prior) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'La solicitud se radicó previo al inicio de clases; aplica cancelación a solicitud del estudiante sin sujeción a retención obligatoria.',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['dates.startDate'],
        missingEvidence: []
      };
    }

    const attempted = ret?.attempted ?? raw?.retencionRealizada;
    const successful = ret?.successful ?? raw?.retencionAceptada;
    const acceptedBenefit = ret?.acceptedBenefit ?? raw?.retencionAceptada;

    if (attempted && !successful && !acceptedBenefit) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: false,
        priority: this.priority,
        article: 'Art. 5.3.a.II',
        explanation: 'Solicitud posterior al inicio donde el protocolo institucional de retención fue ejecutado y no resultó efectivo (el estudiante no aceptó beneficios ni alternativas). Como regla general residual, procede BAJA a solicitud del estudiante, sujeta a no existencia de causales operativas o de promesa que prevalezcan.',
        targetClassification: 'BAJA',
        targetRootCause: 'SOLICITUD_DEL_ESTUDIANTE',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['retention.attempted', 'retention.acceptedBenefit'],
        missingEvidence: []
      };
    }

    if (!attempted) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'No se registra intento de retención por Gestión de Éxito Estudiantil posterior a la solicitud del alumno.',
        targetClassification: 'REQUIERE_REVISION',
        targetRootCause: 'FALTA_PROTOCOLO_RETENCION',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: [],
        missingEvidence: ['BITACORA_INTENTO_RETENCION']
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      fulfilled: false,
      determinant: false,
      priority: this.priority,
      article: this.article,
      explanation: 'Protocolo de retención evaluado.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['retention'],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return ['BITACORA_RETENCION_EXITO_ESTUDIANTIL', 'CRM_I6_OFRECIMIENTO_BENEFICIOS'];
  }
}
