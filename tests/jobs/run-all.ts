/**
 * SUITE DE PRUEBAS DE LA ARQUITECTURA DE JOBS ASÍNCRONA (worker + cola + API).
 *
 *   node --import tsx tests/jobs/run-all.ts
 *
 * Cubre:
 *   - Clasificación PDF por página (TEXT / HYBRID / VISUAL) con señales de pdfjs-dist reales.
 *   - Lógica de reintentos (max_attempts=5, sin doble incremento, retry de síntesis).
 *   - Flujo del worker (concurrencia acotada, skip-de-éxito, heartbeat).
 *   - Daemon (arranca, se mantiene vivo, stop limpio).
 *   - API HTTP (202 sin llamadas externas, Cache-Control: no-store, ruta legacy).
 *   - E2E mockeado (1 audio + 1 PDF TEXT + 1 PDF HYBRID + 1 imagen).
 *   - Shutdown del entrypoint.
 */
import './env.js';

import { runPdfClassificationTests } from './pdf-classification.test.js';
import { runRetryLogicTests } from './retry-logic.test.js';
import { runWorkerFlowTests } from './worker-flow.test.js';
import { runWorkerDaemonTests } from './worker-daemon.test.js';
import { runJobsApiTests } from './jobs-api.test.js';
import { runMockE2ETests } from './mock-e2e.test.js';
import { runWorkerShutdownTests } from './worker-shutdown.test.js';

console.log('================================================================');
console.log('SUITE JOBS — AUDITORÍA MULTIMODAL ASÍNCRONA (PostgreSQL + Worker)');
console.log('================================================================');
console.log('Env determinista: concurrency=2, max_attempts=5, sin claves externas.');

const suites = [
  ['PDF Classification', runPdfClassificationTests],
  ['Retry Logic', runRetryLogicTests],
  ['Worker Flow', runWorkerFlowTests],
  ['Worker Daemon', runWorkerDaemonTests],
  ['Jobs API', runJobsApiTests],
  ['Mock E2E', runMockE2ETests],
  ['Worker Shutdown', runWorkerShutdownTests],
] as const;

let totalPassed = 0;
let totalFailed = 0;

for (const [name, fn] of suites) {
  const results = await fn();
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  totalPassed += passed;
  totalFailed += failed;
  console.log(`\n=== ${name}: ${passed}/${results.length} aprobadas ===`);
}

console.log('\n================================================================');
console.log(`TOTAL JOBS: ${totalPassed}/${totalPassed + totalFailed} pruebas aprobadas`);
console.log('================================================================');

if (totalFailed > 0 || totalPassed === 0) {
  console.error('SUITE JOBS: ALGUNAS PRUEBAS FALLARON');
  process.exitCode = 1;
} else {
  console.log('SUITE JOBS: TODAS LAS PRUEBAS APROBADAS');
}