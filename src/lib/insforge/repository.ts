import { getAdminClient, EVIDENCE_BUCKET } from './client.js';
import type {
  AuditEventRow,
  CreateTicketInput,
  DecisionRunRow,
  DictamenVersionRow,
  EvidenceRow,
  ExtractedFactRow,
  GeneratedPdfRow,
  RuleEvaluationRow,
  SaveDecisionRunInput,
  SaveDictamenInput,
  TicketRow,
  TicketSnapshot,
  TranscriptSegmentRow,
} from './types.js';

function throwDb(error: unknown, context: string): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`${context}: ${message}`);
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export async function listTickets(
  status?: string,
  limit = 200,
  offset = 0,
): Promise<TicketRow[]> {
  const db = getAdminClient().database;
  let query = db
    .from('tickets')
    .select('id, folio, status, estudiante, fechas, solicitud, resultado, created_at, updated_at, completed_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throwDb(error, 'listTickets');
  return (data ?? []) as TicketRow[];
}

export async function getTicket(folioOrId: string): Promise<TicketRow | null> {
  const db = getAdminClient().database;
  const { data, error } = await db
    .from('tickets')
    .select()
    .or(`id.eq.${folioOrId},folio.eq.${folioOrId}`)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throwDb(error, 'getTicket');
  }
  return (data as TicketRow) ?? null;
}

export async function createTicket(input: CreateTicketInput): Promise<TicketRow> {
  const db = getAdminClient().database;
  const { data, error } = await db
    .from('tickets')
    .insert([
      {
        folio: input.folio,
        status: input.status ?? 'BORRADOR',
        estudiante: input.estudiante ?? {},
        fechas: input.fechas ?? {},
        solicitud: input.solicitud ?? {},
        resultado: input.resultado ?? {},
        comentarios: input.comentarios ?? {},
        decision_data: input.decision_data ?? null,
        created_by: input.created_by ?? null,
      },
    ])
    .select()
    .single();
  if (error) throwDb(error, 'createTicket');
  return data as TicketRow;
}

export async function updateTicket(
  ticketId: string,
  updates: Partial<
    Pick<TicketRow, 'status' | 'estudiante' | 'fechas' | 'solicitud' | 'resultado' | 'comentarios' | 'decision_data' | 'completed_at'>
  >,
): Promise<TicketRow> {
  const db = getAdminClient().database;
  const { data, error } = await db
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();
  if (error) throwDb(error, 'updateTicket');
  return data as TicketRow;
}

// ---------------------------------------------------------------------------
// Evidences
// ---------------------------------------------------------------------------

export interface CreateEvidenceUploadInput {
  ticketId: string;
  fileName: string;
  file: File | Blob;
  tipo: string;
  fuente: string;
  mimeType?: string;
  sizeBytes?: number;
  sha256?: string;
  fechaEvidencia?: string | null;
  estadoLectura?: string;
  extraccion?: Record<string, any> | null;
  createdBy?: string | null;
}

export async function createEvidence(
  input: CreateEvidenceUploadInput,
): Promise<EvidenceRow> {
  const client = getAdminClient();
  const objectKey = `tickets/${input.ticketId}/${Date.now()}-${sanitizeKey(input.fileName)}`;

  const { data: upload, error: uploadError } = await client.storage
    .from(EVIDENCE_BUCKET)
    .upload(objectKey, input.file);
  if (uploadError) throwDb(uploadError, 'createEvidence.upload');

  const row = {
    ticket_id: input.ticketId,
    nombre_archivo: input.fileName,
    tipo: input.tipo,
    fuente: input.fuente,
    storage_key: upload?.key ?? objectKey,
    storage_url: upload?.url ?? null,
    mime_type: input.mimeType ?? input.file.type ?? null,
    size_bytes: input.sizeBytes ?? input.file.size ?? null,
    sha256: input.sha256 ?? null,
    fecha_evidencia: input.fechaEvidencia ?? null,
    estado_lectura: input.estadoLectura ?? 'PENDIENTE',
    extraccion: input.extraccion ?? null,
    created_by: input.createdBy ?? null,
  };

  const { data, error } = await client.database
    .from('evidences')
    .insert([row])
    .select()
    .single();
  if (error) throwDb(error, 'createEvidence.insert');
  return data as EvidenceRow;
}

