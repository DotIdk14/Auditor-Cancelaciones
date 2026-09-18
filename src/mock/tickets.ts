import { addManualEvidence, analyzeTicketEvidence, createInitialTicket, Ticket } from '../lib/tickets';

export type { Ticket };

function buildIlocalizableTicket(): Ticket {
  const base = createInitialTicket({
    folio: 'CaVe-28259',
    createdBy: 'auditor-principal',
    now: '2026-04-07T10:00:00.000Z'
  });

  const withData: Ticket = {
    ...base,
    estudiante: {
      nombre: 'Lorena Guadalupe Moran Mejia',
      matricula: '010812951',
      correo: 'lorenamoram25@gmail.com',
      telefono: '+525528954457',
      programa: 'LICENCIATURA EN MERCADOTECNIA',
      canal: 'INC_INCONCERT'
    },
    fechas: {
      fechaCreacion: '10 de Marzo de 2026 a las 10:51',
      fechaDecision: '17/03',
      fechaInicioCiclo: '16 de Marzo de 2026',
      fechaSolicitudTicket: '26/03',
      fechaAsignadoDictaminar: '1/04',
      fechaDictamenAplicado: '7 de abril de 2026 (11:55)'
    },
    solicitud: {
      politicaSolicitada: '07 Alumno Ilocalizable (sin ingreso a materias)',
      motivo: 'No se localiza y no ingresa',
      descripcion: 'Estudiante ILO sin actividad en AV',
      primerPago: false
    },
    comentarios: {
      backOffice: '- imagen -',
      helpDesk: 'Aplica para revisión de cancelación de venta; estudiante no contactable para GEE y sin actividad académica acreditada.',
      ser: '',
      finanzas: '',
      auditor: 'OBSERVACIONES FINALES pendientes de validación.'
    }
  };

  const withEvidence = [
    {
      nombreArchivo: 'I6 - intentos de contacto.png',
      tipo: 'IMAGE' as const,
      fuente: 'I6' as const,
      storagePath: 'local://i6-intentos.png',
      mimeType: 'image/png',
      sizeBytes: 815203,
      sha256: '1'.repeat(64),
      fechaEvidencia: '2026-04-06T10:00:00.000Z',
      textoExtraido: '15 llamadas realizadas y 6 interacciones escritas sin contacto efectivo'
    },
    {
      nombreArchivo: 'Aula Virtual - sin actividad.png',
      tipo: 'IMAGE' as const,
      fuente: 'AULA_VIRTUAL' as const,
      storagePath: 'local://aula-virtual.png',
      mimeType: 'image/png',
      sizeBytes: 902100,
      sha256: '2'.repeat(64),
      fechaEvidencia: '2026-04-07T10:00:00.000Z',
      textoExtraido: 'alumna sin ingreso a materias y sin actividad en aula virtual'
    },
    {
      nombreArchivo: 'SIU - sin calificaciones.png',
      tipo: 'IMAGE' as const,
      fuente: 'SIU' as const,
      storagePath: 'local://siu-calificaciones.png',
      mimeType: 'image/png',
      sizeBytes: 721220,
      sha256: '3'.repeat(64),
      fechaEvidencia: '2026-04-07T11:00:00.000Z',
      textoExtraido: 'sin calificaciones registradas'
    }
  ].reduce((ticket, evidence) => addManualEvidence(ticket, evidence, '2026-04-07T12:00:00.000Z'), withData);

  return analyzeTicketEvidence(withEvidence, '2026-04-07T12:15:00.000Z');
}

function buildReviewTicket(): Ticket {
  const base = createInitialTicket({
    folio: 'CaVe-30318',
    createdBy: 'auditor-principal',
    now: '2026-04-08T09:00:00.000Z'
  });

  const partial: Ticket = {
    ...base,
    estudiante: {
      nombre: 'Alumno en revisión',
      matricula: '000000000',
      programa: 'Programa pendiente',
      canal: 'FLOKZU'
    },
    solicitud: {
      politicaSolicitada: 'Pendiente de identificar',
      motivo: 'Evidencias insuficientes',
      descripcion: 'Ticket creado para validar carga manual.'
    }
  };

  return analyzeTicketEvidence(partial, '2026-04-08T09:30:00.000Z');
}

export const MVP_TICKETS: Ticket[] = [buildIlocalizableTicket(), buildReviewTicket()];
