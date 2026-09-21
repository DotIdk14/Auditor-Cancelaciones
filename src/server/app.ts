import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import multer from 'multer';
import os from 'os';
import { unlink } from 'fs/promises';
import { analyzeCancellationCase } from '../lib/decision-engine/decision-engine.js';
import type { CaseDecisionData } from '../lib/decision-engine/decision-engine.js';
import type { DecisionResult } from '../lib/decision-engine/types.js';
import { processEvidences } from '../lib/extraction/extraction-service.js';
import { runMultimodalAudit } from '../lib/audit/audit-service.js';
import type { MultimodalAuditInput } from '../lib/audit/types.js';
import { persistRouter } from './persist.js';
import { progressStore } from './progress.js';
import { auditJobsRouter } from './jobs-router.js';
import { createActorResolver } from './auth/resolver.js';
import { createPolicyRouter } from './policy/router.js';
import { InsforgePolicyRepository } from './policy/repository.js';
import { createRuleRouter } from './rules/router.js';
import { InsforgeRuleRepository } from './rules/repository.js';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/persist', persistRouter);

// The default resolver is intentionally unconfigured until a verified auth
// provider is selected. Policy routes therefore fail closed with 401.
app.use('/api/policies', createPolicyRouter(new InsforgePolicyRepository(), createActorResolver()));
app.use('/api/rules', createRuleRouter(new InsforgeRuleRepository(), createActorResolver()));

// Arquitectura asíncrona: POST /api/audit/jobs, GET /api/audit/jobs/:jobId[/result]
app.use('/api', auditJobsRouter);

const acceptedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    cb(null, acceptedMimeTypes.includes(file.mimetype));
  },
});

/** The multimodal audit can receive up to 10×50MB; stream to disk instead of RAM to avoid OOM on the 512MB machine. */
const multimodalUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    cb(null, acceptedMimeTypes.includes(file.mimetype));
  },
});

const healthHandler: express.RequestHandler = (_req, res) => {
  res.json({ status: 'ok', service: 'auditor-cancelaciones-headless', timestamp: new Date().toISOString() });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.post('/api/audit/evaluate', async (req, res) => {
  try {
    const caseData: CaseDecisionData = req.body;

    if (!caseData || !caseData.fechaInicio || !caseData.fechaSolicitud || !caseData.motivoSolicitud) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Faltan campos obligatorios: fechaInicio, fechaSolicitud, motivoSolicitud',
        required: ['fechaInicio', 'fechaSolicitud', 'motivoSolicitud']
      });
    }

    const result: DecisionResult = analyzeCancellationCase(caseData);

    res.json({
      success: true,
      data: {
        classification: result.classification,
        classificationName: result.classificationName,
        confidence: result.confidence,
        rootCause: result.rootCause,
        causaRaiz: result.causaRaiz,
        status: result.status,
        hardBlockers: result.hardBlockers,
        appliedRules: result.appliedRules.map(r => ({
          id: r.id,
          priority: r.priority,
          title: r.title,
          article: r.article,
          description: r.description,
          status: r.status
        })),
        rejectedRules: result.rejectedRules.map(r => ({
          id: r.id,
          priority: r.priority,
          title: r.title,
          article: r.article,
          reason: r.reason,
          missingConditions: r.missingConditions
        })),
        missingEvidence: result.missingEvidence,
        inconsistencies: result.inconsistencies,
        reasoning: result.reasoning,
        evidenceReferences: result.evidenceReferences,
        conflicts: result.conflicts?.map(c => ({
          ruleA: c.ruleA,
          ruleB: c.ruleB,
          resolution: c.resolution,
          selectedClassification: c.selectedClassification
        })),
        dictamenSugerido: result.dictamenSugerido,
        politicaArticulo: result.politicaArticulo,
        prioridadRegla: result.prioridadRegla,
        evidenciasNecesarias: result.evidenciasNecesarias,
        analizadoEn: result.analizadoEn
      },
      meta: {
        processedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error desconocido en evaluación'
    });
  }
});

