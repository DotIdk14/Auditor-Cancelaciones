import {
  AppliedRule,
  CancellationCase,
  CancellationClassification,
  DecisionResult,
  DecisionRule,
  RejectedRule,
  RuleEvaluationResult
} from './types.js';
import { EligibilityRule } from './rules/eligibility.js';
import { DatesRule } from './rules/dates.js';
import { AcademicActivityRule } from './rules/academic-activity.js';
import { StudentRequestRule } from './rules/student-request.js';
import { EffectiveContactRule } from './rules/effective-contact.js';
import { UnreachableRule } from './rules/unreachable.js';
import { CycleChangeRule } from './rules/cycle-change.js';
import { EnrollmentErrorRule } from './rules/enrollment-error.js';
import { SalesPromiseRule } from './rules/sales-promise.js';
import { OperationalCancellationRule } from './rules/operational-cancellation.js';
import { Decision35Rule } from './rules/decision35.js';
import { Decision53Rule } from './rules/decision53.js';
import { DocumentationRule } from './rules/documentation.js';
import { MysteryShopperRule } from './rules/mystery-shopper.js';
import { RetentionRule } from './rules/retention.js';
import { resolveDecisionConflict } from './conflict-resolver.js';
import { buildReasoningAndConfidence } from './reasoning-builder.js';
import { requiredEvidenceForRule } from './evidence-evaluator.js';

export interface RuleRegistry {
  getRules(): DecisionRule[];
  register(rule: DecisionRule): void;
  unregister(ruleId: string): void;
}

function createDefaultRegistry(): RuleRegistry {
  const rules: DecisionRule[] = [
    new EligibilityRule(),
    new AcademicActivityRule(),
    new MysteryShopperRule(),
    new OperationalCancellationRule(),
    new Decision35Rule(),
    new Decision53Rule(),
    new SalesPromiseRule(),
    new EnrollmentErrorRule(),
    new CycleChangeRule(),
    new UnreachableRule(),
    new EffectiveContactRule(),
    new DatesRule(),
    new StudentRequestRule(),
    new RetentionRule(),
    new DocumentationRule()
  ];

  return {
    getRules: () => [...rules].sort((a, b) => a.priority - b.priority),
    register: (rule: DecisionRule) => {
      rules.push(rule);
    },
    unregister: (ruleId: string) => {
      const idx = rules.findIndex(r => r.id === ruleId);
      if (idx >= 0) rules.splice(idx, 1);
    }
  };
}

const defaultRegistry = createDefaultRegistry();

export function getDefaultRuleRegistry(): RuleRegistry {
  return defaultRegistry;
}

export function createRuleEngine(registry?: RuleRegistry): RuleEngine {
  return new RuleEngine(registry ?? defaultRegistry);
}

export class RuleEngine {
  private rules: DecisionRule[];

  constructor(registry?: RuleRegistry) {
    this.rules = (registry ?? defaultRegistry).getRules();
  }

