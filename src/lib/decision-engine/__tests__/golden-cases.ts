import { CaseDecisionData, CancellationClassification } from '../types';
import { analyzeCancellationCase } from '../decision-engine';
import { MOCK_CASES } from '../../../mock/cases';

export interface GoldenAppliedRuleExpectation {
  id: string;
  title: string;
  status: 'CUMPLIDA' | 'DETERMINANTE';
  priority: number;
}

export interface GoldenConflictExpectation {
  ruleA: string;
  ruleB: string;
  resolutionContains?: string;
}

export interface GoldenCaseDefinition {
  id: string;
  title: string;
  category: 'OPERATIVA' | 'BAJA_CALIFICACIONES' | 'ILOCALIZABLE' | 'PREVIA_INICIO' | 'ERROR_INSCRIPCION' | 'PROMESA_VENTA' | 'MYSTERY_SHOPPER' | 'INSUFICIENTE';
  input: CaseDecisionData;
  expected: {
    classification: CancellationClassification;
    rootCause: string;
    confidence: number;
    hardBlockers: string[];
    appliedRuleIds: string[];
    appliedRules: GoldenAppliedRuleExpectation[];
    conflicts: GoldenConflictExpectation[];
    missingEvidence: string[];
  };
}

/**
 * Snapshot oficial de Casos Dorados (Golden Cases) del sistema.
 * Basado en los casos mock principales del repositorio y escenarios de frontera.
 * Cualquier cambio en las reglas normativas que altere estos resultados representará
 * una regresión no deseada.
 */
