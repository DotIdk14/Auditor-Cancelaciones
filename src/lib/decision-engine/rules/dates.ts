import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types';

/**
 * Parsea fechas en formatos 'YYYY-MM-DD' o 'DD/MM/YYYY'
 */
export function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function getDaysFromStart(startDateStr?: string, requestDateStr?: string): number {
  const start = parseDate(startDateStr);
  const request = parseDate(requestDateStr);
  if (!start || !request) return 0;
  const diffTime = request.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function isWithinDesertionPeriod(startDateStr?: string, requestDateStr?: string): boolean {
  const days = getDaysFromStart(startDateStr, requestDateStr);
  // Política: Deserción aplica para eventos desde el inicio hasta 30 días posteriores
  return days >= 0 && days <= 30;
}

export function isWithinCancellationWindow(startDateStr?: string, requestDateStr?: string): boolean {
  const days = getDaysFromStart(startDateStr, requestDateStr);
  // Política: Cancelaciones de venta solo pueden solicitarse durante las primeras 2 semanas (14 días naturales)
  return days >= 0 && days <= 14;
}

export function isPriorToStart(startDateStr?: string, requestDateStr?: string): boolean {
  const days = getDaysFromStart(startDateStr, requestDateStr);
  return days < 0;
}

/**
 * NODO 1 & 2: PERIODO DE DESERCIÓN Y FECHA DE SOLICITUD
 */
export class DatesRule implements DecisionRule {
  id = 'RULE_NODO1_DATES';
  name = 'Evaluación de Fechas y Ventana de Deserción';
  priority = 7;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.3 / Periodos de Cancelación';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const startStr = caseData.dates?.startDate;
    const reqStr = caseData.dates?.requestDate;

    const days = getDaysFromStart(startStr, reqStr);
    const prior = isPriorToStart(startStr, reqStr);
    const withinDesertion = isWithinDesertionPeriod(startStr, reqStr);
    const withinWindow = isWithinCancellationWindow(startStr, reqStr);

    if (prior) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: 'Art. 5.3.a.I',
        explanation: `La solicitud fue presentada ${Math.abs(days)} días antes del inicio oficial del ciclo (${startStr}). Conforme al Art. 5.3.a.I, si el estudiante solicita no continuar previo al inicio, aplica cancelación de venta a solicitud del estudiante.`,
        targetClassification: 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE',
        targetRootCause: 'SOLICITUD_PREVIA_AL_INICIO',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['dates.startDate', 'dates.requestDate'],
        missingEvidence: []
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      fulfilled: true,
      determinant: false,
      priority: this.priority,
      article: 'Art. 5.3.a.II',
      explanation: `Solicitud realizada ${days} días naturales posteriores al inicio de clases. Está ${withinDesertion ? 'dentro' : 'fuera'} del periodo de deserción (30 días) y ${withinWindow ? 'dentro' : 'fuera'} de la ventana regular de cancelación de venta de 2 semanas.`,
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: ['dates.startDate', 'dates.requestDate'],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return ['FECHA_INICIO', 'FECHA_SOLICITUD'];
  }
}