app.post('/api/audit/evaluate/batch', async (req, res) => {
  try {
    const { cases } = req.body;

    if (!Array.isArray(cases) || cases.length === 0) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Se requiere array "cases" con al menos un caso'
      });
    }

    if (cases.length > 100) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Máximo 100 casos por lote'
      });
    }

    const results = cases.map((caseData: CaseDecisionData, index: number) => {
      try {
        const result = analyzeCancellationCase(caseData);
        return {
          index,
          success: true,
          data: {
            classification: result.classification,
            classificationName: result.classificationName,
            confidence: result.confidence,
            rootCause: result.rootCause,
            status: result.status,
            hardBlockers: result.hardBlockers,
            missingEvidence: result.missingEvidence,
            dictamenSugerido: result.dictamenSugerido
          }
        };
      } catch (error) {
        return {
          index,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
    });

    res.json({
      success: true,
      processed: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      meta: { processedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Batch evaluation error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error en evaluación por lotes'
    });
  }
});

app.post('/api/cases/extract', upload.array('evidencias', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'No se proporcionaron archivos' });
    }

    const result = await processEvidences(files);

    res.json({
      success: true,
      data: {
        draft: result.draft,
        evidenceResults: result.evidenceResults,
        usage: result.usage,
      },
      meta: { processedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error en extracción de evidencias'
    });
  }
});

app.post('/api/cases/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const file = req.file as Express.Multer.File;
    if (!file) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'No se proporcionó archivo de audio' });
    }

    if (!file.mimetype.startsWith('audio/')) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'El archivo debe ser de audio' });
    }

    const result = await processEvidences([file]);

    res.json({
      success: true,
      data: {
        draft: result.draft,
        evidenceResults: result.evidenceResults,
        usage: result.usage,
      },
      meta: { processedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error en transcripción'
    });
  }
});

app.post('/api/cases/evaluate-from-draft', async (req, res) => {
  try {
    const { draft } = req.body;

    if (!draft) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Se requiere el borrador del caso' });
    }

    const decisionData = draftToDecisionData(draft);
    const result = analyzeCancellationCase(decisionData);

    res.json({
      success: true,
      data: {
        classification: result.classification,
        classificationName: result.classificationName,
        confidence: result.confidence,
        rootCause: result.rootCause,
        causaRaiz: result.causaRaiz,
        status: result.status,
        hardBlockers: result.hardBlockers,
        appliedRules: result.appliedRules.map(r => ({
          id: r.id,
          priority: r.priority,
          title: r.title,
          article: r.article,
          description: r.description,
          status: r.status
        })),
        rejectedRules: result.rejectedRules.map(r => ({
          id: r.id,
          priority: r.priority,
          title: r.title,
          article: r.article,
          reason: r.reason,
          missingConditions: r.missingConditions
        })),
        missingEvidence: result.missingEvidence,
        inconsistencies: result.inconsistencies,
        reasoning: result.reasoning,
        evidenceReferences: result.evidenceReferences,
        conflicts: result.conflicts?.map(c => ({
          ruleA: c.ruleA,
          ruleB: c.ruleB,
          resolution: c.resolution,
          selectedClassification: c.selectedClassification
        })),
        dictamenSugerido: result.dictamenSugerido,
        politicaArticulo: result.politicaArticulo,
        prioridadRegla: result.prioridadRegla,
        evidenciasNecesarias: result.evidenciasNecesarias,
        analizadoEn: result.analizadoEn
      },
      meta: { processedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Draft evaluation error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error en evaluación desde borrador'
    });
  }
});