  public registerRule(rule: DecisionRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  private registerDefaultRules(): void {
    // Registro de las 15 reglas del sistema
    this.rules = [
      new EligibilityRule(), // Priority 0
      new AcademicActivityRule(), // Priority 1 (Hard Blocker Calificaciones)
      new MysteryShopperRule(), // Priority 2
      new OperationalCancellationRule(), // Priority 3 (Carga tardía, Finanzas, Canalización)
      new Decision35Rule(), // Priority 3
      new Decision53Rule(), // Priority 3
      new SalesPromiseRule(), // Priority 4
      new EnrollmentErrorRule(), // Priority 5
      new CycleChangeRule(), // Priority 5
      new UnreachableRule(), // Priority 6
      new EffectiveContactRule(), // Priority 6
      new DatesRule(), // Priority 7
      new StudentRequestRule(), // Priority 7
      new RetentionRule(), // Priority 7
      new DocumentationRule() // Priority 8
    ];
  }

  public evaluate(caseData: CancellationCase): DecisionResult {
    const appliedRules: AppliedRule[] = [];
    const rejectedRules: RejectedRule[] = [];
    const candidateResults: RuleEvaluationResult[] = [];
    const missingEvidenceSet = new Set<string>();
    const evidenceReferencesSet = new Set<string>();
    const hardBlockers: string[] = [];

    // 1. NODO 0: Validación previa de datos obligatorios mínimos
    const eligibilityRule = this.rules.find(r => r.id === 'RULE_NODO0_ELIGIBILITY') || new EligibilityRule();
    const eligibilityResult = eligibilityRule.evaluate(caseData);

    if (!eligibilityResult.fulfilled) {
      const missing = eligibilityResult.missingEvidence || ['INFORMACION_MINIMA_INCOMPLETA'];
      const built = buildReasoningAndConfidence({
        appliedRules: [],
        rejectedRules: [],
        missingEvidence: missing,
        classification: 'REQUIERE_REVISION',
        rootCause: 'FALTA_INFORMACION_ESENCIAL',
        hasHardBlocker: false,
        determinantCount: 0,
        evidenceReferences: []
      });

      return {
        classification: 'REQUIERE_REVISION',
        status: 'REQUIERE_REVISION',
        confidence: 0.35,
        rootCause: 'FALTA_INFORMACION_ESENCIAL',
        hardBlockers: [],
        appliedRules: [],
        rejectedRules: [
          {
            id: eligibilityRule.id,
            priority: 0,
            title: eligibilityRule.name,
            article: eligibilityRule.article,
            reason: eligibilityResult.explanation,
            missingConditions: missing
          }
        ],
        missingEvidence: missing,
        inconsistencies: [`Datos mínimos ausentes: ${missing.join(', ')}`],
        reasoning: [
          'NODO 0 EJECUTADO: Validación de datos mínimos.',
          eligibilityResult.explanation,
          'Dictamen detenido: No se puede clasificar un caso sin fechas o motivo del estudiante.'
        ],
        evidenceReferences: [],
        tipo: 'REQUIERE_REVISION',
        classificationName: 'Requiere Revisión',
        causaRaiz: 'Falta información esencial',
        dictamenSugerido: built.dictamenSugerido,
        politicaArticulo: eligibilityRule.article,
        prioridadRegla: 0,
        evidenciasNecesarias: missing,
        analizadoEn: new Date().toISOString()
      };
    }

    // 2. Ejecución ordenada de la jerarquía de reglas
    for (const rule of this.rules) {
      if (rule.id === 'RULE_NODO0_ELIGIBILITY') continue;

      const evalResult = rule.evaluate(caseData);

      // Chequeo de evidencia requerida
      const evStatus = requiredEvidenceForRule(rule.id, caseData);
      for (const ref of evStatus.references) evidenceReferencesSet.add(ref);

      if (evalResult.fulfilled) {
        appliedRules.push({
          id: evalResult.ruleId,
          priority: evalResult.priority,
          title: evalResult.ruleName,
          article: evalResult.article,
          description: evalResult.explanation,
          evidenceSource: evStatus.references.length > 0 ? evStatus.references : ['EXPEDIENTE_AUDITORIA'],
          verdictContribution: evalResult.targetClassification || 'Regla favorable',
          status: evalResult.determinant ? 'DETERMINANTE' : 'CUMPLIDA'
        });

        if (evalResult.targetClassification) {
          candidateResults.push(evalResult);
        }

        if (evalResult.hardBlocker) {
          hardBlockers.push(evalResult.hardBlocker);
        }

        // Si es una regla de máxima prioridad con Hard Blocker (ej. Calificaciones), corta inmediatamente
        if (evalResult.priority === 1 && evalResult.hardBlocker) {
          break;
        }
      } else {
        // Regla descartada o no cumplida
        rejectedRules.push({
          id: evalResult.ruleId,
          priority: evalResult.priority,
          title: evalResult.ruleName,
          article: evalResult.article,
          reason: evalResult.explanation,
          missingConditions: evalResult.missingEvidence || []
        });

        if (evalResult.missingEvidence && evalResult.missingEvidence.length > 0) {
          for (const m of evalResult.missingEvidence) {
            missingEvidenceSet.add(m);
          }
        }
      }
    }

    // 3. Resolución de conflictos entre reglas cumplidas
    const conflictResolution = resolveDecisionConflict(candidateResults);

    let finalClassification: CancellationClassification = 'REQUIERE_REVISION';
    let finalRootCause = 'NO_DETERMINADA';
    let activeArticle = 'GDM_GAM_PRD_MLG_003';
    let activePriority = 7;

    if (conflictResolution.selectedRule) {
      finalClassification = conflictResolution.selectedRule.targetClassification || 'REQUIERE_REVISION';
      finalRootCause = conflictResolution.selectedRule.targetRootCause || 'POLITICA_GENERAL';
      activeArticle = conflictResolution.selectedRule.article;
      activePriority = conflictResolution.selectedRule.priority;
    } else {
      // Si no hubo candidatos determinantes, revisar si faltan intentos mínimos
      const unreachableEval = rejectedRules.find(r => r.id === 'RULE_NODO7_UNREACHABLE');
      if (unreachableEval && unreachableEval.missingConditions.length > 0) {
        finalClassification = 'REQUIERE_REVISION';
        finalRootCause = 'INTENTOS_MINIMOS_INSUFICIENTES';
      }
    }

    const missingList = Array.from(missingEvidenceSet);
    const evidenceList = Array.from(evidenceReferencesSet);

    // 4. Construcción de razonamiento y confianza
    const built = buildReasoningAndConfidence({
      appliedRules,
      rejectedRules,
      conflicts: conflictResolution.conflicts,
      missingEvidence: missingList,
      classification: finalClassification,
      rootCause: finalRootCause,
      hasHardBlocker: hardBlockers.length > 0,
      determinantCount: appliedRules.filter(a => a.status === 'DETERMINANTE').length,
      evidenceReferences: evidenceList
    });

    const reasoning = [
      ...built.reasoning,
      ...conflictResolution.resolutionReasoning
    ];

    // Mapeo amigable de nombres para UI
    const classificationDisplayNames: Record<string, string> = {
      CANCELACION_VENTA: 'Cancelación de Venta',
      CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE: 'Cancelación de Venta a Solicitud del Estudiante',
      CANCELACION_VENTA_ILOCALIZABLE: 'Cancelación de Venta por Ilocalizable',
      CANCELACION_VENTA_OPERATIVA: 'Cancelación de Venta Operativa',
      CANCELACION_VENTA_PROMESA_NO_CUMPLIDA: 'Cancelación de Venta por Promesa No Cumplida',
      CANCELACION_DE_MATRICULA: 'Cancelación de Matrícula (Mystery Shopper)',
      BAJA: 'Baja Definitiva',
      REQUIERE_REVISION: 'Requiere Revisión Manual'
    };

    return {
      classification: finalClassification,
      status: finalClassification === 'REQUIERE_REVISION' ? 'REQUIERE_REVISION' : 'PROPOSED',
      confidence: built.confidence,
      rootCause: finalRootCause,
      hardBlockers,
      appliedRules,
      rejectedRules,
      missingEvidence: missingList,
      inconsistencies: built.inconsistencies,
      reasoning,
      evidenceReferences: evidenceList,
      conflicts: conflictResolution.conflicts,

      // Aliases for Spanish/UI compatibility
      reglasAplicadas: appliedRules,
      reglasDescartadas: rejectedRules,
      conflictos: conflictResolution.conflicts,

      // Compatibilidad con vistas existentes
      tipo: finalClassification,
      classificationName: classificationDisplayNames[finalClassification] || finalClassification,
      causaRaiz: finalRootCause.replace(/_/g, ' ').toLowerCase(),
      dictamenSugerido: built.dictamenSugerido,
      politicaArticulo: activeArticle,
      prioridadRegla: activePriority,
      evidenciasNecesarias: missingList,
      analizadoEn: new Date().toISOString()
    };
  }
}
