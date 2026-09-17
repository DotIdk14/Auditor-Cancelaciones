import { runAllDecisionTests } from './decision-engine.test';
import { runGoldenCasesRegression } from './golden-cases';
import '../../tickets/__tests__/phase1.test';
import '../../tickets/__tests__/phase2-4.test';

console.log('================================================================');
console.log('AUDITOR DE CANCELACIONES — SUITE COMPLETA DE VERIFICACIÓN Y REGRESIÓN');
console.log('QA & Architecture Validation Harness');
console.log('================================================================\n');

// 1. UNIT TEST SUITE (12 escenarios sintéticos)
console.log('--- 1. SUITE DE REGLAS UNITARIAS (12 PRUEBAS) ---');
const unitTests = runAllDecisionTests();
let unitPassed = 0;

for (const t of unitTests) {
  const icon = t.passed ? '✓ PASÓ' : '✗ FALLÓ';
  console.log(`[${icon}] ${t.title}`);
  console.log(`  Esperado: ${t.expectedClassification} (${t.expectedRootCause || 'N/A'})`);
  console.log(`  Obtenido: ${t.actualClassification} (${t.actualRootCause || 'N/A'})`);
  if (!t.passed) {
    console.log(`  NOTA: ${t.notes}`);
  }
  if (t.passed) unitPassed++;
}
console.log(`Subtotal Reglas Unitarias: ${unitPassed}/${unitTests.length} aprobadas.\n`);

// 2. GOLDEN CASES REGRESSION SUITE (Expedientes mock del sistema)
console.log('--- 2. SUITE DE CASOS DORADOS / GOLDEN CASES REGRESSION ---');
const goldenTests = runGoldenCasesRegression();
let goldenPassed = 0;

for (const g of goldenTests) {
  const icon = g.passed ? '✓ PASÓ' : '✗ FALLÓ';
  console.log(`[${icon}] ${g.caseId} - ${g.title}`);
  console.log(`  Clasificación:     ${g.actual.classification}`);
  console.log(`  Causa Raíz:        ${g.actual.rootCause}`);
  console.log(`  Bloqueos Duros:    ${g.actual.hardBlockers.length > 0 ? g.actual.hardBlockers.join(', ') : 'Ninguno'}`);
  console.log(`  Reglas Aplicadas:  ${g.actual.appliedRuleIds.length} reglas`);
  console.log(`  Conflictos:        ${g.actual.conflictsCount} resueltos`);
  console.log(`  Evid. Faltantes:   ${g.actual.missingEvidence.length > 0 ? g.actual.missingEvidence.join(', ') : 'Ninguna'}`);

  if (!g.passed) {
    console.log('  FALLOS DE REGRESIÓN:');
    for (const f of g.failures) {
      console.log(`    - ${f}`);
    }
  }
  if (g.passed) goldenPassed++;
  console.log('');
}
console.log(`Subtotal Golden Cases: ${goldenPassed}/${goldenTests.length} aprobados.\n`);

// RESUMEN GLOBAL
const totalTests = unitTests.length + goldenTests.length;
const totalPassed = unitPassed + goldenPassed;

console.log('================================================================');
console.log(`BALANCE FINAL: ${totalPassed} / ${totalTests} PRUEBAS EXITOSAS (${Math.round((totalPassed / totalTests) * 100)}%)`);
console.log('================================================================');

if (totalPassed !== totalTests) {
  console.error('\n❌ ERROR: Se detectaron regresiones normativas.');
  process.exit(1);
} else {
  console.log('\n✅ ÉXITO: Todos los casos existentes mantienen su comportamiento intacto.');
}
