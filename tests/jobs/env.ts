/**
 * Configuración de entorno determinista para los tests de jobs.
 * DEBE importarse ANTES que cualquier módulo que lea estas variables a nivel de módulo
 * (audit-worker.ts y audit-job-repository.ts leen env al importarse).
 */
process.env.AUDIT_EVIDENCE_CONCURRENCY = process.env.AUDIT_EVIDENCE_CONCURRENCY || '2';
process.env.AUDIT_JOB_MAX_ATTEMPTS = process.env.AUDIT_JOB_MAX_ATTEMPTS || '5';
process.env.AUDIT_WORKER_HEARTBEAT_MS = process.env.AUDIT_WORKER_HEARTBEAT_MS || '15000';
// Sin claves reales: si el código toca AssemblyAI/OpenRouter en un endpoint 202, fallará por config.
process.env.ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '';
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
process.env.DATABASE_URL = process.env.DATABASE_URL || '';

export {};