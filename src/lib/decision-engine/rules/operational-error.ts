import { CaseDecisionData, AppliedRule, RejectedRule } from '../types';

export interface OperationalErrorEvaluation {
  hasOperationalError: boolean;
  errorCategory: string;
  appliedRule?: AppliedRule;
  rejectedRule?: RejectedRule;
  rootCause: string;
  confidenceContribution: number;
}

/**
 * Procedimiento Deserción de Estudiantes - Art. 5.9 / 5.3.c
 * PRIORIDAD 3: Errores Operativos Institucionales.
 * Contempla:
 * - Servicios Escolares: Falla en carga de materias, retraso en aula virtual.
 * - Finanzas / Cobranza: Pagos no acreditados, promociones no aplicadas.
 * - Falta de canalización: Área operativa que no transfiere a Éxito Estudiantil (Art. 5.9.c).
 * - Ajuste solicitado en primeros 20 días hábiles no ejecutado por la institución.
 */
export function evaluateOperationalError(data: CaseDecisionData): OperationalErrorEvaluation {
  const isCargaMateriasError = Boolean(data.fallaCargaMaterias || (!data.materiasCargadas && data.ingresoAula));
  const isFinanceError = Boolean(data.erroresFinancieros);
  const isScholasticError = Boolean(data.erroresAdministrativos);
  const isUnchanneledArea = data.areaOperativaCanalizoAExito === false;
  const isUnappliedAdjustment = Boolean(data.solicitudAjuste && data.ajusteDentroDe20Dias && !data.ajusteRealizado);

  if (isCargaMateriasError || isFinanceError || isScholasticError || isUnchanneledArea || isUnappliedAdjustment) {
    let cause = 'Falla operativa general';
    let details = '';

    if (isCargaMateriasError) {
      cause = 'Carga tardía de materias / falla operativa en Aula Virtual';
      details = 'Se verificó en SIU y Aula Virtual que el alumno se encontraba activo y matriculado pero con materias sin cargar en fecha de inicio.';
    } else if (isUnchanneledArea) {
      cause = 'Omisión de canalización a Éxito Estudiantil por área operativa (Art. 5.9.c)';
      details = 'El estudiante contactó al área operativa expresando deseo de cancelar y no fue transferido oportunamente a Éxito Estudiantil.';
    } else if (isFinanceError) {
      cause = 'Error administrativo de Finanzas / Cobranza / Pagos no reflejados (Art. 5.9.b)';
      details = 'Pagos o beca convenida no reflejados en SIU generando inconformidad documentada.';
    } else if (isUnappliedAdjustment) {
      cause = 'Ajuste solicitado en plazo de 20 días hábiles no ejecutado (Art. 5.3.c)';
      details = 'El estudiante solicitó ajuste curricular o administrativo en tiempo y forma sin ser atendido por el área responsable.';
    } else {
      cause = 'Inconsistencia administrativa institucional';
      details = 'Error atribuible a la operación que imposibilitó el servicio educativo pactado.';
    }

    const appliedRule: AppliedRule = {
      id: 'RULE_PRIO3_OPERATIONAL_ERROR',
      priority: 3,
      title: 'Cancelación de Venta Operativa por Falla Institucional',
      article: 'Art. 5.9 (a, b, c) / Art. 5.3.c',
      description: details,
      evidenceSource: ['SIU', 'Flokzu', 'I6', 'Aula Virtual', 'Llamada'],
      verdictContribution: 'Fundamento rector para CANCELACIÓN DE VENTA OPERATIVA',
      status: 'DETERMINANTE'
    };

    return {
      hasOperationalError: true,
      errorCategory: isCargaMateriasError ? 'CARGA_MATERIAS' : isFinanceError ? 'FINANZAS' : 'ADMINISTRATIVO',
      appliedRule,
      rootCause: cause,
      confidenceContribution: 88
    };
  }

  const rejectedRule: RejectedRule = {
    id: 'RULE_PRIO3_OPERATIONAL_ERROR',
    priority: 3,
    title: 'Evaluación de Error Operativo',
    article: 'Art. 5.9',
    reason: 'No se encontraron evidencias de errores en servicios escolares, finanzas, cobranza ni omisión de canalización.',
    missingConditions: ['Sin fallas en carga de materias en SIU', 'Pagos y promociones en orden', 'Canalización oportuna']
  };

  return {
    hasOperationalError: false,
    errorCategory: 'NINGUNO',
    rejectedRule,
    rootCause: 'Sin error operativo detectado',
    confidenceContribution: 0
  };
}
