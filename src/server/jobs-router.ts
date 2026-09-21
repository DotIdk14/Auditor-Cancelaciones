import express from 'express';
import multer from 'multer';
import { createHash } from 'crypto';
import type { InsForgeClient } from '@insforge/sdk';
import { auditJobRepository } from '../lib/jobs/audit-job-repository.js';
import type { AuditJobRepositoryLike } from '../lib/jobs/audit-job-repository.js';

export const EVIDENCE_BUCKET = 'dictamen-evidencias';

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

// Multer en MEMORIA para /api/audit/jobs (necesita file.buffer para sha256 + upload).
// El endpoint legacy usa su propio multer a disco (file.path).
const jobsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    cb(null, acceptedMimeTypes.includes(file.mimetype));
  },
});

export function inferEvidenceType(mimeType: string): 'PDF' | 'IMAGE' | 'AUDIO' {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  throw new Error(`Tipo MIME no soportado: ${mimeType}`);
}

export function sanitizeStorageName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function sha256Of(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export interface AuditJobsRouterOptions {
  repo?: typeof auditJobRepository;
  createClient?: () => Promise<InsForgeClient>;
  bucket?: string;
}

/**
 * Router de la arquitectura asíncrona.
 * - POST /audit/jobs -> 202 + jobId (no ejecuta AssemblyAI/Vision/Synthesis)
 * - GET  /audit/jobs/:jobId -> estado (Cache-Control: no-store)
 * - GET  /audit/jobs/:jobId/result -> resultado (Cache-Control: no-store)
 */
export function createAuditJobsRouter(options: AuditJobsRouterOptions = {}): express.Router {
  const repo = options.repo ?? auditJobRepository;
  const createClient = options.createClient ?? (async () => {
    const { getAnonClient } = await import('../lib/insforge/client.js');
    return getAnonClient();
  });
  const bucket = options.bucket ?? EVIDENCE_BUCKET;

  const router = express.Router();

  router.post('/audit/jobs', jobsUpload.array('evidencias', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'No se proporcionaron archivos' });
      }

      const client = await createClient();
      const job = await repo.createAuditJob();

      // Insertar evidencias REALES con metadata, ANTES del upload de storage
      const descriptors = files.map((file, i) => {
        const type = inferEvidenceType(file.mimetype);
        const storageKey = `audit-jobs/${job.id}/ev_${i + 1}/${sanitizeStorageName(file.originalname)}`;
        return {
          filename: file.originalname,
          mime_type: file.mimetype,
          size_bytes: file.size,
          sha256: sha256Of(file.buffer),
          type,
          storage_key: storageKey,
        };
      });

      const inserted = await repo.insertJobEvidences(job.id, descriptors);

      // Subir cada archivo a InsForge Storage
      const promises = inserted.map((evidence, i) => {
        const file = files[i];
        return (async () => {
          try {
            const blob = new Blob([file.buffer as unknown as BlobPart], { type: file.mimetype });
            const upload = await client.storage.from(bucket).upload(evidence.storage_key, blob);
            if (upload.error) {
              throw new Error(`Upload fallido para ${evidence.filename}: ${upload.error.message}`);
            }
            const key = upload.data?.key || evidence.storage_key;
            const url = upload.data?.url;
            await repo.updateEvidenceStorage(evidence.id, { storage_key: key, storage_url: url });
            return { evidenceId: evidence.id, status: 'uploaded' };
          } catch (err) {
            console.error(`[jobs] Upload fallido ${evidence.filename}:`, err);
            await repo.updateEvidenceStatus(evidence.id, 'error');
            return { evidenceId: evidence.id, status: 'upload_failed' };
          }
        })();
      });

      const uploadResults = await Promise.all(promises);
      const failures = uploadResults.filter(r => r.status === 'upload_failed');

      if (failures.length > 0) {
        await repo.updateJobProgress(job.id, 5, 'upload_error', `${failures.length} archivo(s) no pudieron subirse`);
        return res.status(500).json({
          error: 'UPLOAD_FAILED',
          message: `No se pudieron subir ${failures.length} archivo(s) al storage`,
          jobId: job.id,
        });
      }

      await repo.updateJobProgress(job.id, 5, 'uploaded', `${files.length} evidencia(s) subidas`);
      res.status(202).json({
        success: true,
        jobId: job.id,
        status: 'queued',
        progress: 5,
        evidences: inserted.map(ev => ({ id: ev.id, filename: ev.filename, type: ev.type })),
      });
    } catch (error) {
      console.error('Error creating audit job:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Error al crear trabajo de auditoría',
      });
    }
  });

  router.get('/audit/jobs/:jobId', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const jobId = req.params.jobId;
      const { job, evidenceCounts } = await repo.getJobProgress(jobId);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job no encontrado' });
      }
      res.json({
        success: true,
        data: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          stage: job.stage,
          detail: job.detail,
          attempts: job.attempts,
          max_attempts: job.max_attempts,
          createdAt: job.created_at,
          completedAt: job.completed_at,
          evidenceCounts,
        },
      });
    } catch (error) {
      console.error('Error getting job progress:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Error al obtener progreso del job',
      });
    }
  });

  router.get('/audit/jobs/:jobId/result', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const jobId = req.params.jobId;
      const { job } = await repo.getJobProgress(jobId);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job no encontrado' });
      }

      if (job.status === 'success' && job.result) {
        return res.json({ success: true, data: job.result, jobId: job.id });
      }
      if (job.status === 'processing' || job.status === 'queued') {
        return res.status(409).json({
          success: false,
          error: 'PROCESSING',
          message: 'La auditoría aún está en procesamiento',
          progress: job.progress,
          stage: job.stage,
        });
      }
      if (job.status === 'error') {
        return res.status(500).json({
          success: false,
          error: job.error || 'ERROR_AUDIT',
          message: job.detail || 'Error en la auditoría',
          jobId: job.id,
        });
      }
      // fallback (retrying, cancelled...)
      return res.status(202).json({
        success: false,
        error: 'QUEUED',
        message: 'El job sigue en cola',
        progress: job.progress,
        stage: job.stage,
      });
    } catch (error) {
      console.error('Error getting job result:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Error al obtener resultado del job',
      });
    }
  });

  return router;
}

export const auditJobsRouter = createAuditJobsRouter();