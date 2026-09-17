import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';

export interface AcademicActivityEvaluation {
  hasAnyRelevantActivity: boolean;
  blocksUnreachableCancellation: boolean;
  hasGrades: boolean;
  reasons: string[];
}

export function evaluateAcademicActivity(caseData: CancellationCase): AcademicActivityEvaluation {
  const acad = caseData.academic || { enteredVirtualClassroom: false };
  const level = caseData.student?.educationLevel;
  const reasons: string[] = [];
  let blocksUnreachableCancellation = false;
  let hasAnyRelevantActivity = false;

  if (acad.hasGrades) {
    hasAnyRelevantActivity = true;
    blocksUnreachableCancellation = true;
    reasons.push('El estudiante cuenta con calificaciones registradas en el sistema escolar (devengamiento de servicio).');
  }

  if (acad.hasActivities) {
    hasAnyRelevantActivity = true;
    blocksUnreachableCancellation = true;
    reasons.push('El estudiante presenta entregas de actividades en aula virtual.');
  }

  if (level === 'LICENCIATURA') {
    if (acad.selectedEvaluationMethod) {
      hasAnyRelevantActivity = true;
      blocksUnreachableCancellation = true;
      reasons.push('Licenciatura: El estudiante seleccionó modalidad de evaluación en plataforma.');
    } else {
      reasons.push('Licenciatura: No se registra selección de modalidad de evaluación.');
    }
  } else if (level === 'POSGRADO' || level === 'EJECUTIVA' || level === 'ALIANZA') {
    if (acad.enteredAnyActiveSubject || (acad.enteredVirtualClassroom && acad.participatedInForum)) {
      hasAnyRelevantActivity = true;
      blocksUnreachableCancellation = true;
      reasons.push(`${level}: Ingresó a asignaturas activas o participó en foros de presentación.`);
    } else {
      reasons.push(`${level}: No se acredita ingreso a asignaturas activas.`);
    }
  } else {
    if (acad.enteredVirtualClassroom && (acad.selectedEvaluationMethod || acad.enteredAnyActiveSubject)) {
      hasAnyRelevantActivity = true;
      blocksUnreachableCancellation = true;
      reasons.push('Se detecta actividad sustantiva en el aula virtual.');
    }
  }

  return {
    hasAnyRelevantActivity,
    blocksUnreachableCancellation,
    hasGrades: Boolean(acad.hasGrades),
    reasons
  };
}

/**
 * NODO 3 & 17: REGLA DE CALIFICACIONES (HARD BLOCKER - PRIORIDAD 1)
 */
export class AcademicActivityRule implements DecisionRule {
  id = 'RULE_ACADEMIC_GRADES_BLOCKER';
  name = 'Restricción Fuerte por Calificaciones y Devengamiento';
  priority = 1; // Prioridad más alta
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.7.d';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const acad = caseData.academic || { enteredVirtualClassroom: false };

    if (acad.hasGrades) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: this.article,
        explanation: 'El estudiante ya cuenta con calificaciones asentadas en el bimestre 1 o inicial. Por principio de devengamiento del servicio educativo, queda terminantemente bloqueada cualquier cancelación de venta y debe dictaminarse BAJA.',
        targetClassification: 'BAJA',
        targetRootCause: 'DEVENGAMIENTO_SERVICIO_CALIFICACIONES',
        hardBlocker: 'CANCELACION_VENTA_BLOQUEADA_POR_CALIFICACIONES',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['academic.hasGrades', 'SIU_KARDEX'],
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
      explanation: 'El estudiante no tiene calificaciones registradas. No existe impedimento de devengamiento para evaluar cancelación de venta.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['academic.hasGrades'],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return ['SIU_KARDEX', 'HISTORIAL_ACADEMICO'];
  }
}
