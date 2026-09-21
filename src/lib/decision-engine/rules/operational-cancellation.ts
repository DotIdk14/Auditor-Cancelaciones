import { CancellationCase, DecisionRule, RuleEvaluationResult, OperationalSubtype } from '../types';

export class OperationalCancellationRule implements DecisionRule {
  id = 'RULE_NODO11_OPERATIONAL_CANCELLATION';
  name = 'Evaluación de Cancelación de Venta Operativa';
  priority = 3;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.9 / Art. 5.3.c';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const op = caseData.operational || {};
    const raw = caseData.rawDecisionData;

    // NODO 12: Carga tardía de materias (Escenario explícito)
    const isMaterialLoadDelay =
      op.materialLoadError ||
      raw?.fallaCargaMaterias ||
      (raw?.materiasCargadas === false && (caseData.dates?.requestDate || raw?.fechaSolicitud));

    if (isMaterialLoadDelay) {
      const studentUpset = op.studentUpsetByError ?? true;
      const cancellationWanted = !caseData.request?.wantsToContinue || caseData.request?.explicitCancellationRequest || raw?.intencionCancelacionManifiesta;

      if (studentUpset && cancellationWanted) {
        return {
          ruleId: 'RULE_NODO12_MATERIAL_LOAD_DELAY',
          ruleName: 'Cancelación Operativa por Carga Tardía de Materias',
          fulfilled: true,
          determinant: true,
          priority: this.priority,
          article: 'Art. 5.9.a / Carga de Materias a Destiempo',
          explanation: `Se acreditó que el estudiante no contó con materias cargadas oportunamente al inicio del ciclo escolar oficial, provocando imposibilidad de cursar y molestia manifiesta que motivó la solicitud de desvinculación formal dentro del periodo. Procede Cancelación de Venta Operativa.`,
          targetClassification: 'CANCELACION_VENTA_OPERATIVA',
          targetRootCause: 'CARGA_TARDIA_MATERIAS',
          requiredEvidence: this.requiredEvidence(),
          evidenceReferences: [
            'operational.materialLoadError',
            'SIU_REPORTE_CARGA_MATERIAS',
            'AULA_VIRTUAL_SIN_ASIGNACION',
            'TICKET_FLOKZU_CAVE'
          ],
          missingEvidence: []
        };
      }
    }

    // Submotivo: Error de Finanzas / Cobranza (Pagos no reflejados / promociones no aplicadas)
    if (op.financialError || op.collectionsError || op.paymentNotReflected || op.missingPromotion || raw?.erroresFinancieros) {
      return {
        ruleId: 'RULE_OP_FINANZAS_COBRANZA',
        ruleName: 'Cancelación Operativa por Falla Administrativa de Finanzas/Cobranza',
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: 'Art. 5.9.b',
        explanation: 'Falla comprobada en área de Finanzas o Cobranza (pagos no reflejados o promoción omitida) que generó desconfianza e inconformidad motivando la solicitud de no continuidad.',
        targetClassification: 'CANCELACION_VENTA_OPERATIVA',
        targetRootCause: op.collectionsError ? 'ERROR_ADMINISTRATIVO_COBRANZA' : 'ERROR_ADMINISTRATIVO_FINANZAS',
        requiredEvidence: ['COMPROBANTE_PAGO', 'ESTADO_CUENTA_SIU'],
        evidenceReferences: ['operational.financialError', 'SIU_PAGOS'],
        missingEvidence: []
      };
    }

    // Submotivo: Falta de canalización formal a Éxito Estudiantil por área operativa
    if (op.areaFailedToChannel || (raw?.areaOperativaCanalizoAExito === false && raw?.contactoConExitoEstudiantil === false)) {
      return {
        ruleId: 'RULE_OP_FALTA_CANALIZACION',
        ruleName: 'Cancelación Operativa por Falta de Canalización a Éxito Estudiantil',
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: 'Art. 5.9.c',
        explanation: 'El estudiante solicitó cancelación formal ante un área operativa y esta omitió realizar la transferencia y notificación en tiempo a Gestión de Éxito Estudiantil.',
        targetClassification: 'CANCELACION_VENTA_OPERATIVA',
        targetRootCause: 'FALTA_CANALIZACION_AREA_OPERATIVA',
        requiredEvidence: ['BITACORA_TRANSFERENCIA_CRM'],
        evidenceReferences: ['operational.areaFailedToChannel'],
        missingEvidence: []
      };
    }

    // Submotivo: Error de Validación del Paquete de Venta
    if (op.operationalSubType === 'OP_VALIDACION_PAQUETE' || op.incorrectPackage) {
      return {
        ruleId: 'RULE_OP_VALIDACION_PAQUETE',
        ruleName: 'Cancelación Operativa por Error en Validación del Paquete de Venta',
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: 'Art. 5.9.d',
        explanation: 'La confirmación del paquete no cumplió al 100% con lo pactado comercialmente por error de validación interna no atribuible al asesor comercial.',
        targetClassification: 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE',
        targetRootCause: 'ERROR_VALIDACION_PAQUETE',
        requiredEvidence: ['EXPEDIENTE_VALIDACION_PAQUETE'],
        evidenceReferences: ['operational.operationalSubType'],
        missingEvidence: []
      };
    }

    // Si hay otro error operativo general
    if (op.operationalError || raw?.erroresAdministrativos) {
      return {
        ruleId: 'RULE_OP_GENERAL',
        ruleName: 'Cancelación Operativa por Error Administrativo',
        fulfilled: true,
        determinant: true,
        priority: this.priority,
        article: 'Art. 5.9',
        explanation: 'Se comprobó falla operativa institucional atribuible a la universidad que impidió el curso regular de las materias.',
        targetClassification: 'CANCELACION_VENTA_OPERATIVA',
        targetRootCause: 'ERROR_OPERATIVO_INSTITUCIONAL',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['operational.operationalError'],
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
      explanation: 'Descartada: No se acreditan fallas operativas institucionales en carga de materias, finanzas o canalización.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: [],
      missingEvidence: []
    };
  }

  requiredEvidence(): string[] {
    return [
      'SIU_HISTORIAL_CARGA_MATERIAS',
      'FLOKZU_TICKET_SERVICIO',
      'GRABACION_LLAMADA_O_CHAT_SOPORTE'
    ];
  }
}
