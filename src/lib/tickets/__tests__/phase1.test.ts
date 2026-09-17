import { strict as assert } from 'node:assert';
import {
  CAVE_28259_TEMPLATE_FIELDS,
  REQUIRED_TICKET_TEMPLATE_FIELDS,
  createInitialTicket,
  validateTemplateFieldCoverage
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

console.log('--- FASE 1: Modelo de tickets y plantilla CaVe-28259 ---');

test('crea un ticket inicial en BORRADOR con folio normalizado y sin dictamen automático', () => {
  const ticket = createInitialTicket({ folio: ' cave-28259 ', createdBy: 'auditor-principal' });

  assert.equal(ticket.folio, 'CaVe-28259');
  assert.equal(ticket.status, 'BORRADOR');
  assert.equal(ticket.resultado.automatico, false);
  assert.equal(ticket.resultado.requiereRevision, true);
  assert.deepEqual(ticket.evidencias, []);
  assert.deepEqual(ticket.reglas, []);
  assert.deepEqual(ticket.excepciones, []);
  assert.deepEqual(ticket.pdfsEmitidos, []);
});

test('declara todos los campos dinámicos requeridos por el formato CaVe-28259', () => {
  const fieldNames = CAVE_28259_TEMPLATE_FIELDS.map(field => field.name);

  for (const requiredField of REQUIRED_TICKET_TEMPLATE_FIELDS) {
    assert.ok(
      fieldNames.includes(requiredField),
      `Falta campo requerido de plantilla: ${requiredField}`
    );
  }
});

test('no permite placeholders duplicados ni campos que cambien el formato visual', () => {
  const placeholders = CAVE_28259_TEMPLATE_FIELDS.map(field => field.placeholder);
  assert.equal(new Set(placeholders).size, placeholders.length, 'Hay placeholders duplicados');

  const forbiddenVisualFields = CAVE_28259_TEMPLATE_FIELDS.filter(field => field.affectsLayout === true);
  assert.deepEqual(forbiddenVisualFields, [], 'Ningún campo de Fase 1 debe alterar el layout');
});

test('valida cobertura de plantilla contra el ticket base', () => {
  const ticket = createInitialTicket({ folio: 'CaVe-28259', createdBy: 'auditor-principal' });
  const validation = validateTemplateFieldCoverage(ticket, CAVE_28259_TEMPLATE_FIELDS);

  assert.equal(validation.valid, false);
  assert.ok(validation.missingFields.includes('estudiante.nombre'));
  assert.ok(validation.missingFields.includes('resultado.textoDictamen'));
  assert.equal(validation.layoutSafe, true);
});

console.log('Fase 1 verificada.');