export const GOLDEN_CASES: GoldenCaseDefinition[] = [
  {
    id: 'CAVE-30274',
    title: 'Caso Principal CAVE-30274: Carga tardía de materias en aula virtual (Posgrado)',
    category: 'OPERATIVA',
    input: MOCK_CASES.find(c => c.id === 'CAVE-30274')!.decisionData,
    expected: {
      classification: 'CANCELACION_VENTA_OPERATIVA',
      rootCause: 'CARGA_TARDIA_MATERIAS',
      confidence: 0.88,
      hardBlockers: [],
      appliedRuleIds: [
        'RULE_NODO12_MATERIAL_LOAD_DELAY',
        'RULE_NODO9_ENROLLMENT_ERROR',
        'RULE_NODO6_EFFECTIVE_CONTACT',
        'RULE_NODO1_DATES',
        'RULE_NODO5_STUDENT_REQUEST',
        'RULE_NODO16_RETENTION'
      ],
      appliedRules: [
        {
          id: 'RULE_NODO12_MATERIAL_LOAD_DELAY',
          title: 'Cancelación Operativa por Carga Tardía de Materias',
          status: 'DETERMINANTE',
          priority: 3
        },
        {
          id: 'RULE_NODO9_ENROLLMENT_ERROR',
          title: 'Evaluación de Error de Inscripción y Ajustes Administrativos',
          status: 'DETERMINANTE',
          priority: 5
        },
        {
          id: 'RULE_NODO6_EFFECTIVE_CONTACT',
          title: 'Evaluación de Criterios de Contacto Efectivo',
          status: 'CUMPLIDA',
          priority: 6
        },
        {
          id: 'RULE_NODO1_DATES',
          title: 'Evaluación de Fechas y Ventana de Deserción',
          status: 'CUMPLIDA',
          priority: 7
        },
        {
          id: 'RULE_NODO5_STUDENT_REQUEST',
          title: 'Evaluación de Solicitud Expresa del Estudiante',
          status: 'CUMPLIDA',
          priority: 7
        },
        {
          id: 'RULE_NODO16_RETENTION',
          title: 'Evaluación de Procedimiento de Retención Institucional',
          status: 'CUMPLIDA',
          priority: 7
        }
      ],
      conflicts: [
        {
          ruleA: 'Evaluación de Error de Inscripción y Ajustes Administrativos',
          ruleB: 'Cancelación Operativa por Carga Tardía de Materias',
          resolutionContains: 'prevalece sobre'
        },
        {
          ruleA: 'Evaluación de Solicitud Expresa del Estudiante',
          ruleB: 'Cancelación Operativa por Carga Tardía de Materias',
          resolutionContains: 'falla operativa institucional imputable a la universidad'
        },
        {
          ruleA: 'Evaluación de Procedimiento de Retención Institucional',
          ruleB: 'Cancelación Operativa por Carga Tardía de Materias',
          resolutionContains: 'falla operativa institucional imputable a la universidad'
        }
      ],
      missingEvidence: []
    }
  },
  {
    id: 'CAVE-30288',
    title: 'Caso CAVE-30288: Estudiante con Calificaciones Registradas en Bimestre 1 (Hard Blocker)',
    category: 'BAJA_CALIFICACIONES',
    input: MOCK_CASES.find(c => c.id === 'CAVE-30288')!.decisionData,
    expected: {
      classification: 'BAJA',
      rootCause: 'DEVENGAMIENTO_SERVICIO_CALIFICACIONES',
      confidence: 0.96,
      hardBlockers: ['CANCELACION_VENTA_BLOQUEADA_POR_CALIFICACIONES'],
      appliedRuleIds: ['RULE_ACADEMIC_GRADES_BLOCKER'],
      appliedRules: [
        {
          id: 'RULE_ACADEMIC_GRADES_BLOCKER',
          title: 'Restricción Fuerte por Calificaciones y Devengamiento',
          status: 'DETERMINANTE',
          priority: 1
        }
      ],
      conflicts: [],
      missingEvidence: []
    }
  },
  {
    id: 'CAVE-29941',
    title: 'Caso CAVE-29941: Protocolo de Ilocalizable Agotado (16 llamadas + 7 escritos)',
    category: 'ILOCALIZABLE',
    input: MOCK_CASES.find(c => c.id === 'CAVE-29941')!.decisionData,
    expected: {
      classification: 'CANCELACION_VENTA_ILOCALIZABLE',
      rootCause: 'AGOTAMIENTO_PROTOCOLO_ILOCALIZABLE',
      confidence: 0.43,
      hardBlockers: [],
      appliedRuleIds: [
        'RULE_NODO7_UNREACHABLE',
        'RULE_NODO1_DATES'
      ],
      appliedRules: [
        {
          id: 'RULE_NODO7_UNREACHABLE',
          title: 'Evaluación de Estudiante Ilocalizable',
          status: 'DETERMINANTE',
          priority: 6
        },
        {
          id: 'RULE_NODO1_DATES',
          title: 'Evaluación de Fechas y Ventana de Deserción',
          status: 'CUMPLIDA',
          priority: 7
        }
      ],
      conflicts: [],
      missingEvidence: [
        'AUDIO_LLAMADA_CONTACTO_EFECTIVO',
        'SOLICITUD_DEL_ESTUDIANTE',
        'BITACORA_INTENTO_RETENCION'
      ]
    }
  },
  {
    id: 'CAVE-30299',
    title: 'Caso CAVE-30299: Cancelación Operativa por Incidencia en Materias (Lic. Sistemas)',
    category: 'OPERATIVA',
    input: MOCK_CASES.find(c => c.id === 'CAVE-30299')!.decisionData,
    expected: {
      classification: 'CANCELACION_VENTA_OPERATIVA',
      rootCause: 'CARGA_TARDIA_MATERIAS',
      confidence: 0.88,
      hardBlockers: [],
      appliedRuleIds: [
        'RULE_NODO12_MATERIAL_LOAD_DELAY',
        'RULE_NODO9_ENROLLMENT_ERROR',
        'RULE_NODO6_EFFECTIVE_CONTACT',
        'RULE_NODO1_DATES',
        'RULE_NODO5_STUDENT_REQUEST',
        'RULE_NODO16_RETENTION'
      ],
      appliedRules: [
        {
          id: 'RULE_NODO12_MATERIAL_LOAD_DELAY',
          title: 'Cancelación Operativa por Carga Tardía de Materias',
          status: 'DETERMINANTE',
          priority: 3
        },
        {
          id: 'RULE_NODO9_ENROLLMENT_ERROR',
          title: 'Evaluación de Error de Inscripción y Ajustes Administrativos',
          status: 'DETERMINANTE',
          priority: 5
        },
        {
          id: 'RULE_NODO6_EFFECTIVE_CONTACT',
          title: 'Evaluación de Criterios de Contacto Efectivo',
          status: 'CUMPLIDA',
          priority: 6
        },
        {
          id: 'RULE_NODO1_DATES',
          title: 'Evaluación de Fechas y Ventana de Deserción',
          status: 'CUMPLIDA',
          priority: 7
        },
        {
          id: 'RULE_NODO5_STUDENT_REQUEST',
          title: 'Evaluación de Solicitud Expresa del Estudiante',
          status: 'CUMPLIDA',
          priority: 7
        },
        {
          id: 'RULE_NODO16_RETENTION',
          title: 'Evaluación de Procedimiento de Retención Institucional',
          status: 'CUMPLIDA',
          priority: 7
        }
      ],
      conflicts: [
        {
          ruleA: 'Evaluación de Error de Inscripción y Ajustes Administrativos',
          ruleB: 'Cancelación Operativa por Carga Tardía de Materias',
          resolutionContains: 'prevalece sobre'
        },
        {
          ruleA: 'Evaluación de Solicitud Expresa del Estudiante',
          ruleB: 'Cancelación Operativa por Carga Tardía de Materias',
          resolutionContains: 'falla operativa institucional imputable a la universidad'
        },
        {
          ruleA: 'Evaluación de Procedimiento de Retención Institucional',
          ruleB: 'Cancelación Operativa por Carga Tardía de Materias',
          resolutionContains: 'falla operativa institucional imputable a la universidad'
        }
      ],
      missingEvidence: []
    }
  }
];

