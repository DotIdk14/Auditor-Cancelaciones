import { CancellationCase, DecisionRule, RuleEvaluationResult } from '../types.js';
import { isPriorToStart } from './dates.js';

export function evaluateStudentIntent(caseData: CancellationCase): {
  requestType: 'REQUEST_EXPLICIT' | 'REQUEST_INFERRED' | 'NONE';
  isCancellationRequest: boolean;
  detectedPhrases: string[];
} {
  const req = caseData.request;
  const reason = (req?.reason || '').toLowerCase();
  const detectedPhrases: string[] = [];

  // Chequeo en llamadas y transcripciones
  const calls = caseData.contacts?.calls || [];
  for (const call of calls) {
    if (call.transcript && Array.isArray(call.transcript)) {
      for (const segment of call.transcript) {
        if (segment.speaker === 'customer' || segment.speaker === ('CLIENTE' as any)) {
          const t = (segment.text || '').toLowerCase();
          if (t.includes('quiero cancelar') || t.includes('cancelar mi inscripción') || t.includes('ya no quiero estudiar') || t.includes('dar de baja') || t.includes('solicito mi baja') || t.includes('desvincular')) {
            detectedPhrases.push(segment.text);
          }
        }
      }
    }
  }

  const explicitKeywords = [
    'quiero cancelar',
    'cancelar mi inscripción',
    'cancelación',
    'ya no quiero estudiar',
    'darme de baja',
    'baja definitiva',
    'desvincularme',
    'solicito cancelación',
    'solicito baja'
  ];

  const inferredKeywords = [
    'no me gustó el servicio',
    'voy a pensarlo',
    'tengo problemas',
    'no he podido entrar',
    'se me complica',
    'está caro',
    'no tengo tiempo'
  ];

  const hasExplicitReason = explicitKeywords.some(k => reason.includes(k));
  const hasInferredReason = inferredKeywords.some(k => reason.includes(k));

  if (req?.explicitCancellationRequest || detectedPhrases.length > 0 || hasExplicitReason) {
    return {
      requestType: 'REQUEST_EXPLICIT',
      isCancellationRequest: true,
      detectedPhrases
    };
  }

  if (hasInferredReason || req?.wantsToContinue === false) {
    return {
      requestType: 'REQUEST_INFERRED',
      isCancellationRequest: req?.wantsToContinue === false,
      detectedPhrases
    };
  }

  return {
    requestType: 'NONE',
    isCancellationRequest: false,
    detectedPhrases
  };
}

export class StudentRequestRule implements DecisionRule {
  id = 'RULE_NODO5_STUDENT_REQUEST';
  name = 'Evaluación de Solicitud Expresa del Estudiante';
  priority = 7;
  article = 'GDM_GAM_PRD_MLG_003 Art. 5.3.b';

  evaluate(caseData: CancellationCase): RuleEvaluationResult {
    const intent = evaluateStudentIntent(caseData);

    if (intent.requestType === 'REQUEST_EXPLICIT') {
      const isPrior = isPriorToStart(caseData.dates?.startDate, caseData.dates?.requestDate);
      const targetClassification = isPrior ? 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE' : 'BAJA';

      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: true,
        determinant: false,
        priority: this.priority,
        article: isPrior ? 'GDM_GAM_PRD_MLG_003 Art. 5.3.b' : 'GDM_GAM_PRD_MLG_003 Art. 5.3.a.II',
        explanation: isPrior
          ? 'Existe manifestación explícita e inequívoca del estudiante requiriendo la cancelación previo al inicio de clases. Procede Cancelación de Venta a Solicitud del Estudiante.'
          : 'Existe manifestación explícita del estudiante solicitando no continuar con posterioridad a la fecha de inicio. Conforme al Art. 5.3.a.II, corresponde trámite de BAJA ordinaria salvo que concurra una causa operativa institucional.',
        targetClassification,
        targetRootCause: 'SOLICITUD_DEL_ESTUDIANTE',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['request.explicitCancellationRequest', ...intent.detectedPhrases],
        missingEvidence: []
      };
    }

    if (intent.requestType === 'REQUEST_INFERRED') {
      return {
        ruleId: this.id,
        ruleName: this.name,
        fulfilled: false,
        determinant: false,
        priority: this.priority,
        article: this.article,
        explanation: 'Se detecta insatisfacción o duda, pero sin solicitud formal y explícita de cancelación (declaración inferida). Requiere confirmar si el estudiante desea formalizar la baja.',
        targetClassification: 'REQUIERE_REVISION',
        targetRootCause: 'SOLICITUD_NO_CONFIRMADA',
        requiredEvidence: this.requiredEvidence(),
        evidenceReferences: ['request.reason'],
        missingEvidence: ['CONFIRMACION_EXPRESA_DE_CANCELACION']
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      fulfilled: false,
      determinant: false,
      priority: this.priority,
      article: this.article,
      explanation: 'No se detecta solicitud de cancelación ni intención manifiesta de no continuar.',
      requiredEvidence: this.requiredEvidence(),
      evidenceReferences: [],
      missingEvidence: ['SOLICITUD_DEL_ESTUDIANTE']
    };
  }

  requiredEvidence(): string[] {
    return ['TICKET_SOLICITUD', 'TRANSCRIPCION_LLAMADA', 'MENSAJE_ESCRITO'];
  }
}
