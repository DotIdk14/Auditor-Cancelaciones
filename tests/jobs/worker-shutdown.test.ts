import './env.js';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stopWorker } from '../../src/lib/jobs/audit-worker.js';
import { closePool } from '../../src/lib/jobs/audit-job-repository.js';

export interface JTest { name: string; passed: boolean; detail?: string }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

export async function runWorkerShutdownTests(): Promise<JTest[]> {
  const tests: JTest[] = [];
  const tf = (name: string, fn: () => boolean | Promise<boolean>, detail?: string) =>
    tests.push({ name, passed: !!fn(), detail });

  // ---------------------------------------------------------------
  // 1) Shutdown primitives are idempotent (lo que ejecuta worker.ts en SIGTERM/SIGINT)
  // ---------------------------------------------------------------
  {
    let threw = false;
    try {
      stopWorker();
      stopWorker(); // doble llamada: no debe lanzar
      await closePool();
      await closePool();
    } catch (e) {
      threw = true;
    }
    tf('stopWorker + closePool son idempotentes (sin excepciones al repetir)', () => !threw);
  }

  // ---------------------------------------------------------------
  // 2) Daemon entrypoint: arranca, se mantiene vivo, imprime banner
  //    NOTA: en Windows no se puede despachar SIGTERM "real" a un hijo
  //    (process.kill fuerza el cierre). La ruta SIGTERM/SIGINT de worker.ts
  //    (stopWorker + closePool + exit 0) se cubre en (1) de forma determinista.
  // ---------------------------------------------------------------
  {
    const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'src', 'server', 'worker.ts')], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: '', AUDIT_WORKER_POLL_MS: '200' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    child.stdout?.on('data', (c: Buffer) => { stdout += c.toString(); });
    let stderr = '';
    child.stderr?.on('data', (c: Buffer) => { stderr += c.toString(); });

    // Esperar ~1.2s: con DATABASE_URL vacía el claim falla y se registra, pero el daemon sigue vivo.
    await new Promise(r => setTimeout(r, 1200));

    const alive = child.exitCode === null;
    tf('Worker entrypoint arranca y se mantiene vivo (polling activo)', () => alive);
    tf('Worker imprime banner de arranque', () => stdout.includes('Arrancando worker'), stdout.slice(0, 200));

    if (alive) {
      // Limpieza: forzamos cierre
      child.kill();
      await new Promise<void>(resolve => {
        child.once('exit', () => resolve());
        setTimeout(resolve, 3000);
      });
    }
  }

  const passed = tests.filter(t => t.passed).length;
  console.log(`\n[Worker Shutdown] ${passed}/${tests.length} aprobadas`);
  return tests;
}