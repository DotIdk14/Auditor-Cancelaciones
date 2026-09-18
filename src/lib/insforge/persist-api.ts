import {
  AuditEventRow,
  CreateTicketInput,
  DictamenVersionRow,
  EvidenceRow,
  TicketRow,
  TicketSnapshot,
} from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || json.success === false) {
    throw new Error(json.error ?? `Error HTTP ${res.status}`);
  }
  return json.data;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const listTicketsApi = (query = '') =>
  request<TicketRow[]>(`/api/persist/tickets${query}`);

export const getTicketSnapshotApi = (folioOrId: string) =>
  request<TicketSnapshot>(`/api/persist/tickets/${encodeURIComponent(folioOrId)}`);

export const createTicketApi = (input: CreateTicketInput) =>
  request<TicketRow>('/api/persist/tickets', jsonInit('POST', input));

export const updateTicketApi = (id: string, updates: Record<string, unknown>) =>
  request<TicketRow>(`/api/persist/tickets/${encodeURIComponent(id)}`, jsonInit('PATCH', updates));

export const listEvidencesApi = (ticketId: string) =>
  request<EvidenceRow[]>(`/api/persist/tickets/${encodeURIComponent(ticketId)}/evidences`);

export function evidenceFileUrl(ticketId: string, evidenceId: string): string {
  return `/api/persist/tickets/${encodeURIComponent(ticketId)}/evidences/${encodeURIComponent(evidenceId)}/file`;
}

export function attachEvidenceApi(
  ticketId: string,
  file: File,
  fields: { nombreArchivo: string; tipo: string; fuente: string; descripcion?: string },
): Promise<EvidenceRow> {
  const form = new FormData();
  form.append('file', file, file.name);
  form.append('nombreArchivo', fields.nombreArchivo);
  form.append('tipo', fields.tipo);
  form.append('fuente', fields.fuente);
  if (fields.descripcion) form.append('descripcion', fields.descripcion);
  return request<EvidenceRow>(`/api/persist/tickets/${encodeURIComponent(ticketId)}/evidences`, {
    method: 'POST',
    body: form,
  });
}

export const deleteEvidenceApi = (ticketId: string, evidenceId: string) =>
  request<{ success: boolean }>(
    `/api/persist/tickets/${encodeURIComponent(ticketId)}/evidences/${encodeURIComponent(evidenceId)}`,
    { method: 'DELETE' },
  );

export const saveEvaluationApi = (ticketId: string, decisionData: Record<string, unknown>) =>
  request<{ run: unknown; ticket: TicketRow }>(
    `/api/persist/tickets/${encodeURIComponent(ticketId)}/evaluate`,
    jsonInit('POST', { decisionData }),
  );

export const saveDictamenApi = (
  ticketId: string,
  dto: {
    text: string;
    status: string;
    classification?: string | null;
    confidence?: number | null;
    rootCause?: string | null;
    createdBy?: string | null;
  },
) =>
  request<DictamenVersionRow>(
    `/api/persist/tickets/${encodeURIComponent(ticketId)}/dictamen`,
    jsonInit('POST', dto),
  );

export const approveDictamenApi = (ticketId: string, versionId: string, approvedBy: string) =>
  request<DictamenVersionRow>(
    `/api/persist/tickets/${encodeURIComponent(ticketId)}/dictamen/${encodeURIComponent(versionId)}/approve`,
    jsonInit('POST', { approvedBy }),
  );

export const listDictamenApi = (ticketId: string) =>
  request<DictamenVersionRow[]>(`/api/persist/tickets/${encodeURIComponent(ticketId)}/dictamen`);

export const listEventsApi = (ticketId: string) =>
  request<AuditEventRow[]>(`/api/persist/tickets/${encodeURIComponent(ticketId)}/events`);