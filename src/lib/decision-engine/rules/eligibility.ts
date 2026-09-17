import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';

/**
 * NODO 0 — VALIDACIÓN DEL CASO
 * Antes de clasificar:
 * ¿Tenemos como mínimo?
 * - fecha de inicio
 * - fecha de solicitud
 * - nivel educativo
 * - motivo o solicitud del estudiante
 * Si faltan datos esenciales: classification = "REQUIERE_REVISION", missingEvidence = [...]
 */
export class EligibilityRule implements DecisionRule {
  id = 'RULE_NODO0_ELIGIBILITY';
  name = 'Validación de Información Mínima del Caso';
  priority = 0; // Prioridad 0: Prerrequisito absoluto
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.1 / Requisitos Mínimos';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const missing: string[] = [];

    if (!caseData.dates?.startDate) {
      missing.push('FECHA_INICIO');
    }
    if (!caseData.dates?.requestDate) {
      missing.push('FECHA_SOLICITUD');
    }
    if (!caseData.student?.educationLevel || caseData.student.educationLevel === 'UNKNOWN') {
      missing.push('NIVEL_EDUCATIVO');
    }
    if (!caseData.request?.reason && !caseData.request?.explicitCancellationRequest && caseData.request?.wantsToContinue === undefined) {
      missing.push('MOTIVO_O_SOLICITUD_ESTUDIANTE');
    }

    if (missing.length > 0) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: true,
        priority: this.priority,
        article: this.article,
        explanation: `El expediente carece de datos mínimos obligatorios para auditoría: ${missing.join(', ')}. Conforme al estándar de calidad, no es posible emitir un dictamen concluyente sin estos hechos.`,
        targetClassification: 'REQUIERE_REVISION',
        targetRootCause: 'FALTA_INFORMACION_ESENCIAL',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: [],
        missingEvidence: missing
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      fulfilled: true,
      determinant: false,
      priority: this.priority,
      article: this.article,
      explanation: 'El caso cuenta con los campos obligatorios mínimos (fechas de inicio y solicitud, nivel educativo y manifestación inicial) para su análisis formal.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['dates.startDate', 'dates.requestDate', 'student.educationLevel'],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return ['FECHA_INICIO', 'FECHA_SOLICITUD', 'NIVEL_EDUCATIVO', 'MOTIVO_SOLICITUD'];
  }
}