export async function listEvidencesByTicket(ticketId: string): Promise<EvidenceRow[]> {
  const { data, error } = await getAdminClient()
    .database.from('evidences')
    .select()
    .eq('ticket_id', ticketId)
    .order('orden_cronologico', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throwDb(error, 'listEvidencesByTicket');
  return (data ?? []) as EvidenceRow[];
}

export async function getEvidence(
  ticketId: string,
  evidenceId: string,
): Promise<EvidenceRow | null> {
  const { data, error } = await getAdminClient()
    .database.from('evidences')
    .select()
    .eq('id', evidenceId)
    .eq('ticket_id', ticketId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throwDb(error, 'getEvidence');
  }
  return (data as EvidenceRow) ?? null;
}

export async function updateEvidence(
  evidenceId: string,
  updates: Partial<
    Pick<EvidenceRow, 'tipo' | 'fuente' | 'estado_lectura' | 'orden_cronologico' | 'extraccion' | 'fecha_evidencia'>
  >,
): Promise<EvidenceRow | null> {
  const { data, error } = await getAdminClient()
    .database.from('evidences')
    .update(updates)
    .eq('id', evidenceId)
    .select()
    .single();
  if (error) throwDb(error, 'updateEvidence');
  return (data as EvidenceRow) ?? null;
}

export async function deleteEvidence(evidenceId: string): Promise<void> {
  const client = getAdminClient();
  const { data: ev, error: readError } = await client.database
    .from('evidences')
    .select('storage_key')
    .eq('id', evidenceId)
    .single();
  if (readError && readError.code !== 'PGRST116') throwDb(readError, 'deleteEvidence.read');

  if (ev?.storage_key) {
    const { error: removeError } = await client.storage
      .from(EVIDENCE_BUCKET)
      .remove(ev.storage_key);
    if (removeError) console.warn('deleteEvidence: storage remove failed', removeError);
  }

  const { error } = await client.database
    .from('evidences')
    .delete()
    .eq('id', evidenceId);
  if (error) throwDb(error, 'deleteEvidence');
}

export async function downloadEvidenceFile(storageKey: string): Promise<Blob> {
  const { data, error } = await getAdminClient()
    .storage.from(EVIDENCE_BUCKET)
    .download(storageKey);
  if (error) throwDb(error, 'downloadEvidenceFile');
  if (!data) throw new Error('downloadEvidenceFile: empty response');
  return data;
}

// ---------------------------------------------------------------------------
// Transcript segments
// ---------------------------------------------------------------------------

export async function createTranscriptSegments(
  evidenceId: string,
  segments: Array<{
    speaker?: string | null;
    speakerName?: string | null;
    start?: string | null;
    end?: string | null;
    startSeconds?: number | null;
    endSeconds?: number | null;
    text: string;
    sentiment?: string | null;
    keyMoment?: Record<string, any> | null;
    orden: number;
  }>,
): Promise<TranscriptSegmentRow[]> {
  if (segments.length === 0) return [];
  const rows = segments.map((s) => ({
    evidence_id: evidenceId,
    speaker: s.speaker ?? null,
    speaker_name: s.speakerName ?? null,
    start_time: s.start ?? null,
    end_time: s.end ?? null,
    start_seconds: s.startSeconds ?? null,
    end_seconds: s.endSeconds ?? null,
    text: s.text,
    sentiment: s.sentiment ?? null,
    key_moment: s.keyMoment ?? null,
    orden: s.orden,
  }));
  const { data, error } = await getAdminClient()
    .database.from('transcript_segments')
    .insert(rows)
    .select();
  if (error) throwDb(error, 'createTranscriptSegments');
  return (data ?? []) as TranscriptSegmentRow[];
}

export async function listTranscriptSegmentsByEvidence(
  evidenceId: string,
): Promise<TranscriptSegmentRow[]> {
  const { data, error } = await getAdminClient()
    .database.from('transcript_segments')
    .select()
    .eq('evidence_id', evidenceId)
    .order('orden', { ascending: true });
  if (error) throwDb(error, 'listTranscriptSegmentsByEvidence');
  return (data ?? []) as TranscriptSegmentRow[];
}

// ---------------------------------------------------------------------------
// Extracted facts
// ---------------------------------------------------------------------------

export async function createExtractedFacts(
  evidenceId: string,
  facts: Array<{
    tipo: string;
    valor?: string | null;
    confianza?: string;
    pagina?: number | null;
    timestampRef?: string | null;
    textoCitado?: string | null;
    extra?: Record<string, any> | null;
  }>,
): Promise<ExtractedFactRow[]> {
  if (facts.length === 0) return [];
  const rows = facts.map((f) => ({
    evidence_id: evidenceId,
    tipo: f.tipo,
    valor: f.valor ?? null,
    confianza: f.confianza ?? 'BAJA',
    pagina: f.pagina ?? null,
    timestamp_ref: f.timestampRef ?? null,
    texto_citado: f.textoCitado ?? null,
    extra: f.extra ?? null,
  }));
  const { data, error } = await getAdminClient()
    .database.from('extracted_facts')
    .insert(rows)
    .select();
  if (error) throwDb(error, 'createExtractedFacts');
  return (data ?? []) as ExtractedFactRow[];
}

export async function listExtractedFactsByEvidence(
  evidenceId: string,
): Promise<ExtractedFactRow[]> {
  const { data, error } = await getAdminClient()
    .database.from('extracted_facts')
    .select()
    .eq('evidence_id', evidenceId)
    .order('created_at', { ascending: true });
  if (error) throwDb(error, 'listExtractedFactsByEvidence');
  return (data ?? []) as ExtractedFactRow[];
}

// ---------------------------------------------------------------------------
// Decision runs + rule evaluations
// ---------------------------------------------------------------------------

export async function saveDecisionRun(
  input: SaveDecisionRunInput,
): Promise<DecisionRunRow & { rules: RuleEvaluationRow[] }> {
  const client = getAdminClient();

  const runRow = {
    ticket_id: input.ticketId,
    input: input.input,
    output: input.output as unknown as Record<string, any>,
    classification: input.output.classification ?? null,
    classification_name: input.output.classificationName ?? input.output.classification ?? null,
    confidence: input.output.confidence ?? null,
    root_cause: input.output.rootCause ?? input.output.causaRaiz ?? null,
    status: input.output.status ?? null,
    hard_blockers: input.output.hardBlockers ?? [],
    missing_evidence: input.output.missingEvidence ?? [],
    inconsistencies: input.output.inconsistencies ?? [],
    dictamen_sugerido: input.output.dictamenSugerido ?? null,
    politica_articulo: input.output.politicaArticulo ?? null,
    engine_version: input.engineVersion ?? null,
    created_by: null,
  };

  const { data, error } = await client.database
    .from('decision_runs')
    .insert([runRow])
    .select()
    .single();
  if (error) throwDb(error, 'saveDecisionRun.insert');
  const run = data as DecisionRunRow;

  const ruleRows: Array<Record<string, any>> = [];
  (input.output.appliedRules ?? []).forEach((rule, i) => {
    ruleRows.push({
      decision_run_id: run.id,
      rule_id: rule.id,
      rule_name: rule.title,
      rule_priority: rule.priority,
      article: rule.article,
      description: rule.description,
      status: 'APLICADA',
      reason: rule.verdictContribution ?? null,
      suggested_classification: null,
      suggested_root_cause: null,
      confidence_impact: null,
      missing_evidence: [],
      evidence_ids: rule.evidenceSource ?? [],
      orden: i,
    });
  });
  (input.output.rejectedRules ?? []).forEach((rule, i) => {
    ruleRows.push({
      decision_run_id: run.id,
      rule_id: rule.id,
      rule_name: rule.title,
      rule_priority: rule.priority,
      article: rule.article,
      description: null,
      status: 'DESCARTADA',
      reason: rule.reason ?? null,
      suggested_classification: null,
      suggested_root_cause: null,
      confidence_impact: null,
      missing_evidence: rule.missingConditions ?? [],
      evidence_ids: [],
      orden: i + (input.output.appliedRules?.length ?? 0),
    });
  });

  let rules: RuleEvaluationRow[] = [];
  if (ruleRows.length > 0) {
    const { data: rulesData, error: rulesError } = await client.database
      .from('rule_evaluations')
      .insert(ruleRows)
      .select();
    if (rulesError) throwDb(rulesError, 'saveDecisionRun.rules');
    rules = (rulesData ?? []) as RuleEvaluationRow[];
  }

  return { ...run, rules };
}

export async function getLatestDecisionRun(ticketId: string): Promise<DecisionRunRow | null> {
  const { data, error } = await getAdminClient()
    .database.from('decision_runs')
    .select()
    .eq('ticket_id', ticketId)
    .eq('is_current', true)
    .order('run_at', { ascending: false })
    .limit(1)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throwDb(error, 'getLatestDecisionRun');
  }
  return (data as DecisionRunRow) ?? null;
}

