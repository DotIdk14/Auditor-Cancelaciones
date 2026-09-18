import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import {
  approveDictamenVersion,
  createAuditEvent,
  createEvidence,
  createExtractedFacts,
  createGeneratedPdf,
  createTicket,
  createTranscriptSegments,
  deleteEvidence,
  downloadEvidenceFile,
  getEvidence,
  getTicket,
  getTicketSnapshot,
  listAuditEvents,
  listDecisionRuns,
  listDictamenVersions,
  listEvidencesByTicket,
  listGeneratedPdfs,
  listTickets,
  saveDecisionRun,
  saveDictamenVersion,
  updateEvidence,
  updateTicket,
} from '../lib/insforge/repository.js';
import { analyzeCancellationCase } from '../lib/decision-engine/decision-engine.js';
import type { CaseDecisionData } from '../lib/decision-engine/decision-engine.js';
import type { DecisionResult } from '../lib/decision-engine/types.js';

export const persistRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 5 },
});

persistRouter.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

// GET /api/persist/tickets?status=CERRADO
persistRouter.get('/tickets', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) || 200 : 200;
    const offset = typeof req.query.offset === 'string' ? Number(req.query.offset) || 0 : 0;
    const tickets = await listTickets(status, limit, offset);
    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('list tickets error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// GET /api/persist/tickets/:folioOrId
persistRouter.get('/tickets/:folioOrId', async (req, res) => {
  try {
    const snapshot = await getTicketSnapshot(req.params.folioOrId);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Ticket no encontrado' });
    }
    res.json({ success: true, data: snapshot });
  } catch (error) {
    console.error('get ticket error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// POST /api/persist/tickets
persistRouter.post('/tickets', async (req, res) => {
  try {
    const { folio, ...rest } = req.body ?? {};
    if (!folio || typeof folio !== 'string') {
      return res.status(400).json({ success: false, error: 'folio es obligatorio' });
    }
    const ticket = await createTicket({ folio, ...rest });
    await createAuditEvent({
      ticketId: ticket.id,
      eventType: 'TICKET_CREADO',
      afterData: { folio: ticket.folio },
      description: `Expediente ${ticket.folio} creado en backend InsForge`,
    }).catch(() => undefined);
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('create ticket error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// PATCH /api/persist/tickets/:id
persistRouter.patch('/tickets/:id', async (req, res) => {
  try {
    const allowed = ['status', 'estudiante', 'fechas', 'solicitud', 'resultado', 'comentarios', 'decision_data', 'completed_at'];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in (req.body ?? {})) updates[key] = (req.body as any)[key];
    }
    const ticket = await updateTicket(req.params.id, updates);
    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('update ticket error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// ---------------------------------------------------------------------------
// Evidences
// ---------------------------------------------------------------------------

// POST /api/persist/tickets/:id/evidences  (multipart: file + fields)
persistRouter.post('/tickets/:id/evidences', upload.single('file'), async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await getTicket(ticketId);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket no encontrado' });
    if (!req.file) return res.status(400).json({ success: false, error: 'Se requiere archivo (campo "file")' });

    const fileName = (req.body?.nombreArchivo as string) || req.file.originalname || 'evidencia';
    const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    const evidence = await createEvidence({
      ticketId,
      fileName,
      file: new Blob([req.file.buffer], { type: req.file.mimetype }),
      tipo: (req.body?.tipo as string) || inferType(req.file.mimetype),
      fuente: (req.body?.fuente as string) || 'OTRO',
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      sha256,
      fechaEvidencia: (req.body?.fechaEvidencia as string) || null,
      estadoLectura: (req.body?.estadoLectura as string) || 'PENDIENTE',
    });

    await createAuditEvent({
      ticketId,
      eventType: 'EVIDENCIA_CARGADA',
      afterData: { evidenceId: evidence.id, nombreArchivo: fileName },
      description: `Evidencia "${fileName}" subida al expediente`,
    }).catch(() => undefined);

    res.status(201).json({ success: true, data: evidence });
  } catch (error) {
    console.error('upload evidence error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// GET /api/persist/tickets/:id/evidences
persistRouter.get('/tickets/:id/evidences', async (req, res) => {
  try {
    const evidences = await listEvidencesByTicket(req.params.id);
    res.json({ success: true, data: evidences });
  } catch (error) {
    console.error('list evidences error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// GET /api/persist/tickets/:id/evidences/:evidenceId/file
persistRouter.get('/tickets/:ticketId/evidences/:evidenceId/file', async (req, res) => {
  try {
    const evidence = await getEvidence(req.params.ticketId, req.params.evidenceId);
    if (!evidence?.storage_key) {
      return res.status(404).json({ success: false, error: 'Evidencia o archivo no encontrado' });
    }
    const blob = await downloadEvidenceFile(evidence.storage_key);
    const buffer = Buffer.from(await blob.arrayBuffer());
    res.setHeader('Content-Type', evidence.mime_type ?? blob.type ?? 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(evidence.nombre_archivo)}"`,
    );
    res.send(buffer);
  } catch (error) {
    console.error('download evidence error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// PATCH /api/persist/tickets/:ticketId/evidences/:evidenceId
persistRouter.patch('/tickets/:ticketId/evidences/:evidenceId', async (req, res) => {
  try {
    const { tipo, fuente, estadoLectura, ordenCronologico, extraccion, fechaEvidencia } = req.body ?? {};
    const evidence = await updateEvidence(req.params.evidenceId, {
      ...(tipo !== undefined ? { tipo } : {}),
      ...(fuente !== undefined ? { fuente } : {}),
      ...(estadoLectura !== undefined ? { estado_lectura: estadoLectura } : {}),
      ...(ordenCronologico !== undefined ? { orden_cronologico: ordenCronologico } : {}),
      ...(extraccion !== undefined ? { extraccion } : {}),
      ...(fechaEvidencia !== undefined ? { fecha_evidencia: fechaEvidencia } : {}),
    });
    if (!evidence) return res.status(404).json({ success: false, error: 'Evidencia no encontrada' });
    res.json({ success: true, data: evidence });
  } catch (error) {
    console.error('update evidence error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// DELETE /api/persist/tickets/:ticketId/evidences/:evidenceId
persistRouter.delete('/tickets/:ticketId/evidences/:evidenceId', async (req, res) => {
  try {
    await deleteEvidence(req.params.evidenceId);
    res.json({ success: true });
  } catch (error) {
    console.error('delete evidence error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// POST /api/persist/tickets/:ticketId/evidences/:evidenceId/analysis
// Guarda transcripción y hechos extraídos de la evidencia.
persistRouter.post('/tickets/:ticketId/evidences/:evidenceId/analysis', async (req, res) => {
  try {
    const { transcript, facts } = req.body ?? {};
    const evidence = await getEvidence(req.params.ticketId, req.params.evidenceId);
    if (!evidence) return res.status(404).json({ success: false, error: 'Evidencia no encontrada' });

    const transcripts = Array.isArray(transcript)
      ? await createTranscriptSegments(req.params.evidenceId, transcript as any[])
      : [];
    const extractedFacts = Array.isArray(facts)
      ? await createExtractedFacts(req.params.evidenceId, facts as any[])
      : [];

    const extraccion = {
      ...(evidence.extraccion ?? {}),
      ...(transcripts.length || (transcript as any)?.length ? { transcriptCount: transcripts.length } : {}),
      ...(extractedFacts.length || (facts as any)?.length ? { factCount: extractedFacts.length } : {}),
    };

    await updateEvidence(req.params.evidenceId, { extraccion });
    res.status(201).json({ success: true, data: { transcripts, facts: extractedFacts } });
  } catch (error) {
    console.error('save evidence analysis error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// ---------------------------------------------------------------------------
// Evaluación del motor de decisiones
// ---------------------------------------------------------------------------

// POST /api/persist/tickets/:id/evaluate  { decisionData }
persistRouter.post('/tickets/:id/evaluate', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await getTicket(ticketId);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket no encontrado' });

    const decisionData: CaseDecisionData = req.body?.decisionData;
    if (!decisionData) {
      return res.status(400).json({ success: false, error: 'Se requiere decisionData' });
    }

    const result: DecisionResult = analyzeCancellationCase(decisionData);
    const run = await saveDecisionRun({
      ticketId,
      input: decisionData as unknown as Record<string, any>,
      output: result,
      engineVersion: 'version-1.0.0',
    });

    const ticketAfter = await getTicket(ticketId);

    await createAuditEvent({
      ticketId,
      eventType: 'DECISION_GENERADA',
      afterData: {
        classification: result.classification,
        confidence: result.confidence,
        rootCause: result.rootCause,
        decisionRunId: run.id,
      },
      description: `Motor generó clasificación ${result.classification} (${result.confidence})`,
    }).catch(() => undefined);

    res.status(201).json({ success: true, data: { run, ticket: ticketAfter } });
  } catch (error) {
    console.error('evaluate ticket error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// GET /api/persist/tickets/:id/decision-runs
persistRouter.get('/tickets/:id/decision-runs', async (req, res) => {
  try {
    const runs = await listDecisionRuns(req.params.id);
    res.json({ success: true, data: runs });
  } catch (error) {
    console.error('list decision runs error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// ---------------------------------------------------------------------------
// Dictamen
// ---------------------------------------------------------------------------

// POST /api/persist/tickets/:id/dictamen
persistRouter.post('/tickets/:id/dictamen', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await getTicket(ticketId);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket no encontrado' });

    const {
      text,
      status,
      classification,
      confidence,
      rootCause,
      article,
      reviewerNotes,
      modifiedByAuditor,
      createdBy,
    } = req.body ?? {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'text es obligatorio' });
    }

    const version = await saveDictamenVersion({
      ticketId,
      text,
      status: (status as string) ?? 'BORRADOR',
      classification: (classification as string) ?? null,
      confidence: (confidence as number) ?? null,
      rootCause: (rootCause as string) ?? null,
      article: (article as string) ?? null,
      reviewerNotes: (reviewerNotes as string) ?? null,
      modifiedByAuditor: (modifiedByAuditor as boolean) ?? false,
      createdBy: (createdBy as string) ?? null,
    });

    await updateTicket(ticketId, { status: (status as string) === 'APROBADO' ? 'CERRADO' : 'DICTAMEN_PROPUESTO' });

    await createAuditEvent({
      ticketId,
      eventType: 'DICTAMEN_GUARDADO',
      afterData: { version: version.version, status: version.status },
      description: `Versión ${version.version} de dictamen guardada (${version.status})`,
    }).catch(() => undefined);

    res.status(201).json({ success: true, data: version });
  } catch (error) {
    console.error('save dictamen error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// GET /api/persist/tickets/:id/dictamen
persistRouter.get('/tickets/:id/dictamen', async (req, res) => {
  try {
    const versions = await listDictamenVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (error) {
    console.error('list dictamen error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// POST /api/persist/tickets/:ticketId/dictamen/:versionId/approve
persistRouter.post('/tickets/:ticketId/dictamen/:versionId/approve', async (req, res) => {
  try {
    const { approvedBy } = req.body ?? {};
    const version = await approveDictamenVersion(req.params.versionId, (approvedBy as string) ?? null);
    await createAuditEvent({
      ticketId: req.params.ticketId,
      eventType: 'DICTAMEN_APROBADO',
      afterData: { version: version.version, approvedBy: version.approved_by },
      description: `Dictamen versión ${version.version} aprobado y expediente cerrado`,
    }).catch(() => undefined);
    res.json({ success: true, data: version });
  } catch (error) {
    console.error('approve dictamen error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// ---------------------------------------------------------------------------
// PDFs emitidos
// ---------------------------------------------------------------------------

// POST /api/persist/tickets/:id/pdfs
persistRouter.post('/tickets/:id/pdfs', async (req, res) => {
  try {
    const pdf = await createGeneratedPdf({
      ticketId: req.params.id,
      version: (req.body?.version as number) ?? null,
      storageKey: (req.body?.storageKey as string) ?? null,
      storageUrl: (req.body?.storageUrl as string) ?? null,
      sha256: (req.body?.sha256 as string) ?? null,
      generatedAutomatic: (req.body?.generatedAutomatic as boolean) ?? false,
      generatedAfterException: (req.body?.generatedAfterException as boolean) ?? false,
    });
    res.status(201).json({ success: true, data: pdf });
  } catch (error) {
    console.error('create pdf error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// GET /api/persist/tickets/:id/pdfs
persistRouter.get('/tickets/:id/pdfs', async (req, res) => {
  try {
    const pdfs = await listGeneratedPdfs(req.params.id);
    res.json({ success: true, data: pdfs });
  } catch (error) {
    console.error('list pdfs error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

// ---------------------------------------------------------------------------
// Bitácora de eventos
// ---------------------------------------------------------------------------

// GET /api/persist/tickets/:id/events
persistRouter.get('/tickets/:id/events', async (req, res) => {
  try {
    const events = await listAuditEvents(req.params.id);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('list events error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
  }
});

function inferType(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype === 'application/pdf') return 'PDF';
  if (mimetype.startsWith('audio/')) return 'AUDIO';
  if (mimetype.includes('word') || mimetype === 'text/plain') return 'DOC';
  return 'DOC';
}
