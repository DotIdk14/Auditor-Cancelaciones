import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { analyzeCancellationCase, CaseDecisionData } from './src/lib/decision-engine/decision-engine';
import { DecisionResult } from './src/lib/decision-engine/types';
import { processEvidences } from './src/lib/extraction/extraction-service';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
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
    cb(null, allowed.includes(file.mimetype));
  },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auditor-cancelaciones-headless', timestamp: new Date().toISOString() });
});

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

  const startDate = student.fecha_inicio?.valor || request.fecha_inicio?.valor || '';
  const requestDate = student.fecha_solicitud?.valor || request.fecha_solicitud?.valor || '';

  let daysDiff = 0;
  if (startDate && requestDate) {
    const start = new Date(startDate);
    const req = new Date(requestDate);
    const diffTime = req.getTime() - start.getTime();
    daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    fechaInicio: startDate,
    fechaSolicitud: requestDate,
    diasHabilesDesdeInicio: Math.max(0, Math.min(daysDiff, 10)),
    semanasDesdeInicio: Math.max(0, Math.ceil(daysDiff / 7)),
    nivelEducativo: student.nivel?.valor || 'LICENCIATURA',
    programa: student.programa?.valor || '',
    estatusAlumno: 'En proceso de auditoría',
    canalVenta: student.canal?.valor || 'DIGITAL_FACEBOOK_ADS',
    contactoEfectivo: academic.contacto_efectivo?.valor ?? true,
    llamadas: academic.llamadas?.valor || 0,
    llamadasValidasPorHorario: (academic.llamadas?.valor || 0) >= 15,
    interaccionesEscritas: academic.mensajes?.valor || 0,
    ingresoAula: academic.ingreso_aula?.valor ?? true,
    ingresoAulaValidoPosgrado: (academic.ingreso_aula?.valor ?? true) && !(academic.falla_carga_materias?.valor ?? false),
    seleccionModalidad: false,
    calificaciones: academic.calificaciones?.valor ?? false,
    materiasCargadas: academic.materias_cargadas?.valor ?? false,
    fallaCargaMaterias: academic.falla_carga_materias?.valor ?? false,
    erroresAdministrativos: academic.errores_operativos?.valor ?? false,
    erroresFinancieros: academic.errores_financieros?.valor ?? false,
    errorInscripcion: academic.error_inscripcion?.valor ?? false,
    promesaVenta: academic.promesa_venta?.valor ?? false,
    promesaVentaEvidencia: academic.promesa_venta?.valor ? 'Grabación de cierre de venta cotejada por calidad' : undefined,
    solicitudAjuste: academic.falla_carga_materias?.valor ?? false,
    ajusteDentroDe20Dias: true,
    ajusteRealizado: false,
    contactoConExitoEstudiantil: academic.contacto_efectivo?.valor ?? true,
    areaOperativaCanalizoAExito: true,
    retencionRealizada: academic.retencion_realizada?.valor ?? true,
    retencionAceptada: academic.retencion_aceptada?.valor ?? false,
    motivoSolicitud: request.motivo?.valor || student.motivo?.valor || '',
    intencionCancelacionManifiesta: academic.intencion_cancelacion_manifiesta?.valor ?? true,
  };
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Auditor Headless API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Evaluate: POST http://localhost:${PORT}/api/audit/evaluate`);
  console.log(`   Batch: POST http://localhost:${PORT}/api/audit/evaluate/batch`);
  console.log(`   Extract: POST http://localhost:${PORT}/api/cases/extract`);
  console.log(`   Transcribe: POST http://localhost:${PORT}/api/cases/transcribe`);
  console.log(`   Evaluate from draft: POST http://localhost:${PORT}/api/cases/evaluate-from-draft`);
});

export default app;
