import { strict as assert } from 'node:assert';
import { addManualEvidence, createInitialTicket, getEvidenceTranscript } from '../index';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[✓ PASÓ] ${name}`);
  } catch (error) {
    console.error(`[✗ FALLÓ] ${name}`);
    throw error;
  }
}

console.log('--- TRANSCRIPCIÓN Y VISOR DE EVIDENCIAS ---');

test('recupera segmentos de transcripción ordenados desde una evidencia de audio', () => {
  const ticket = createInitialTicket({ folio: 'CaVe-28259', createdBy: 'auditor-principal' });
  const withAudio = addManualEvidence(ticket, {
    nombreArchivo: 'llamada-i6.mp3',
    tipo: 'AUDIO',
    fuente: 'I6',
    storagePath: 'local://llamada-i6.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 512000,
    sha256: 'f'.repeat(64),
    fechaEvidencia: '2026-04-06T09:00:00.000Z',
    transcript: [
      { id: 'seg-2', evidenceId: 'ev-1', speaker: 'advisor', speakerName: 'Gestor', start: '00:20', end: '00:32', startSeconds: 20, endSeconds: 32, text: 'No logramos confirmar contacto efectivo.' },
      { id: 'seg-1', evidenceId: 'ev-1', speaker: 'customer', speakerName: 'Estudiante', start: '00:05', end: '00:12', startSeconds: 5, endSeconds: 12, text: 'No contestó la llamada.' }
    ]
  });

  const transcript = getEvidenceTranscript(withAudio.evidencias[0]);
  assert.equal(transcript.length, 2);
  assert.equal(transcript[0].id, 'seg-1');
  assert.equal(transcript[1].id, 'seg-2');
});

test('regresa arreglo vacío cuando la evidencia no tiene transcripción', () => {
  const ticket = createInitialTicket({ folio: 'CaVe-28259', createdBy: 'auditor-principal' });
  const withImage = addManualEvidence(ticket, {
    nombreArchivo: 'captura.png',
    tipo: 'IMAGE',
    fuente: 'CAPTURA',
    storagePath: 'local://captura.png',
    mimeType: 'image/png',
    sizeBytes: 2000,
    sha256: 'a'.repeat(64)
  });

  assert.deepEqual(getEvidenceTranscript(withImage.evidencias[0]), []);
});

console.log('Transcripción verificada.');