export interface GoldenTestResult {
  caseId: string;
  title: string;
  passed: boolean;
  failures: string[];
  actual: {
    classification: string;
    rootCause: string;
    confidence: number;
    hardBlockers: string[];
    appliedRuleIds: string[];
    conflictsCount: number;
    missingEvidence: string[];
  };
}

export function runGoldenCasesRegression(): GoldenTestResult[] {
  const results: GoldenTestResult[] = [];

  for (const golden of GOLDEN_CASES) {
    const actual = analyzeCancellationCase(golden.input);
    const failures: string[] = [];

    // 1. Clasificación final
    if (actual.classification !== golden.expected.classification) {
      failures.push(`Clasificación errónea: se esperaba "${golden.expected.classification}", se obtuvo "${actual.classification}"`);
    }

    // 2. Causa raíz
    if (actual.rootCause !== golden.expected.rootCause) {
      failures.push(`Causa raíz errónea: se esperaba "${golden.expected.rootCause}", se obtuvo "${actual.rootCause}"`);
    }

    // 3. Reglas bloqueantes (Hard Blockers)
    const actualBlockers = actual.hardBlockers || [];
    if (JSON.stringify(actualBlockers.sort()) !== JSON.stringify([...golden.expected.hardBlockers].sort())) {
      failures.push(`Bloqueos duros no coinciden: esperados [${golden.expected.hardBlockers.join(', ')}], obtenidos [${actualBlockers.join(', ')}]`);
    }

    // 4. Reglas aplicadas
    const actualAppliedIds = actual.appliedRules.map(r => r.id);
    for (const expRuleId of golden.expected.appliedRuleIds) {
      if (!actualAppliedIds.includes(expRuleId)) {
        failures.push(`Regla esperada ausente: "${expRuleId}"`);
      }
    }
    if (actualAppliedIds.length !== golden.expected.appliedRuleIds.length) {
      failures.push(`Número de reglas aplicadas diverge: se esperaban ${golden.expected.appliedRuleIds.length}, se aplicaron ${actualAppliedIds.length}`);
    }

    // 5. Conflictos resueltos
    const actualConflicts = actual.conflicts || [];
    if (actualConflicts.length !== golden.expected.conflicts.length) {
      failures.push(`Número de conflictos resueltos difiere: esperados ${golden.expected.conflicts.length}, detectados ${actualConflicts.length}`);
    }

    // 6. Evidencias faltantes
    const actualMissing = actual.missingEvidence || [];
    for (const expMissing of golden.expected.missingEvidence) {
      if (!actualMissing.includes(expMissing)) {
        failures.push(`Evidencia faltante esperada no reportada: "${expMissing}"`);
      }
    }

    results.push({
      caseId: golden.id,
      title: golden.title,
      passed: failures.length === 0,
      failures,
      actual: {
        classification: actual.classification,
        rootCause: actual.rootCause,
        confidence: actual.confidence,
        hardBlockers: actual.hardBlockers,
        appliedRuleIds: actualAppliedIds,
        conflictsCount: actualConflicts.length,
        missingEvidence: actualMissing
      }
    });
  }

  return results;
}
