import { CaseDecisionData, AppliedRule, RejectedRule } from '../types';

export interface UnreachableStudentEvaluation {
  isUnreachable: boolean;
  appliedRule?: AppliedRule;
  rejectedRule?: RejectedRule;
  missingConditions: string[];
  rootCause: string;
}

/**
 * Procedimiento Deserción de Estudiantes - Art. 5.2 / Art. 5.8
 * PRIORIDAD 6: Estudiante Ilocalizable.
 * Requisitos acumulativos:
 * 1. Mínimo 15 llamadas (al menos dos diarias en horarios distintos) durante las 2 primeras semanas.
 * 2. Mínimo 6 interacciones por medios escritos en diferentes horarios.
 * 3. Ausencia total de contacto efectivo.
 * 4. Nivel educativo:
 *    - Licenciaturas: No haber seleccionado modalidad de evaluación en ninguna asignatura activa.
 *    - Posgrados / Ejecutivas / Alianzas: No haber ingresado a ninguna asignatura activa.
 * 5. Si existe actividad válida en alguna asignatura -> se DESCARTA ilocalizable (Art. 5.8.j nota).
 */
export function evaluateUnreachableStudent(data: CaseDecisionData): UnreachableStudentEvaluation {
  const missingConditions: string[] = [];

  // Llamadas
  const meetsCallsCount = data.llamadas >= 15;
  if (!meetsCallsCount) {
    missingConditions.push(`Llamadas insuficientes (${data.llamadas}/15 llamadas mínimas requeridas)`);
  }

  const meetsCallsTiming = data.llamadasValidasPorHorario ?? (data.llamadas >= 15);
  if (!meetsCallsTiming && meetsCallsCount) {
    missingConditions.push('No cumple con al menos 2 llamadas diarias en horarios diferentes');
  }

  // Interacciones escritas
  const meetsWrittenInteractions = data.interaccionesEscritas >= 6;
  if (!meetsWrittenInteractions) {
    missingConditions.push(`Interacciones escritas insuficientes (${data.interaccionesEscritas}/6 mínimas requeridas)`);
  }

  // Contacto efectivo (si hubo contacto efectivo, NO es ilocalizable)
  const hasEffectiveContact = Boolean(data.contactoEfectivo);
  if (hasEffectiveContact) {
    missingConditions.push('Existe contacto efectivo documentado con el alumno');
  }

  // Actividad académica que descarte ilocalizable
  let hasActivityThatDiscards = false;
  if (data.nivelEducativo === 'LICENCIATURA' && data.seleccionModalidad) {
    hasActivityThatDiscards = true;
    missingConditions.push('El estudiante de Licenciatura ya seleccionó modalidad de evaluación en plataforma');
  } else if (data.nivelEducativo !== 'LICENCIATURA' && data.ingresoAula) {
    hasActivityThatDiscards = true;
    missingConditions.push('El estudiante de Posgrado/Ejecutiva ya realizó ingreso a asignaturas en Aula Virtual');
  }

  const isUnreachable = 
    meetsCallsCount && 
    meetsWrittenInteractions && 
    !hasEffectiveContact && 
    !hasActivityThatDiscards;

  if (isUnreachable) {
    const appliedRule: AppliedRule = {
      id: 'RULE_PRIO6_UNREACHABLE',
      priority: 6,
      title: 'Cancelación de Venta por Estudiante Ilocalizable',
      article: 'Art. 5.2.b / Art. 5.8.a',
      description: `Se agotó protocolo de localización: ${data.llamadas} llamadas, ${data.interaccionesEscritas} interacciones escritas en horarios alternos, sin contacto efectivo ni actividad académica en el nivel ${data.nivelEducativo}.`,
      evidenceSource: ['I6 / InConcert', 'Bitácora CRM', 'Aula Virtual'],
      verdictContribution: 'Determina Cancelación por Ilocalizable',
      status: 'DETERMINANTE'
    };

    return {
      isUnreachable: true,
      appliedRule,
      missingConditions: [],
      rootCause: 'Agotamiento de protocolo de localización institucional sin respuesta del alumno'
    };
  }

  const rejectedRule: RejectedRule = {
    id: 'RULE_PRIO6_UNREACHABLE',
    priority: 6,
    title: 'Descarte de Clasificación Ilocalizable',
    article: 'Art. 5.2 / Art. 5.8',
    reason: 'No se configuran los elementos estrictos del protocolo de ilocalizable.',
    missingConditions
  };

  return {
    isUnreachable: false,
    rejectedRule,
    missingConditions,
    rootCause: 'No aplica ilocalizable'
  };
}
