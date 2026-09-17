import { AppliedRule, RejectedRule, RuleConflict, RuleEvaluationResult } from './types';

export interface ReasoningResult {
  reasoning: string[];
  confidence: number;
  inconsistencies: string[];
  dictamenSugerido: string;
}

export function buildReasoningAndConfidence(params: {
  appliedRules: AppliedRule[];
  rejectedRules: RejectedRule[];
  conflicts?: RuleConflict[];
  missingEvidence: string[];
  classification: string;
  rootCause: string;
  hasHardBlocker: boolean;
  determinantCount: number;
  evidenceReferences: string[];
}): ReasoningResult {
  const reasoning: string[] = [];
  const inconsistencies: string[] = [];

  // 1. Trazabilidad de reglas aplicadas
  for (const app of params.appliedRules) {
    if (app.status === 'DETERMINANTE') {
      reasoning.push(`✓ [DETERMINANTE] ${app.title}: ${app.description}`);
    } else {
      reasoning.push(`✓ ${app.title}: ${app.verdictContribution}`);
    }
  }

  // 2. Reglas descartadas relevantes
  for (const rej of params.rejectedRules) {
    if (rej.priority <= 6) {
      reasoning.push(`✗ Descartada: ${rej.title}. Motivo: ${rej.reason}`);
    }
  }

  // 3. Conflictos resueltos
  if (params.conflicts && params.conflicts.length > 0) {
    for (const c of params.conflicts) {
      reasoning.push(`⚡ Detección de Conflicto: ${c.ruleA.name} vs ${c.ruleB.name}. Resolución: ${c.resolution}`);
    }
  }

  const missingEv = params.missingEvidence || [];
  const evRefs = params.evidenceReferences || [];

  // 4. Inconsistencias o evidencias faltantes
  if (missingEv.length > 0) {
    reasoning.push(`⚠️ Evidencia pendiente: ${missingEv.join(', ')}.`);
    inconsistencies.push(...missingEv.map(m => `Falta evidencia requerida: ${m}`));
  }

  // 5. Cálculo de confianza interna (0.50 a 0.98)
  // Medida interna basada en:
  // - Determinantes cumplidos (+0.25)
  // - Evidencia documentada (+0.15)
  // - Penalización por evidencia faltante (-0.20 por item)
  // - Penalización por conflictos no resueltos o estado requiere revisión
  let rawConfidence = 0.70;

  if (params.hasHardBlocker) {
    rawConfidence = 0.96;
  } else if (params.determinantCount >= 1) {
    rawConfidence += 0.18;
  }

  if (evRefs.length >= 2) {
    rawConfidence += 0.08;
  }

  if (missingEv.length > 0) {
    rawConfidence -= missingEv.length * 0.15;
  }

  if (params.classification === 'REQUIERE_REVISION') {
    rawConfidence = Math.min(rawConfidence, 0.45);
  }

  const confidence = Math.max(0.30, Math.min(0.97, Math.round(rawConfidence * 100) / 100));

  // 6. Dictamen redactado
  let dictamenSugerido = '';
  switch (params.classification) {
    case 'CANCELACION_VENTA_OPERATIVA':
      dictamenSugerido = `De acuerdo a la política institucional y a las evidencias cotejadas, se dictamina CANCELACIÓN DE VENTA OPERATIVA debido a que se comprobó la causal "${params.rootCause}", generando afectación en el servicio educativo que motivó la solicitud de desvinculación formal del estudiante.`;
      break;
    case 'CANCELACION_VENTA_ILOCALIZABLE':
      dictamenSugerido = `Se dictamina CANCELACIÓN DE VENTA POR ILOCALIZABLE al haberse verificado el cumplimiento riguroso de los intentos mínimos de contacto (mínimo 15 llamadas y 6 interacciones escritas alternadas) durante las dos primeras semanas sin contacto efectivo ni actividad académica en plataforma.`;
      break;
    case 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE':
    case 'CANCELACION_VENTA':
      dictamenSugerido = `Se dictamina CANCELACIÓN DE VENTA A SOLICITUD DEL ESTUDIANTE al acreditarse manifestación formal presentada en tiempo conforme al Art. 5.3 del procedimiento de deserción.`;
      break;
    case 'CANCELACION_VENTA_PROMESA_NO_CUMPLIDA':
      dictamenSugerido = `Se dictamina CANCELACIÓN DE VENTA POR PROMESA NO CUMPLIDA al comprobarse discrepancia o información tendenciosa durante el proceso comercial de inscripción (Art. 5.6).`;
      break;
    case 'CANCELACION_DE_MATRICULA':
      dictamenSugerido = `Procede CANCELACIÓN DE MATRÍCULA por corresponder al canal evaluador Mystery Shopper (Art. 5.10.a), sin repercusión en el indicador de cancelaciones de venta.`;
      break;
    case 'BAJA':
      dictamenSugerido = `Se dictamina trámite de BAJA DEFINITIVA en virtud de la causal "${params.rootCause}", en apego a los lineamientos del procedimiento de deserción estudiantil.`;
      break;
    case 'REQUIERE_REVISION':
    default:
      dictamenSugerido = `El caso REQUIERE REVISIÓN por auditor de calidad debido a información incompleta o inconsistente. Evidencias a subsanar: ${params.missingEvidence.join(', ')}.`;
  }

  return {
    reasoning,
    confidence,
    inconsistencies,
    dictamenSugerido
  };
}