export async function listDecisionRuns(
  ticketId: string,
): Promise<Array<DecisionRunRow & { rules: RuleEvaluationRow[] }>> {
  const client = getAdminClient();
  const { data, error } = await client.database
    .from('decision_runs')
    .select()
    .eq('ticket_id', ticketId)
    .order('run_at', { ascending: false });
  if (error) throwDb(error, 'listDecisionRuns');
  const runs = (data ?? []) as DecisionRunRow[];

  const result: Array<DecisionRunRow & { rules: RuleEvaluationRow[] }> = [];
  for (const run of runs) {
    const { data: rules, error: rulesError } = await client.database
      .from('rule_evaluations')
      .select()
      .eq('decision_run_id', run.id)
      .order('orden', { ascending: true });
    if (rulesError) throwDb(rulesError, 'listDecisionRuns.rules');
    result.push({ ...run, rules: (rules ?? []) as RuleEvaluationRow[] });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Dictamen versions
// ---------------------------------------------------------------------------

export async function saveDictamenVersion(
  input: SaveDictamenInput,
): Promise<DictamenVersionRow> {
  const client = getAdminClient();

  const { data: existing, error: readError } = await client.database
    .from('dictamen_versions')
    .select('version')
    .eq('ticket_id', input.ticketId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError && readError.code !== 'PGRST116') throwDb(readError, 'saveDictamenVersion.read');

  const nextVersion = (existing?.version ?? 0) + 1;

  const row = {
    ticket_id: input.ticketId,
    version: nextVersion,
    text: input.text,
    status: input.status,
    classification: input.classification ?? null,
    confidence: input.confidence ?? null,
    root_cause: input.rootCause ?? null,
    article: input.article ?? null,
    reviewer_notes: input.reviewerNotes ?? null,
    modified_by_auditor: input.modifiedByAuditor ?? false,
    created_by: input.createdBy ?? null,
  };

  const { data, error } = await client.database
    .from('dictamen_versions')
    .insert([row])
    .select()
    .single();
  if (error) throwDb(error, 'saveDictamenVersion.insert');
  return data as DictamenVersionRow;
}

export async function approveDictamenVersion(
  dictamenVersionId: string,
  approvedBy?: string | null,
): Promise<DictamenVersionRow> {
  const client = getAdminClient();
  const { data, error } = await client.database
    .from('dictamen_versions')
    .update({
      status: 'APROBADO',
      approved_by: approvedBy ?? null,
      approved_at: new Date().toISOString(),
    })
    .eq('id', dictamenVersionId)
    .select()
    .single();
  if (error) throwDb(error, 'approveDictamenVersion');
  const version = data as DictamenVersionRow;

  await client.database
    .from('tickets')
    .update({ status: 'CERRADO', completed_at: new Date().toISOString() })
    .eq('id', version.ticket_id);

  return version;
}

export async function listDictamenVersions(
  ticketId: string,
): Promise<DictamenVersionRow[]> {
  const { data, error } = await getAdminClient()
    .database.from('dictamen_versions')
    .select()
    .eq('ticket_id', ticketId)
    .order('version', { ascending: false });
  if (error) throwDb(error, 'listDictamenVersions');
  return (data ?? []) as DictamenVersionRow[];
}

// ---------------------------------------------------------------------------
// Generated PDFs
// ---------------------------------------------------------------------------

export async function createGeneratedPdf(input: {
  ticketId: string;
  version?: number | null;
  storageKey?: string | null;
  storageUrl?: string | null;
  sha256?: string | null;
  generatedAutomatic?: boolean;
  generatedAfterException?: boolean;
}): Promise<GeneratedPdfRow> {
  const { data, error } = await getAdminClient()
    .database.from('generated_pdfs')
    .insert([
      {
        ticket_id: input.ticketId,
        version: input.version ?? null,
        storage_key: input.storageKey ?? null,
        storage_url: input.storageUrl ?? null,
        sha256: input.sha256 ?? null,
        generated_automatic: input.generatedAutomatic ?? true,
        generated_after_exception: input.generatedAfterException ?? false,
      },
    ])
    .select()
    .single();
  if (error) throwDb(error, 'createGeneratedPdf');
  return data as GeneratedPdfRow;
}

export async function listGeneratedPdfs(ticketId: string): Promise<GeneratedPdfRow[]> {
  const { data, error } = await getAdminClient()
    .database.from('generated_pdfs')
    .select()
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });
  if (error) throwDb(error, 'listGeneratedPdfs');
  return (data ?? []) as GeneratedPdfRow[];
}

