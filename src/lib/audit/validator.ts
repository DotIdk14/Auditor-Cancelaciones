import { AuditResult, AuditResultSchema, type AuditEvidenceItem } from './types.js';
import { POLICY_META, validateNormativeRef } from './policy.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida la respuesta estructurada del modelo contra el esquema esperado.
 */
export function validateAuditResult(raw: unknown): ValidationResult {
  const result = AuditResultSchema.safeParse(raw);

  if (!result.success) {
    return {
      valid: false,
      errors: [`Esquema inválido: ${result.error.message}`],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const data = result.data;

  // 1. Validar política
  if (data.politica.codigo !== POLICY_META.codigo) {
    errors.push(`Código de política incorrecto: ${data.politica.codigo} (esperado: ${POLICY_META.codigo})`);
  }
  if (data.politica.version !== POLICY_META.version) {
    errors.push(`Versión de política incorrecta: ${data.politica.version} (esperado: ${POLICY_META.version})`);
  }

  // 2. Validar cobertura
  if (data.cobertura.length === 0) {
    warnings.push('No se reportó cobertura de evidencias');
  }
  for (const cov of data.cobertura) {
    if (cov.estado === 'ERROR' && !cov.error) {
      warnings.push(`Evidencia ${cov.evidenceId} en ERROR sin mensaje de error`);
    }
    if (cov.paginasEnviadas.length === 0 && cov.estado !== 'ERROR') {
      warnings.push(`Evidencia ${cov.evidenceId} sin páginas enviadas`);
    }
  }

  // 3. Validar citas normativas
  const invalidRefs: string[] = [];
  for (const rule of data.reglasEvaluadas) {
    const validation = validateNormativeRef(rule.numeral);
    if (!validation.valid) {
      invalidRefs.push(`${rule.numeral}: ${validation.suggestion}`);
    }
    for (const cita of rule.citasNormativas) {
      const refValidation = validateNormativeRef(cita);
      if (!refValidation.valid) {
        invalidRefs.push(`Cita "${cita}": ${refValidation.suggestion}`);
      }
    }
  }
  if (invalidRefs.length > 0) {
    warnings.push(`Citas normativas inválidas: ${invalidRefs.join('; ')}`);
  }

  // 4. Validar resultado
  const validClassifications = [
    'CANCELACION_VENTA',
    'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE',
    'CANCELACION_VENTA_ILOCALIZABLE',
    'CANCELACION_VENTA_OPERATIVA',
    'CANCELACION_VENTA_PROMESA_NO_CUMPLIDA',
    'CANCELACION_DE_MATRICULA',
    'BAJA',
    'REQUIERE_REVISION',
  ];
  if (!validClassifications.includes(data.resultado.clasificacion)) {
    errors.push(`Clasificación inválida: ${data.resultado.clasificacion}`);
  }

  if (data.resultado.confianza < 0 || data.resultado.confianza > 1) {
    errors.push(`Confianza fuera de rango: ${data.resultado.confianza}`);
  }

  if (!data.resultado.dictamen || data.resultado.dictamen.trim().length < 50) {
    warnings.push('Dictamen demasiado corto o vacío');
  }

  // 5. Validar que hallazgos tengan evidencia
  for (const h of data.hallazgos) {
    if (h.confianza === 'ALTA' && h.evidenceRefs.length === 0) {
      warnings.push(`Hallazgo ${h.id} de alta confianza sin referencias de evidencia`);
    }
  }

  // 6. Validar que reglas determinantes tengan fundamentación
  for (const rule of data.reglasEvaluadas) {
    if (rule.status === 'NO_CUMPLE' && rule.fundamentacion.length < 20) {
      warnings.push(`Regla ${rule.numeral} marcada como NO_CUMPLE con fundamentación insuficiente`);
    }
  }

  // 7. Detectar inconsistencia entre resultado y reglas
  const hasBlockingRule = data.reglasEvaluadas.some(r => r.status === 'NO_CUMPLE' && r.fundamentacion.includes('bloquea'));
  const isRequiereRevision = data.resultado.clasificacion === 'REQUIERE_REVISION';
  if (hasBlockingRule && !isRequiereRevision) {
    warnings.push('Hay reglas bloqueantes pero el resultado no es REQUIERE_REVISION');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida la integridad del resultado contra las evidencias procesadas.
 */
export function validateResultIntegrity(
  resultado: AuditResult,
  evidenceItems: AuditEvidenceItem[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar que todas las evidencias estén en cobertura
  const coverageIds = new Set(resultado.cobertura.map(c => c.evidenceId));
  for (const ev of evidenceItems) {
    if (!coverageIds.has(ev.evidenceId)) {
      warnings.push(`Evidencia ${ev.evidenceId} (${ev.nombreArchivo}) no reportada en cobertura`);
    }
  }

  // Verificar que las referencias de evidencia en hallazgos existan
  const allEvidenceIds = new Set(evidenceItems.map(e => e.evidenceId));
  for (const h of resultado.hallazgos) {
    for (const ref of h.evidenceRefs) {
      if (!allEvidenceIds.has(ref) && !coverageIds.has(ref)) {
        warnings.push(`Hallazgo ${h.id} referencia evidencia inexistente: ${ref}`);
      }
    }
  }

  // Verificar que las referencias de reglas existan
  for (const rule of resultado.reglasEvaluadas) {
    for (const ref of rule.evidenceRefs) {
      if (!allEvidenceIds.has(ref.evidenceId) && !coverageIds.has(ref.evidenceId)) {
        warnings.push(`Regla ${rule.numeral} referencia evidencia inexistente: ${ref.evidenceId}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Reintenta la llamada al modelo si el resultado es inválido.
 */
export function shouldRetry(validation: ValidationResult): boolean {
  // Reintentar solo si hay errores de esquema, no de integridad
  return !validation.valid && validation.errors.some(e => e.includes('Esquema inválido'));
}
