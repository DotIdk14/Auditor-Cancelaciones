import { runAllDecisionTests } from './decision-engine.test';

console.log('================================================================');
console.log('AUDITOR DE CANCELACIONES - MOTOR DE DECISIONES: SUITE DE PRUEBAS');
console.log('Fuente de Verdad: GDM_GAM_PRD_MLG_003 Procedimiento Deserción');
console.log('================================================================\n');

const tests = runAllDecisionTests();
let passedCount = 0;

for (const t of tests) {
  const icon = t.passed ? '✓ PASÓ' : '✗ FALLÓ';
  console.log(`[${icon}] ${t.title}`);
  console.log(`  Esperado: ${t.expectedClassification} (${t.expectedRootCause || 'N/A'})`);
  console.log(`  Obtenido: ${t.actualClassification} (${t.actualRootCause || 'N/A'})`);
  console.log(`  Detalle:  ${t.notes}`);
  if (t.passed) passedCount++;
  console.log('');
}

console.log('================================================================');
console.log(`RESULTADO GLOBAL: ${passedCount} / ${tests.length} PRUEBAS COMPLETADAS EXITOSAMENTE`);
console.log('================================================================');

if (passedCount !== tests.length) {
  process.exit(1);
}
