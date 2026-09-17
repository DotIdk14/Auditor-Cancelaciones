import { strict as assert } from 'node:assert';
import {
  addManualEvidence,
  analyzeTicketEvidence,
  canTransitionTicket,
  createInitialTicket,
  getChronologicalEvidence,
  transitionTicket
} from '../index';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[✓ PASÓ] ${name}`);
  } catch (error) {
    console.error(`[✗ FALLÓ] ${name}`);
    throw error;
  }
}

console.log('--- FASES 2-4: Tickets, evidencias y análisis trazable ---');

test('permite transiciones seguras de ticket y bloquea saltos inválidos a PDF_EMITIDO', () => {
  const ticket = createInitialTicket({ folio: 'CaVe-28259', createdBy: 'auditor-principal', now: '2026-04-07T10:00:00.000Z' });

  assert.equal(canTransitionTicket(ticket, 'EVIDENCIAS_PENDIENTES'), true);
  assert.equal(canTransitionTicket(ticket, 'PDF_EMITIDO'), false);

  const moved = transitionTicket(ticket, 'EVIDENCIAS_PENDIENTES', 'auditor-principal', 'Inicio de recopilación');
  assert.equal(moved.status, 'EVIDENCIAS_PENDIENTES');
  assert.equal(moved.excepciones.length, 1);
  assert.equal(moved.excepciones[0].campoModificado, 'status');
});

test('agrega evidencias manuales con hash, fuente y orden cronológico estable', () => {
  const ticket = createInitialTicket({ folio: 'CaVe-28259', createdBy: 'auditor-principal' });
  const withSiu = addManualEvidence(ticket, {
    nombreArchivo: 'siu-calificaciones.pdf',
    tipo: 'PDF',
    fuente: 'SIU',
    storagePath: 'local://siu-calificaciones.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1200,
    sha256: 'a'.repeat(64),
    fechaEvidencia: '2026-04-07T11:00:00.000Z'
  });
  const withI6 = addManualEvidence(withSiu, {
    nombreArchivo: 'i6-intentos.png',
    tipo: 'IMAGE',
    fuente: 'I6',
    storagePath: 'local://i6-intentos.png',
    mimeType: 'image/png',
    sizeBytes: 800,
    sha256: 'b'.repeat(64),
    fechaEvidencia: '2026-04-06T10:00:00.000Z'
  });

  const chronological = getChronologicalEvidence(withI6);
  assert.equal(chronological[0].fuente, 'I6');
  assert.equal(chronological[1].fuente, 'SIU');
  assert.equal(chronological[0].ordenCronologico, 1);
  assert.equal(chronological[1].ordenCronologico, 2);
});

test('rechaza evidencia manual sin hash sha256 válido', () => {
  const ticket = createInitialTicket({ folio: 'CaVe-28259', createdBy: 'auditor-principal' });

  assert.throws(() => addManualEvidence(ticket, {
    nombreArchivo: 'archivo.png',
    tipo: 'IMAGE',
    fuente: 'CAPTURA',
    storagePath: 'local://archivo.png',
    mimeType: 'image/png',
    sizeBytes: 100,
    sha256: 'invalido'
  }), /sha256/);
});

test('analiza evidencias y enlaza reglas con evidencia concreta', () => {
  const base = createInitialTicket({ folio: 'CaVe-28259', createdBy: 'auditor-principal' });
  const withEvidence = [
    {
      nombreArchivo: 'i6-intentos.png',
      tipo: 'IMAGE' as const,
      fuente: 'I6' as const,
      storagePath: 'local://i6-intentos.png',
      mimeType: 'image/png',
      sizeBytes: 800,
      sha256: 'c'.repeat(64),
      fechaEvidencia: '2026-04-06T10:00:00.000Z',
      textoExtraido: '15 llamadas realizadas y 6 interacciones escritas sin contacto efectivo'
    },
    {
      nombreArchivo: 'aula-virtual.png',
      tipo: 'IMAGE' as const,
      fuente: 'AULA_VIRTUAL' as const,
      storagePath: 'local://aula-virtual.png',
      mimeType: 'image/png',
      sizeBytes: 900,
      sha256: 'd'.repeat(64),
      fechaEvidencia: '2026-04-07T10:00:00.000Z',
      textoExtraido: 'alumna sin ingreso a materias y sin actividad en aula virtual'
    },
    {
      nombreArchivo: 'siu-calificaciones.png',
      tipo: 'IMAGE' as const,
      fuente: 'SIU' as const,
      storagePath: 'local://siu-calificaciones.png',
      mimeType: 'image/png',
      sizeBytes: 900,
      sha256: 'e'.repeat(64),
      fechaEvidencia: '2026-04-07T11:00:00.000Z',
      textoExtraido: 'sin calificaciones registradas'
    }
  ].reduce((ticket, evidence) => addManualEvidence(ticket, evidence), base);

  const analyzed = analyzeTicketEvidence(withEvidence);
  assert.equal(analyzed.status, 'DICTAMEN_PROPUESTO');
  assert.equal(analyzed.resultado.principal, 'CANCELACION_VENTA');
  assert.equal(analyzed.resultado.subtipo, 'ILOCALIZABLE');
  assert.equal(analyzed.resultado.automatico, true);

  const appliedRules = analyzed.reglas.filter(rule => rule.status === 'APLICADA');
  assert.ok(appliedRules.some(rule => rule.codigoPolitica === '5.2.b' && rule.evidenciaIds.length > 0));
  assert.ok(appliedRules.some(rule => rule.codigoPolitica === '5.8.a' && rule.evidenciaIds.length > 0));
  assert.ok(appliedRules.some(rule => rule.codigoPolitica === '5.7.d' && rule.evidenciaIds.length > 0));
});

console.log('Fases 2-4 verificadas.');
