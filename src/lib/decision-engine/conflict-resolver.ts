import { CancellationClassification, RuleConflict, RuleEvaluationResult } from './types';

export interface ConflictResolutionResult {
  hasConflict: boolean;
  conflicts: RuleConflict[];
  selectedRule?: RuleEvaluationResult;
  resolutionReasoning: string[];
}

/**
 * NODO 18 — REGLAS DE CONFLICTO
 * Resuelve colisiones de interpretación cuando dos o más reglas se cumplen simultáneamente.
 */
export function resolveDecisionConflict(candidates: RuleEvaluationResult[]): ConflictResolutionResult {
  const conflicts: RuleConflict[] = [];
  const resolutionReasoning: string[] = [];

  if (candidates.length <= 1) {
    return {
      hasConflict: false,
      conflicts: [],
      selectedRule: candidates[0],
      resolutionReasoning: []
    };
  }

  // Ordenar candidatos por prioridad numérica ascendente (1 es la más alta)
  const sorted = [...candidates].sort((a, b) => a.priority - b.priority);
  const primary = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const secondary = sorted[i];

    // Detectar conflicto si las clasificaciones propuestas son diferentes
    if (primary.targetClassification !== secondary.targetClassification) {
      let resolution = `Por jerarquía de políticas de auditoría, la regla "${primary.ruleName}" (Prioridad ${primary.priority}) prevalece sobre "${secondary.ruleName}" (Prioridad ${secondary.priority}).`;

      // Escenario 1: Solicitud general del estudiante (Prioridad 7) vs Falla Operativa (Prioridad 3)
      if (
        (secondary.ruleId.includes('STUDENT_REQUEST') || secondary.ruleId.includes('RETENTION')) &&
        (primary.ruleId.includes('OPERATIONAL') || primary.ruleId.includes('MATERIAL_LOAD'))
      ) {
        resolution = 'La solicitud fue posterior al inicio (que ordinariamente implicaría baja), pero al acreditarse una falla operativa institucional imputable a la universidad (Art. 5.9), esta regla específica prevalece y exime al estudiante de la baja, dictaminando Cancelación de Venta Operativa.';
      }

      // Escenario 2: Solicitud del estudiante (Prioridad 7) vs Promesa de venta comprobada (Prioridad 4)
      if (
        (secondary.ruleId.includes('STUDENT_REQUEST') || secondary.ruleId.includes('RETENTION')) &&
        primary.ruleId.includes('SALES_PROMISE')
      ) {
        resolution = 'Acreditada la tergiversación o promesa de venta no cumplida en la contratación comercial (Art. 5.6), esta causal de nulidad comercial prevalece sobre la regla residual de baja por fecha.';
      }

      // Escenario 3: Calificaciones en Bimestre 1 (Prioridad 1) vs cualquier causal de cancelación
      if (primary.ruleId.includes('GRADES') || primary.hardBlocker) {
        resolution = 'RESTRICCIÓN ABSOLUTA: Por principio de devengamiento del servicio (Art. 5.7.d), la existencia de calificaciones asienta el servicio como devengado, invalidando de forma prioritaria cualquier cancelación de venta y forzando BAJA.';
      }

      conflicts.push({
        ruleA: {
          name: secondary.ruleName,
          classification: secondary.targetClassification || 'REQUIERE_REVISION',
          priority: secondary.priority,
          fundamento: secondary.explanation
        },
        ruleB: {
          name: primary.ruleName,
          classification: primary.targetClassification || 'REQUIERE_REVISION',
          priority: primary.priority,
          fundamento: primary.explanation
        },
        resolution,
        selectedClassification: primary.targetClassification || 'REQUIERE_REVISION'
      });

      resolutionReasoning.push(`Conflicto resuelto: ${primary.ruleName} prevalece sobre ${secondary.ruleName}. ${resolution}`);
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    selectedRule: primary,
    resolutionReasoning
  };
}
