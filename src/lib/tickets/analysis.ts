import { EvidenceItem, RuleEvaluation, Ticket } from './types';

export function analyzeTicketEvidence(ticket: Ticket, now = new Date().toISOString()): Ticket {
  const i6Evidence = findEvidence(ticket.evidencias, ['I6'], ['15 llamadas', '6 interacciones', 'sin contacto efectivo']);
  const aulaEvidence = findEvidence(ticket.evidencias, ['AULA_VIRTUAL'], ['sin ingreso', 'sin actividad']);
  const siuEvidence = findEvidence(ticket.evidencias, ['SIU'], ['sin calificaciones']);

  const rules: RuleEvaluation[] = [
    buildRule(ticket.id, '5.2.b', 'Intentos mínimos de contacto', i6Evidence),
    buildRule(ticket.id, '5.8.a', 'Estudiante ilocalizable sin contacto efectivo', i6Evidence),
    buildRule(ticket.id, '5.8.h', 'Sin ingreso o actividad en aula virtual', aulaEvidence),
    buildRule(ticket.id, '5.7.d', 'Sin calificaciones registradas que bloqueen CV', siuEvidence)
  ];

  const hasBlockingRules = rules.some(rule => rule.bloqueaAutomatizacion);
  const allApplied = rules.every(rule => rule.status === 'APLICADA');

  if (!allApplied || hasBlockingRules) {
    return {
      ...ticket,
      status: 'REQUIERE_REVISION',
      reglas: rules,
      resultado: {
        ...ticket.resultado,
        automatico: false,
        requiereRevision: true,
        motivoRevision: rules.filter(rule => rule.status !== 'APLICADA').map(rule => rule.razon)
      },
      updatedAt: now
    };
  }

  return {
    ...ticket,
    status: 'DICTAMEN_PROPUESTO',
    reglas: rules,
    resultado: {
      principal: 'CANCELACION_VENTA',
      subtipo: 'ILOCALIZABLE',
      confianza: 0.92,
      automatico: true,
      requiereRevision: false,
      motivoRevision: [],
      textoDictamen: 'De acuerdo a la política y a las evidencias encontradas y compartidas, se determina una Cancelación de Venta por Estudiante Ilocalizable.'
    },
    updatedAt: now
  };
}

function buildRule(ticketId: string, codigoPolitica: string, nombre: string, evidence?: EvidenceItem): RuleEvaluation {
  if (!evidence) {
    return {
      id: `rule-${codigoPolitica}`,
      ticketId,
      codigoPolitica,
      nombre,
      versionPolitica: 'GDM_GAM_PRD_MLG_003 v2',
      status: 'PENDIENTE_EVIDENCIA',
      razon: `Falta evidencia para acreditar ${nombre}`,
      evidenciaIds: [],
      hechosIds: [],
      bloqueaAutomatizacion: true
    };
  }

  return {
    id: `rule-${codigoPolitica}`,
    ticketId,
    codigoPolitica,
    nombre,
    versionPolitica: 'GDM_GAM_PRD_MLG_003 v2',
    status: 'APLICADA',
    resultadoSugerido: 'CANCELACION_VENTA',
    subtipoSugerido: 'ILOCALIZABLE',
    razon: `${nombre} acreditado con evidencia ${evidence.nombreArchivo}`,
    evidenciaIds: [evidence.id],
    hechosIds: evidence.extraccion?.hechosDetectados?.map(fact => fact.id) ?? [],
    bloqueaAutomatizacion: false
  };
}

function findEvidence(evidencias: EvidenceItem[], fuentes: EvidenceItem['fuente'][], requiredText: string[]): EvidenceItem | undefined {
  return evidencias.find(evidence => {
    const text = `${evidence.nombreArchivo} ${evidence.extraccion?.textoExtraido ?? ''} ${evidence.extraccion?.resumen ?? ''}`.toLowerCase();
    return fuentes.includes(evidence.fuente) && requiredText.every(fragment => text.includes(fragment.toLowerCase()));
  });
}