// ---------------------------------------------------------------------------
// Audit events
// ---------------------------------------------------------------------------

export async function createAuditEvent(input: {
  ticketId: string;
  eventType: string;
  actor?: string | null;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  description?: string | null;
}): Promise<AuditEventRow> {
  const { data, error } = await getAdminClient()
    .database.from('audit_events')
    .insert([
      {
        ticket_id: input.ticketId,
        event_type: input.eventType,
        actor: input.actor ?? null,
        before_data: input.beforeData ?? null,
        after_data: input.afterData ?? null,
        description: input.description ?? null,
      },
    ])
    .select()
    .single();
  if (error) throwDb(error, 'createAuditEvent');
  return data as AuditEventRow;
}

export async function listAuditEvents(ticketId: string): Promise<AuditEventRow[]> {
  const { data, error } = await getAdminClient()
    .database.from('audit_events')
    .select()
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });
  if (error) throwDb(error, 'listAuditEvents');
  return (data ?? []) as AuditEventRow[];
}

// ---------------------------------------------------------------------------
// Ticket snapshot (expediente completo)
// ---------------------------------------------------------------------------

export async function getTicketSnapshot(ticketId: string): Promise<TicketSnapshot | null> {
  const ticket = await getTicket(ticketId);
  if (!ticket) return null;

  const [evidences, decisionRun, dictamenVersions, pdfs, events] = await Promise.all([
    listEvidencesByTicket(ticket.id),
    getLatestDecisionRun(ticket.id),
    listDictamenVersions(ticket.id),
    listGeneratedPdfs(ticket.id),
    listAuditEvents(ticket.id),
  ]);

  const transcripts: TranscriptSegmentRow[] = [];
  const facts: ExtractedFactRow[] = [];
  for (const ev of evidences) {
    const [segments, evFacts] = await Promise.all([
      listTranscriptSegmentsByEvidence(ev.id),
      listExtractedFactsByEvidence(ev.id),
    ]);
    transcripts.push(...segments);
    facts.push(...evFacts);
  }

  let runWithRules: (DecisionRunRow & { rules: RuleEvaluationRow[] }) | null = null;
  if (decisionRun) {
    const { data: rules, error } = await getAdminClient()
      .database.from('rule_evaluations')
      .select()
      .eq('decision_run_id', decisionRun.id)
      .order('orden', { ascending: true });
    if (error) throwDb(error, 'getTicketSnapshot.rules');
    runWithRules = { ...decisionRun, rules: (rules ?? []) as RuleEvaluationRow[] };
  }

  return {
    ticket,
    evidences,
    transcripts,
    facts,
    decisionRun: runWithRules,
    dictamenVersions,
    pdfs,
    events,
  };
}

function sanitizeKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}