function draftToDecisionData(draft: any): CaseDecisionData {
  const student = draft.student || {};
  const request = draft.request || {};
  const academic = draft.academic || {};
  const visual = draft.visualFacts || {};

  const fieldValue = (source: any, ...keys: string[]) => {
    for (const key of keys) {
      const value = source[key]?.valor;
      if (value !== null && value !== undefined && value !== '') return value;
    }
    return null;
  };

  const vfValue = (section: string, key: string) => {
    const field = visual[section]?.[key];
    const value = field?.valor;
    if (value !== null && value !== undefined && value !== '') return value;
    return null;
  };

  const startDate = fieldValue(request, 'fechaInicio', 'fecha_inicio') || fieldValue(student, 'fechaInicio', 'fecha_inicio') || vfValue('siu', 'fechaInicio') || '';
  const requestDate = fieldValue(request, 'fechaSolicitud', 'fecha_solicitud') || fieldValue(student, 'fechaSolicitud', 'fecha_solicitud') || '';

  let daysDiff = 0;
  if (startDate && requestDate) {
    const start = new Date(startDate);
    const req = new Date(requestDate);
    const diffTime = req.getTime() - start.getTime();
    daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Fase 1/4 — hechos visuales de plataforma (capturas Aula Virtual / SIU).
  // Solo tienen peso cuando la captura muestra el dato; de lo contrario se
  // conserva el valor del formulario/extracción de texto.
  const vfIngresoAula = vfValue('aulaVirtual', 'ingresoAula');
  const vfUltimoAcceso = vfValue('aulaVirtual', 'ultimoAccesoCurso');
  const vfClics = vfValue('aulaVirtual', 'clicsDetectados');
  const vfActividades = vfValue('aulaVirtual', 'actividadesEntregadas');
  const vfCalificacion = vfValue('aulaVirtual', 'calificacion');
  const vfMaterias = vfValue('aulaVirtual', 'materiasCargadas');
  const vfSeleccionModalidad = vfValue('aulaVirtual', 'seleccionModalidad');
  const vfCalificacionesSiu = vfValue('siu', 'calificacionesRegistradas');
  const vfEstatus = vfValue('siu', 'estatusAlumno');
  const vfTelefono = vfValue('contacto', 'telefonoRegistrado') || vfValue('siu', 'telefono');

  const hayAccesoVisual = Boolean(vfIngresoAula) || Boolean(vfUltimoAcceso) || (Number(vfClics) > 0) || (Number(vfActividades) > 0);

  return {
    fechaInicio: startDate,
    fechaSolicitud: requestDate,
    diasHabilesDesdeInicio: Math.max(0, Math.min(daysDiff, 10)),
    semanasDesdeInicio: Math.max(0, Math.ceil(daysDiff / 7)),
    nivelEducativo: student.nivel?.valor || 'LICENCIATURA',
    programa: student.programa?.valor || '',
    estatusAlumno: vfEstatus || 'En proceso de auditoría',
    canalVenta: student.canal?.valor || 'DIGITAL_FACEBOOK_ADS',
    contactoEfectivo: fieldValue(academic, 'contactoEfectivo', 'contacto_efectivo') ?? true,
    llamadas: fieldValue(academic, 'llamadas') || 0,
    llamadasValidasPorHorario: (fieldValue(academic, 'llamadas') || 0) >= 15,
    interaccionesEscritas: fieldValue(academic, 'mensajes') || 0,
    ingresoAula: hayAccesoVisual ? true : (fieldValue(academic, 'ingresoAula', 'ingreso_aula') ?? false),
    ingresoAulaValidoPosgrado: hayAccesoVisual ? true : (fieldValue(academic, 'ingresoAula', 'ingreso_aula') ?? false) && !(fieldValue(academic, 'fallaCargaMaterias', 'falla_carga_materias') ?? false),
    seleccionModalidad: vfSeleccionModalidad !== null ? Boolean(vfSeleccionModalidad) : false,
    ultimoAccesoCurso: vfUltimoAcceso || undefined,
    clicsDetectados: vfClics !== null ? Number(vfClics) : undefined,
    cantidadActividadesEntregadas: vfActividades !== null ? Number(vfActividades) : undefined,
    calificacionVisible: vfCalificacion !== null ? Number(vfCalificacion) : undefined,
    actividadesEntregadas: (Number(vfActividades) > 0) || false,
    calificaciones: Boolean(vfCalificacionesSiu) || (vfCalificacion !== null && vfCalificacion !== undefined) ? true : (fieldValue(academic, 'calificaciones') ?? false),
    materiasCargadas: vfMaterias !== null ? Boolean(vfMaterias) : (fieldValue(academic, 'materiasCargadas', 'materias_cargadas') ?? false),
    fallaCargaMaterias: fieldValue(academic, 'fallaCargaMaterias', 'falla_carga_materias') ?? false,
    erroresAdministrativos: fieldValue(academic, 'erroresOperativos', 'errores_operativos') ?? false,
    erroresFinancieros: fieldValue(academic, 'erroresFinancieros', 'errores_financieros') ?? false,
    errorInscripcion: fieldValue(academic, 'errorInscripcion', 'error_inscripcion') ?? false,
    promesaVenta: fieldValue(academic, 'promesaVenta', 'promesa_venta') ?? false,
    promesaVentaEvidencia: fieldValue(academic, 'promesaVenta', 'promesa_venta') ? 'Grabación de cierre de venta cotejada por calidad' : undefined,
    solicitudAjuste: fieldValue(academic, 'fallaCargaMaterias', 'falla_carga_materias') ?? false,
    ajusteDentroDe20Dias: true,
    ajusteRealizado: false,
    contactoConExitoEstudiantil: fieldValue(academic, 'contactoEfectivo', 'contacto_efectivo') ?? true,
    areaOperativaCanalizoAExito: true,
    retencionRealizada: fieldValue(academic, 'retencionRealizada', 'retencion_realizada') ?? true,
    retencionAceptada: fieldValue(academic, 'retencionAceptada', 'retencion_aceptada') ?? false,
    motivoSolicitud: fieldValue(request, 'motivo') || fieldValue(student, 'motivo') || '',
    intencionCancelacionManifiesta: fieldValue(academic, 'intencionCancelacionManifiesta', 'intencion_cancelacion_manifiesta') ?? true,
  };
}

/**
 * Endpoint LEGACY / ROLLBACK ONLY.
 * Mantiene el comportamiento síncrono original para rollback/debug.
 * El frontend principal debe usar POST /api/audit/jobs.
 * 
 * Limitaciones conocidas:
 * - request HTTP abierta durante análisis (puede tardar minutos)
 * - progreso en memoria Node (se pierde en restart)
 * - 502 posibles en scale-to-zero
 */
app.post('/api/audit/multimodal', multimodalUpload.array('evidencias', 10), async (req, res) => {
  let progressId: string | undefined;
  const cleanup = async () => {
    for (const f of (req.files as Express.Multer.File[] | undefined) || []) {
      if (f.path) await unlink(f.path).catch(() => {});
    }
  };

  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'No se proporcionaron archivos' });
    }

    const ticketId = req.body?.ticketId as string | undefined;
    progressId = (req.body?.progressId as string) || crypto.randomUUID();
    progressStore.set(progressId, { status: 'running', progress: 2, detail: 'Iniciando auditoría...' });

    const input: MultimodalAuditInput = {
      ticketId,
      files: files.map((f, idx) => ({
        evidenceId: `ev_${String(idx + 1).padStart(3, '0')}`,
        path: f.path,
        nombreArchivo: f.originalname,
        mimeType: f.mimetype,
        sizeBytes: f.size,
      })),
    };

    const policyText = typeof req.body?.policyText === 'string' ? req.body.policyText : undefined;
    const result = await runMultimodalAudit(input, policyText, (p) => progressStore.set(progressId!, p));
    await cleanup();
    progressStore.set(progressId, { status: 'success', progress: 100, detail: 'Auditoría completada' });

    res.json({
      success: true,
      progressId,
      data: {
        resultado: result.resultado,
        evidencias: result.evidencias,
        usage: result.usage,
      },
      meta: { processedAt: new Date().toISOString() },
    });
  } catch (error) {
    await cleanup();
    console.error('Multimodal audit error:', error);
    if (progressId) {
      progressStore.set(progressId, {
        status: 'error',
        progress: 100,
        detail: error instanceof Error ? error.message : 'Error en auditoría multimodal',
      });
    }
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error en auditoría multimodal',
    });
  }
});

/**
 * LEGACY / ROLLBACK ONLY — Progreso en memoria del endpoint legacy síncrono.
 * NO lo usa el flujo nuevo (que consulta GET /api/audit/jobs/:jobId).
 */
app.get('/api/audit/multimodal/progress/:progressId', (req, res) => {
  const state = progressStore.get(req.params.progressId);
  if (!state) {
    return res.status(404).json({ success: false, error: 'PROGRESS_NOT_FOUND', message: 'Progreso no encontrado' });
  }
  res.json({ success: true, data: state });
});

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({
      success: false,
      error: error.code,
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el límite permitido de 50 MB.'
        : error.code === 'LIMIT_FILE_COUNT'
          ? 'Se permite un máximo de 10 archivos por carga.'
          : error.message,
    });
    return;
  }

  console.error('Unhandled API error:', error);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : 'Error inesperado del servidor',
  });
});

export default app;
