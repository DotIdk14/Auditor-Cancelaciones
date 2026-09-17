import { EvidenceItem, Ticket, TranscriptSegment } from './types';

export type ManualEvidenceInput = Omit<
  EvidenceItem,
  'id' | 'ticketId' | 'fechaCarga' | 'ordenCronologico' | 'estadoLectura' | 'extraccion'
> & {
  textoExtraido?: string;
  resumen?: string;
  transcript?: TranscriptSegment[];
};

export function addManualEvidence(ticket: Ticket, input: ManualEvidenceInput, now = new Date().toISOString()): Ticket {
  validateManualEvidence(input);

  const evidence: EvidenceItem = {
    id: `evidence-${ticket.evidencias.length + 1}`,
    ticketId: ticket.id,
    nombreArchivo: input.nombreArchivo,
    tipo: input.tipo,
    fuente: input.fuente,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    sha256: input.sha256,
    fechaEvidencia: input.fechaEvidencia,
    fechaCarga: now,
    ordenCronologico: 0,
    estadoLectura: 'LEIDA',
    extraccion: input.textoExtraido || input.resumen
      ? {
          textoExtraido: input.textoExtraido,
          resumen: input.resumen,
          hechosDetectados: []
        }
      : undefined,
  };

  const evidencias = reorderChronologically([...ticket.evidencias, evidence]);

  return {
    ...ticket,
    status: ticket.status === 'BORRADOR' ? 'EVIDENCIAS_PENDIENTES' : ticket.status,
    evidencias,
    updatedAt: now
  };
}

export function getEvidenceTranscript(evidence: EvidenceItem): TranscriptSegment[] {
  return evidence.transcript || [];
}

export function getChronologicalEvidence(ticket: Ticket): EvidenceItem[] {
  return reorderChronologically(ticket.evidencias);
}

function reorderChronologically(evidencias: EvidenceItem[]): EvidenceItem[] {
  return [...evidencias]
    .sort((a, b) => {
      const aDate = a.fechaEvidencia ?? a.fechaCarga;
      const bDate = b.fechaEvidencia ?? b.fechaCarga;
      return aDate.localeCompare(bDate);
    })
    .map((item, index) => ({ ...item, ordenCronologico: index + 1 }));
}

function validateManualEvidence(input: ManualEvidenceInput): void {
  if (!/^[a-f0-9]{64}$/i.test(input.sha256)) {
    throw new Error('La evidencia requiere sha256 válido de 64 caracteres hexadecimales');
  }
  if (input.sizeBytes <= 0) {
    throw new Error('La evidencia debe tener tamaño mayor a cero');
  }
  if (!input.mimeType.includes('/')) {
    throw new Error('La evidencia requiere mimeType válido');
  }
}