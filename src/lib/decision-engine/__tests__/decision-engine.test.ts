import { analyzeCancellationCase } from '../decision-engine';
import { CancellationCase } from '../types';

export interface TestCaseResult {
  testNumber: number;
  title: string;
  expectedClassification: string;
  actualClassification: string;
  expectedRootCause?: string;
  actualRootCause?: string;
  passed: boolean;
  notes: string;
  reasoning: string[];
}

export function runAllDecisionTests(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // =========================================================================
  // TEST 1: Solicitud antes de inicio
  // -> Cancelación de venta a solicitud del estudiante
  // =========================================================================
  const caseTest1: CancellationCase = {
    ticketId: 'TEST-01',
    student: {
      name: 'Estudiante Test 1',
      enrollmentId: '01001',
      program: 'Lic. en Derecho',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-09-01',
      requestDate: '2026-08-25' // 7 días antes
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: true,
      reason: 'Solicito cancelación antes de iniciar clases'
    },
    academic: {
      enteredVirtualClassroom: false,
      hasGrades: false
    },
    contacts: {
      calls: [],
      writtenInteractions: [],
      effectiveContacts: []
    },
    operational: {},
    retention: {},
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res1 = analyzeCancellationCase(caseTest1);
  const pass1 = res1.classification === 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE' || res1.classification === 'CANCELACION_VENTA';
  results.push({
    testNumber: 1,
    title: 'TEST 1: Solicitud antes de inicio',
    expectedClassification: 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE',
    actualClassification: res1.classification,
    expectedRootCause: 'SOLICITUD_PREVIA_AL_INICIO',
    actualRootCause: res1.rootCause,
    passed: pass1,
    notes: 'Solicitud formal 7 días previa al inicio. Aplica cancelación de venta regular.',
    reasoning: res1.reasoning
  });

  // =========================================================================
  // TEST 2: Solicitud después de inicio + estudiante solicita baja + retención no efectiva
  // -> Baja
  // =========================================================================
  const caseTest2: CancellationCase = {
    ticketId: 'TEST-02',
    student: {
      name: 'Estudiante Test 2',
      enrollmentId: '01002',
      program: 'Lic. en Psicología',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-10' // 10 días después
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: true,
      reason: 'Ya no deseo continuar por motivos personales'
    },
    academic: {
      enteredVirtualClassroom: true,
      hasGrades: false
    },
    contacts: {
      calls: [
        {
          id: 'call-2',
          title: 'Llamada de retención',
          date: '2026-09-10',
          time: '12:00',
          duration: '05:00',
          durationSeconds: 300,
          status: 'TRANSCRIPCION_COMPLETADA',
          campaign: 'RETENCION',
          phoneNumber: '+525511223344',
          intentsRatio: '1/1',
          sentiment: 'Neutro',
          detectedIntentions: ['Ratifica baja'],
          keyMoments: [],
          effectiveContact: { efectivo: true, criterios: [] },
          transcript: []
        }
      ],
      writtenInteractions: [],
      effectiveContacts: [
        {
          contactId: 'c-2',
          date: '2026-09-10',
          isEffective: true,
          titularConfirmed: true,
          purposeExplained: true,
          cycleInfoProvided: true,
          institutionIdentified: true,
          personalDataConfirmed: true,
          decisionManifested: true
        }
      ]
    },
    operational: {},
    retention: {
      attempted: true,
      successful: false,
      acceptedBenefit: false
    },
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res2 = analyzeCancellationCase(caseTest2);
  const pass2 = res2.classification === 'BAJA';
  results.push({
    testNumber: 2,
    title: 'TEST 2: Solicitud posterior al inicio con retención no efectiva',
    expectedClassification: 'BAJA',
    actualClassification: res2.classification,
    expectedRootCause: 'SOLICITUD_DEL_ESTUDIANTE',
    actualRootCause: res2.rootCause,
    passed: pass2,
    notes: 'Solicitud posterior a inicio, retención agotada y sin error operativo institucional. Corresponde Baja.',
    reasoning: res2.reasoning
  });

  // =========================================================================
  // TEST 3: 15 llamadas + 6 escritos + sin contacto efectivo + sin actividad académica
  // -> Ilocalizable
  // =========================================================================
  const calls15: any[] = [];
  for (let i = 0; i < 15; i++) {
    calls15.push({
      id: `c-ilo-${i + 1}`,
      title: `Intento ${i + 1}`,
      date: '2026-09-05',
      time: i % 2 === 0 ? '10:00' : '17:00',
      duration: '00:00',
      durationSeconds: 0,
      status: 'TRANSCRIPCION_COMPLETADA',
      campaign: 'ILOCALIZABLE',
      phoneNumber: '+525500000000',
      intentsRatio: `${i + 1}/15`,
      sentiment: 'Neutro',
      detectedIntentions: ['Buzón'],
      keyMoments: [],
      effectiveContact: { efectivo: false, criterios: [] },
      transcript: []
    });
  }

  const written6: any[] = [];
  for (let i = 0; i < 6; i++) {
    written6.push({
      id: `w-ilo-${i + 1}`,
      date: '2026-09-05',
      channel: 'WHATSAPP',
      received: false,
      summary: 'Sin respuesta'
    });
  }

  const caseTest3: CancellationCase = {
    ticketId: 'TEST-03',
    student: {
      name: 'Estudiante Test 3',
      enrollmentId: '01003',
      program: 'Lic. en Administración',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-12' // Dentro de las 2 semanas
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: false,
      reason: 'Ilocalizable'
    },
    academic: {
      enteredVirtualClassroom: false,
      selectedEvaluationMethod: false,
      hasActivities: false,
      hasGrades: false
    },
    contacts: {
      calls: calls15,
      writtenInteractions: written6,
      effectiveContacts: []
    },
    operational: {},
    retention: {},
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res3 = analyzeCancellationCase(caseTest3);
  const pass3 = res3.classification === 'CANCELACION_VENTA_ILOCALIZABLE';
  results.push({
    testNumber: 3,
    title: 'TEST 3: Protocolo ilocalizable completado (15 llamadas + 6 escritos)',
    expectedClassification: 'CANCELACION_VENTA_ILOCALIZABLE',
    actualClassification: res3.classification,
    expectedRootCause: 'AGOTAMIENTO_PROTOCOLO_ILOCALIZABLE',
    actualRootCause: res3.rootCause,
    passed: pass3,
    notes: 'Cumple 15 llamadas, 6 escritos, sin contacto ni actividad en plataforma.',
    reasoning: res3.reasoning
  });

  // =========================================================================
  // TEST 4: 8 llamadas + 3 escritos + sin contacto efectivo
  // -> NO ilocalizable -> Faltan intentos mínimos (REQUIERE_REVISION)
  // =========================================================================
  const caseTest4: CancellationCase = {
    ticketId: 'TEST-04',
    student: {
      name: 'Estudiante Test 4',
      enrollmentId: '01004',
      program: 'Lic. en Pedagogía',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-08'
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: false,
      reason: 'Ilocalizable parcial'
    },
    academic: {
      enteredVirtualClassroom: false,
      selectedEvaluationMethod: false,
      hasGrades: false
    },
    contacts: {
      calls: calls15.slice(0, 8),
      writtenInteractions: written6.slice(0, 3),
      effectiveContacts: []
    },
    operational: {},
    retention: {},
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res4 = analyzeCancellationCase(caseTest4);
  const pass4 = res4.classification === 'REQUIERE_REVISION' && res4.missingEvidence.some(m => m.includes('llamadas') || m.includes('interacciones'));
  results.push({
    testNumber: 4,
    title: 'TEST 4: Intentos mínimos insuficientes (8 llamadas + 3 escritos)',
    expectedClassification: 'REQUIERE_REVISION',
    actualClassification: res4.classification,
    expectedRootCause: 'INTENTOS_MINIMOS_INSUFICIENTES',
    actualRootCause: res4.rootCause,
    passed: pass4,
    notes: `Se rechaza ilocalizable. Faltan ${res4.missingEvidence.join(', ')}.`,
    reasoning: res4.reasoning
  });

  // =========================================================================
  // TEST 5: Estudiante con calificaciones
  // -> Baja (Hard Blocker: cancelación de venta bloqueada)
  // =========================================================================
  const caseTest5: CancellationCase = {
    ticketId: 'TEST-05',
    student: {
      name: 'Estudiante Test 5',
      enrollmentId: '01005',
      program: 'Lic. en Mercadotecnia',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-07'
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: true,
      reason: 'Quiero cancelar mi carrera'
    },
    academic: {
      enteredVirtualClassroom: true,
      selectedEvaluationMethod: true,
      hasActivities: true,
      hasGrades: true // Hard blocker
    },
    contacts: {
      calls: [],
      writtenInteractions: [],
      effectiveContacts: []
    },
    operational: {
      materialLoadError: true // Aunque hubiese error operativo, calificaciones bloquea
    },
    retention: {},
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res5 = analyzeCancellationCase(caseTest5);
  const pass5 = res5.classification === 'BAJA' && res5.hardBlockers.length > 0;
  results.push({
    testNumber: 5,
    title: 'TEST 5: Estudiante con calificaciones registradas en Bimestre 1',
    expectedClassification: 'BAJA',
    actualClassification: res5.classification,
    expectedRootCause: 'DEVENGAMIENTO_SERVICIO_CALIFICACIONES',
    actualRootCause: res5.rootCause,
    passed: pass5,
    notes: 'Prioridad 1 y Hard Blocker: devengamiento de servicio invalida cualquier cancelación.',
    reasoning: res5.reasoning
  });

  // =========================================================================
  // TEST 6: Error de inscripción + ajuste no realizado en 20 días
  // -> Cancelación de venta
  // =========================================================================
  const caseTest6: CancellationCase = {
    ticketId: 'TEST-06',
    student: {
      name: 'Estudiante Test 6',
      enrollmentId: '01006',
      program: 'Lic. en Contaduría',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-10' // 10 días (dentro de 20 días)
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: true,
      reason: 'Me inscribieron al programa equivocado y no lo corrigieron'
    },
    academic: {
      enteredVirtualClassroom: false,
      hasGrades: false
    },
    contacts: { calls: [], writtenInteractions: [], effectiveContacts: [] },
    operational: {
      enrollmentError: true,
      incorrectProgram: true,
      missingAdjustment: true,
      causalLinkWithCancellation: true
    },
    retention: {},
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res6 = analyzeCancellationCase(caseTest6);
  const pass6 = res6.classification === 'CANCELACION_VENTA' || res6.classification === 'CANCELACION_VENTA_OPERATIVA';
  results.push({
    testNumber: 6,
    title: 'TEST 6: Error de inscripción sin subsanar dentro de 20 días',
    expectedClassification: 'CANCELACION_VENTA',
    actualClassification: res6.classification,
    expectedRootCause: 'ERROR_INSCRIPCION_AJUSTE_NO_APLICADO',
    actualRootCause: res6.rootCause,
    passed: pass6,
    notes: 'Ajuste solicitado dentro de 20 días no concluido institucionalmente. Procede cancelación.',
    reasoning: res6.reasoning
  });

  // =========================================================================
  // TEST 7: Materias cargadas tarde + alumno molesto + solicita desvinculación
  // -> Cancelación de Venta Operativa (Caso CAVE-30274)
  // =========================================================================
  const caseTest7: CancellationCase = {
    ticketId: 'CAVE-30274',
    student: {
      name: 'Carlos Eduardo Escobar Benitez',
      enrollmentId: '010847403',
      program: 'MA Automatización y Robot Industrial',
      educationLevel: 'POSGRADO'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-07' // 7 días después
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: true,
      reason: 'Servicio deficiente / Académico - Carga tardía de materias en aula virtual'
    },
    academic: {
      enteredVirtualClassroom: true,
      enteredAnyActiveSubject: false,
      hasGrades: false
    },
    contacts: {
      calls: [
        {
          id: 'call-30274',
          title: 'Llamada de aclaración',
          date: '2026-09-07',
          time: '14:32',
          duration: '08:45',
          durationSeconds: 525,
          status: 'TRANSCRIPCION_COMPLETADA',
          campaign: 'POSGRADO',
          phoneNumber: '+525565063173',
          intentsRatio: '1/1',
          sentiment: 'Negativo',
          detectedIntentions: ['Cancela por falta de materias'],
          keyMoments: [],
          effectiveContact: { efectivo: true, criterios: [] },
          transcript: [
            {
              id: 'seg-1',
              speaker: 'customer',
              speakerName: 'Cliente',
              start: '01:13',
              end: '01:38',
              startSeconds: 73,
              endSeconds: 98,
              text: 'Quiero cancelar porque todavía no me cargan las materias.'
            }
          ]
        }
      ],
      writtenInteractions: [],
      effectiveContacts: [
        {
          contactId: 'eff-30274',
          date: '2026-09-07',
          isEffective: true,
          titularConfirmed: true,
          purposeExplained: true,
          cycleInfoProvided: true,
          institutionIdentified: true,
          personalDataConfirmed: true,
          decisionManifested: true
        }
      ]
    },
    operational: {
      operationalError: true,
      materialLoadError: true,
      studentUpsetByError: true,
      causalLinkWithCancellation: true
    },
    retention: {
      attempted: true,
      successful: false,
      acceptedBenefit: false
    },
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res7 = analyzeCancellationCase(caseTest7);
  const pass7 = res7.classification === 'CANCELACION_VENTA_OPERATIVA' && res7.rootCause === 'CARGA_TARDIA_MATERIAS';
  results.push({
    testNumber: 7,
    title: 'TEST 7: Carga tardía de materias (Caso Principal CAVE-30274)',
    expectedClassification: 'CANCELACION_VENTA_OPERATIVA',
    actualClassification: res7.classification,
    expectedRootCause: 'CARGA_TARDIA_MATERIAS',
    actualRootCause: res7.rootCause,
    passed: pass7,
    notes: 'Caso CAVE-30274 clasifica como Cancelación de Venta Operativa con causa raíz Carga tardía de materias.',
    reasoning: res7.reasoning
  });

  // =========================================================================
  // TEST 8: Promesa de venta comprobada + no acepta beneficios
  // -> Cancelación de Venta por Promesa No Cumplida
  // =========================================================================
  const caseTest8: CancellationCase = {
    ticketId: 'TEST-08',
    student: {
      name: 'Estudiante Test 8',
      enrollmentId: '01008',
      program: 'Lic. en Negocios Internacionales',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-08'
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: true,
      reason: 'El asesor me prometió titulación automática sin tesis ni examen y no es real'
    },
    academic: { enteredVirtualClassroom: false, hasGrades: false },
    contacts: { calls: [], writtenInteractions: [], effectiveContacts: [] },
    operational: {},
    retention: {
      attempted: true,
      successful: false,
      acceptedBenefit: false
    },
    salesPromise: {
      status: 'CONFIRMED',
      proven: true,
      evidenceText: 'Grabación de llamada del 25/08 donde el asesor promete titulación sin requisitos de ley.'
    },
    cycleChange: {},
    evidence: []
  };

  const res8 = analyzeCancellationCase(caseTest8);
  const pass8 = res8.classification === 'CANCELACION_VENTA_PROMESA_NO_CUMPLIDA';
  results.push({
    testNumber: 8,
    title: 'TEST 8: Promesa de venta no cumplida comprobada',
    expectedClassification: 'CANCELACION_VENTA_PROMESA_NO_CUMPLIDA',
    actualClassification: res8.classification,
    expectedRootCause: 'PROMESA_DE_VENTA_NO_CUMPLIDA',
    actualRootCause: res8.rootCause,
    passed: pass8,
    notes: 'Acreditada promesa falsa en grabación, rechazo de retención y solicitud de desvinculación.',
    reasoning: res8.reasoning
  });

  // =========================================================================
  // TEST 9: Mystery Shopper
  // -> Cancelación de Matrícula
  // =========================================================================
  const caseTest9: CancellationCase = {
    ticketId: 'TEST-09',
    student: {
      name: 'Auditor Mystery Shopper',
      enrollmentId: '01009',
      program: 'Lic. en Gestión de TI',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-04'
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: true,
      reason: 'Canal Mystery Shopper'
    },
    academic: { enteredVirtualClassroom: false, hasGrades: false },
    contacts: { calls: [], writtenInteractions: [], effectiveContacts: [] },
    operational: {},
    retention: {},
    salesPromise: {},
    cycleChange: {},
    evidence: [],
    channel: 'MYSTERY_SHOPPER'
  };

  const res9 = analyzeCancellationCase(caseTest9);
  const pass9 = res9.classification === 'CANCELACION_DE_MATRICULA';
  results.push({
    testNumber: 9,
    title: 'TEST 9: Canal Mystery Shopper (Servicios Escolares)',
    expectedClassification: 'CANCELACION_DE_MATRICULA',
    actualClassification: res9.classification,
    expectedRootCause: 'CANAL_MYSTERY_SHOPPER',
    actualRootCause: res9.rootCause,
    passed: pass9,
    notes: 'Cancelación de Matrícula sin impacto al KPI de cancelaciones de venta.',
    reasoning: res9.reasoning
  });

  // =========================================================================
  // TEST 10: Información insuficiente
  // -> Requiere Revisión
  // =========================================================================
  const caseTest10: CancellationCase = {
    ticketId: 'TEST-10',
    student: {
      name: 'Estudiante Incompleto',
      enrollmentId: '01010',
      program: 'Lic. en Criminología',
      educationLevel: 'UNKNOWN'
    },
    dates: {
      startDate: undefined, // Falta fecha
      requestDate: '2026-09-07'
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: false,
      reason: undefined // Falta motivo
    },
    academic: { enteredVirtualClassroom: false },
    contacts: { calls: [], writtenInteractions: [], effectiveContacts: [] },
    operational: {},
    retention: {},
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res10 = analyzeCancellationCase(caseTest10);
  const pass10 = res10.classification === 'REQUIERE_REVISION';
  results.push({
    testNumber: 10,
    title: 'TEST 10: Expediente con información esencial insuficiente',
    expectedClassification: 'REQUIERE_REVISION',
    actualClassification: res10.classification,
    expectedRootCause: 'FALTA_INFORMACION_ESENCIAL',
    actualRootCause: res10.rootCause,
    passed: pass10,
    notes: 'El motor detiene la clasificación sin inventar dictamen y reporta missingEvidence.',
    reasoning: res10.reasoning
  });

  // =========================================================================
  // TEST 11: Solicitud de cancelación + Error Operativo (Resolución de conflicto)
  // -> Cancelación de Venta Operativa prevalece sobre Baja
  // =========================================================================
  const caseTest11: CancellationCase = {
    ticketId: 'TEST-11',
    student: {
      name: 'Estudiante Test 11',
      enrollmentId: '01011',
      program: 'Lic. en Finanzas',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-09' // Posterior al inicio
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: true,
      reason: 'El alumno solicita no continuar pero se acreditó falta de reflejo de pago en cobranza'
    },
    academic: { enteredVirtualClassroom: false, hasGrades: false },
    contacts: { calls: [], writtenInteractions: [], effectiveContacts: [] },
    operational: {
      financialError: true,
      paymentNotReflected: true,
      studentUpsetByError: true,
      causalLinkWithCancellation: true
    },
    retention: {
      attempted: true,
      successful: false,
      acceptedBenefit: false
    },
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res11 = analyzeCancellationCase(caseTest11);
  const pass11 = res11.classification === 'CANCELACION_VENTA_OPERATIVA' && res11.conflicts && res11.conflicts.length > 0;
  results.push({
    testNumber: 11,
    title: 'TEST 11: Conflicto entre Solicitud post-inicio (Baja) vs Falla Operativa',
    expectedClassification: 'CANCELACION_VENTA_OPERATIVA',
    actualClassification: res11.classification,
    expectedRootCause: 'ERROR_ADMINISTRATIVO_FINANZAS',
    actualRootCause: res11.rootCause,
    passed: pass11,
    notes: 'El resolver de conflictos determina que la falla institucional prevalece sobre la baja ordinaria.',
    reasoning: res11.reasoning
  });

  // =========================================================================
  // TEST 12: Ilocalizable inicial + posteriormente contacta al asesor y solicita no continuar
  // -> Se descarta ilocalizable y aplica solicitud expresa / procedimiento
  // =========================================================================
  const caseTest12: CancellationCase = {
    ticketId: 'TEST-12',
    student: {
      name: 'Estudiante Test 12',
      enrollmentId: '01012',
      program: 'Lic. en Comunicación',
      educationLevel: 'LICENCIATURA'
    },
    dates: {
      startDate: '2026-08-31',
      requestDate: '2026-09-10'
    },
    request: {
      wantsToContinue: false,
      explicitCancellationRequest: true,
      reason: 'El estudiante contactó directamente a su asesor indicando que no continuará'
    },
    academic: { enteredVirtualClassroom: false, hasGrades: false },
    contacts: {
      calls: [
        {
          id: 'call-contact-after',
          title: 'Llamada entrante del alumno',
          date: '2026-09-10',
          time: '11:00',
          duration: '04:20',
          durationSeconds: 260,
          status: 'TRANSCRIPCION_COMPLETADA',
          campaign: 'INBOUND',
          phoneNumber: '+525599887766',
          intentsRatio: '1/1',
          sentiment: 'Neutro',
          detectedIntentions: ['Solicita desvinculación'],
          keyMoments: [],
          effectiveContact: { efectivo: true, criterios: [] },
          transcript: []
        }
      ],
      writtenInteractions: written6,
      effectiveContacts: [
        {
          contactId: 'eff-12',
          date: '2026-09-10',
          isEffective: true,
          titularConfirmed: true,
          purposeExplained: true,
          cycleInfoProvided: true,
          institutionIdentified: true,
          personalDataConfirmed: true,
          decisionManifested: true
        }
      ]
    },
    operational: {},
    retention: {
      attempted: true,
      successful: false,
      acceptedBenefit: false
    },
    salesPromise: {},
    cycleChange: {},
    evidence: []
  };

  const res12 = analyzeCancellationCase(caseTest12);
  const pass12 = res12.classification !== 'CANCELACION_VENTA_ILOCALIZABLE' && res12.classification === 'BAJA';
  results.push({
    testNumber: 12,
    title: 'TEST 12: Ilocalizable que posteriormente contacta y pide no continuar',
    expectedClassification: 'BAJA',
    actualClassification: res12.classification,
    expectedRootCause: 'SOLICITUD_DEL_ESTUDIANTE',
    actualRootCause: res12.rootCause,
    passed: pass12,
    notes: 'El contacto efectivo posterior rompe el supuesto de ilocalizable y traslada el caso a trámite ordinario.',
    reasoning: res12.reasoning
  });

  return results;
}
