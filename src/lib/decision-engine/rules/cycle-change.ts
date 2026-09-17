import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';

export class CycleChangeRule implements DecisionRule {
  id = 'RULE_NODO8_CYCLE_CHANGE';
  name = 'Evaluación de Cambio de Ciclo';
  priority = 5;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.4 / Cambios de Ciclo';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const cycle = caseData.cycleChange;

    if (!cycle?.requested) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'No se identifica solicitud ni gestión de cambio de ciclo en el caso.',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: [],
        missingEvidence: []
      };
    }

    // 1. Estudiantes con revalidación / equivalencia
    if (cycle.isRevalidation) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: 'Art. 5.4.b',
        explanation: 'El cambio de ciclo corresponde a un estudiante con trámite de revalidación/equivalencia. Conforme a la política, NO aplica cancelación de venta.',
        targetClassification: 'BAJA',
        targetRootCause: 'CAMBIO_CICLO_REVALIDACION_EXCLUIDO',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['cycleChange.isRevalidation'],
        missingEvidence: []
      };
    }

    // 2. Gestionado por Éxito Estudiantil como estrategia de retención al inicio
    if (cycle.isRetentionStrategyAtStart || (cycle.managedBy === 'EXITO_ESTUDIANTIL' && !cycle.requestedBeforeStart)) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: 'Art. 5.4.c',
        explanation: 'El cambio de ciclo fue gestionado por Éxito Estudiantil al inicio de clases como estrategia de retención. Si el estudiante no ingresa al nuevo ciclo, se debe seguir el procedimiento de retención y NO asumir automáticamente cancelación de venta.',
        targetClassification: 'REQUIERE_REVISION',
        targetRootCause: 'CAMBIO_CICLO_ESTRATEGIA_RETENCION',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['cycleChange.managedBy'],
        missingEvidence: ['BITACORA_RETENCION_NUEVO_CICLO']
      };
    }

    // 3. Gestionado antes del inicio por Matrícula o Éxito
    if (cycle.requestedBeforeStart && (cycle.managedBy === 'MATRICULA' || cycle.managedBy === 'EXITO_ESTUDIANTIL')) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: false,
        priority: this.priority,
        article: 'Art. 5.4.a',
        explanation: 'Cambio de ciclo gestionado formalmente antes del inicio de clases por Gestión de Matrícula o Éxito. Procede evaluación de cancelación de venta si se confirma la desvinculación.',
        targetClassification: 'CANCELACION_VENTA',
        targetRootCause: 'CAMBIO_CICLO_PREVIO_AL_INICIO',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['cycleChange.managedBy', 'cycleChange.requestedBeforeStart'],
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
      explanation: 'Cambio de ciclo registrado; requiere evaluar el comportamiento en el ciclo destino.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['cycleChange'],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return ['TICKET_CAMBIO_CICLO', 'HISTORIAL_MATRICULA_SIU'];
  }
}
