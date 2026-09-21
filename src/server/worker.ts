/**
 * Entrypoint del worker de auditoría (daemon).
 *
 *   npm run worker
 *
 * El proceso:
 *   - inicia el polling sobre la cola PostgreSQL
 *   - reclamaciones con FOR UPDATE SKIP LOCKED
 *   - heartbeat periódico durante el procesamiento
 *   - shutdown limpio con SIGTERM / SIGINT
 */
import { startWorker, stopWorker, AUDIT_CONSTANTS } from '../lib/jobs/audit-worker.js';
import { closePool } from '../lib/jobs/audit-job-repository.js';

const POLL_INTERVAL_MS = Number(process.env.AUDIT_WORKER_POLL_MS || 5000);

async function shutdown(signal: string): Promise<void> {
  console.log(`[audit-worker] Recibido ${signal}: deteniendo de forma limpia...`);
  try {
    // Deja de reclamar jobs y limpia timers. No aborta deliberadamente un job activo:
    // si el proceso muere con un job en 'processing', requeue_stale_audit_jobs lo recupera.
    stopWorker();
    await closePool();
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

console.log(`[audit-worker] Arrancando worker (poll=${POLL_INTERVAL_MS}ms, heartbeat=${AUDIT_CONSTANTS.HEARTBEAT_MS}ms)`);

// Inicia el daemon: polling infinito (maxJobs=0) mientras haya jobs en cola.
// El intervalo mantiene el event loop vivo para mantener el proceso corriendo.
startWorker(0, POLL_INTERVAL_MS);