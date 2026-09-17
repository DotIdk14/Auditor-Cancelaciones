import { Ticket, TicketException, TicketStatus } from './types';

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  BORRADOR: ['EVIDENCIAS_PENDIENTES'],
  EVIDENCIAS_PENDIENTES: ['PROCESANDO', 'REQUIERE_REVISION'],
  PROCESANDO: ['REQUIERE_REVISION', 'DICTAMEN_PROPUESTO'],
  REQUIERE_REVISION: ['PROCESANDO', 'DICTAMEN_PROPUESTO'],
  DICTAMEN_PROPUESTO: ['PDF_EMITIDO', 'REQUIERE_REVISION'],
  PDF_EMITIDO: ['CERRADO'],
  CERRADO: []
};

export function canTransitionTicket(ticket: Ticket, nextStatus: TicketStatus): boolean {
  if (nextStatus === 'PDF_EMITIDO' && ticket.status !== 'DICTAMEN_PROPUESTO') return false;
  return ALLOWED_TRANSITIONS[ticket.status].includes(nextStatus);
}

export function transitionTicket(
  ticket: Ticket,
  nextStatus: TicketStatus,
  changedBy: string,
  motivo: string,
  now = new Date().toISOString()
): Ticket {
  if (!canTransitionTicket(ticket, nextStatus)) {
    throw new Error(`Transición inválida: ${ticket.status} -> ${nextStatus}`);
  }

  const exception: TicketException = {
    id: `exception-status-${ticket.excepciones.length + 1}`,
    ticketId: ticket.id,
    campoModificado: 'status',
    valorAnterior: ticket.status,
    valorNuevo: nextStatus,
    motivo: `${motivo} (${changedBy})`,
    evidenciaIds: [],
    createdAt: now
  };

  return {
    ...ticket,
    status: nextStatus,
    excepciones: [...ticket.excepciones, exception],
    updatedAt: now
  };
}
