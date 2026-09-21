import { CreateInitialTicketInput, Ticket } from './types';

export function createInitialTicket(input: CreateInitialTicketInput): Ticket {
  const now = input.now ?? new Date().toISOString();
  const normalizedFolio = normalizeCaveFolio(input.folio);

  return {
    id: `ticket-${normalizedFolio.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    folio: normalizedFolio,
    status: 'BORRADOR',
    estudiante: {},
    fechas: {},
    solicitud: {},
    resultado: {
      automatico: false,
      requiereRevision: true,
      motivoRevision: ['EXPEDIENTE_SIN_EVIDENCIAS']
    },
    comentarios: {},
    evidencias: [],
    reglas: [],
    excepciones: [],
    pdfsEmitidos: [],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeCaveFolio(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(cave|CaVe|CAVE|CaVE)[\s-]*(\d+)$/i);

  if (!match) return trimmed;

  return `CaVe-${match[2]}`;
}
