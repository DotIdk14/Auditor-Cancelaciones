import { AuditCase } from '../types/audit';
import { CaseDecisionData } from '../lib/decision-engine/types';
import { CallRecord, TranscriptSegment } from '../types/domain';

const transcriptIlocalizable: TranscriptSegment[] = [
  { id: 'seg-1', speaker: 'advisor', speakerName: 'Asesor', start: '00:00', end: '00:15', startSeconds: 0, endSeconds: 15, text: 'Buenas tardes, me comunico de Gestión de Calidad UTEL con Lorena Guadalupe Moran Mejia.', sentiment: 'neutral' },
  { id: 'seg-2', speaker: 'customer', speakerName: 'Cliente', start: '00:16', end: '00:45', startSeconds: 16, endSeconds: 45, text: '¿Buenas tardes? ¿Quién habla?', sentiment: 'neutral' },
  { id: 'seg-3', speaker: 'advisor', speakerName: 'Asesor', start: '00:46', end: '01:10', startSeconds: 46, endSeconds: 70, text: 'Soy de UTEL Universidad, le llamo para dar seguimiento a su solicitud de inscripción en la Licenciatura en Mercadotecnia. ¿Es usted la titular?', sentiment: 'neutral' },
  { id: 'seg-4', speaker: 'customer', speakerName: 'Cliente', start: '01:11', end: '01:30', startSeconds: 71, endSeconds: 90, text: 'Sí, soy yo. Pero no tengo tiempo ahora.', sentiment: 'frustrated' },
  { id: 'seg-5', speaker: 'advisor', speakerName: 'Asesor', start: '01:31', end: '02:00', startSeconds: 91, endSeconds: 120, text: 'Entiendo, solo le tomará un momento. Quería confirmar si recibió la información de acceso al aula virtual.', sentiment: 'neutral' },
  { id: 'seg-6', speaker: 'customer', speakerName: 'Cliente', start: '02:01', end: '02:20', startSeconds: 121, endSeconds: 140, text: 'No he entrado, la verdad. He estado muy ocupada.', sentiment: 'neutral' },
  { id: 'seg-7', speaker: 'advisor', speakerName: 'Asesor', start: '02:21', end: '02:45', startSeconds: 141, endSeconds: 165, text: 'Le entiendo. Es importante que ingrese cuanto antes para que no se le vencen los plazos. ¿Le puedo ayudar con algo?', sentiment: 'positive' },
  { id: 'seg-8', speaker: 'customer', speakerName: 'Cliente', start: '02:46', end: '03:00', startSeconds: 166, endSeconds: 180, text: 'Mejor me llaman otro día. Gracias.', sentiment: 'neutral' }
];

const transcriptOperativa: TranscriptSegment[] = [
  { id: 'seg-1', speaker: 'advisor', speakerName: 'Asesor', start: '00:00', end: '00:20', startSeconds: 0, endSeconds: 20, text: 'Buenos días, le llamo de UTEL para darle seguimiento a su caso.', sentiment: 'neutral' },
  { id: 'seg-2', speaker: 'customer', speakerName: 'Estudiante', start: '00:21', end: '00:50', startSeconds: 21, endSeconds: 50, text: 'Por fin me llaman. Llevo semanas sin poder entrar a mis materias.', sentiment: 'frustrated' },
  { id: 'seg-3', speaker: 'advisor', speakerName: 'Asesor', start: '00:51', end: '01:20', startSeconds: 51, endSeconds: 80, text: 'Le pido una disculpa por la demora. Estamos revisando su caso de carga de materias en el aula virtual.', sentiment: 'neutral' },
  { id: 'seg-4', speaker: 'customer', speakerName: 'Estudiante', start: '01:21', end: '01:45', startSeconds: 81, endSeconds: 105, text: 'Es que no me aparecen las materias del primer cuatrimestre. Ya hablé con soporte y nada.', sentiment: 'frustrated' },
  { id: 'seg-5', speaker: 'advisor', speakerName: 'Asesor', start: '01:46', end: '02:10', startSeconds: 106, endSeconds: 130, text: 'Entendido. Tenemos reporte de incidencia en la carga masiva de ese programa. Le informo que ya se está corrigiendo.', sentiment: 'neutral' },
  { id: 'seg-6', speaker: 'customer', speakerName: 'Estudiante', start: '02:11', end: '02:35', startSeconds: 131, endSeconds: 155, text: '¿Y cuándo se soluciona? Tengo miedo de perder el ciclo.', sentiment: 'frustrated' },
  { id: 'seg-7', speaker: 'advisor', speakerName: 'Asesor', start: '02:36', end: '03:00', startSeconds: 136, endSeconds: 180, text: 'El área técnica estima 48 horas. Le daré seguimiento personal y le aviso en cuanto esté listo.', sentiment: 'positive' }
];

function createCallRecord(id: string, title: string, transcript: TranscriptSegment[], isPrimary = true): CallRecord {
  const durationSeconds = transcript[transcript.length - 1]?.endSeconds || 180;
  return {
    id,
    title,
    date: '2026-04-07',
    time: '10:00',
    duration: `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')}`,
    durationSeconds,
    status: 'TRANSCRIPCION_COMPLETADA',
    campaign: 'RETENCION_UTEL',
    phoneNumber: '+525528954457',
    intentsRatio: '1/1',
    sentiment: 'Neutro',
    detectedIntentions: ['seguimiento', 'cancelación'],
    keyMoments: [
      { timestamp: '00:10', label: 'Contacto titular verificado', type: 'contact' },
      { timestamp: '01:30', label: 'Manifestación de motivos', type: 'request' }
    ],
    effectiveContact: {
      efectivo: true,
      criterios: [
        { criterio: 'El contacto debe ser con el titular registrado', cumplido: true, evidencia: 'Titular validado' },
        { criterio: 'Identificación formal de UTEL Universidad', cumplido: true, evidencia: 'Saludo institucional' },
        { criterio: 'Información sobre objetivo de la llamada y ciclo', cumplido: true, evidencia: 'Objetivo expuesto' }
      ]
    },
    transcript
  };
}

const mockAuditCases: AuditCase[] = [
  {
    id: 'CAVE-28259',
    status: 'EN_ANALISIS',
    statusLabel: 'En análisis',
    matricula: '010812951',
    studentName: 'Lorena Guadalupe Moran Mejia',
    program: 'LICENCIATURA EN MERCADOTECNIA',
    level: 'LICENCIATURA',
    channel: 'INC_INCONCERT',
    startDate: '16/03/2026',
    requestDate: '26/03/2026',
    daysFromStart: 10,
    workingDaysFromStart: 7,
    requestedPolicy: '07 Alumno Ilocalizable (sin ingreso a materias)',
    requestReason: 'No se localiza y no ingresa',
    studentContactNumber: '+525528954457',
    campaign: 'RETENCION_UTEL',
    primaryCall: createCallRecord('call-1', 'Llamada de seguimiento - 07/04/2026', transcriptIlocalizable),
    secondaryCalls: [
      createCallRecord('call-2', 'Segundo intento - 08/04/2026', [
        { id: 'seg-1', speaker: 'advisor', speakerName: 'Asesor', start: '00:00', end: '00:30', startSeconds: 0, endSeconds: 30, text: 'Buenos días, le volvemos a llamar de UTEL.', sentiment: 'neutral' },
        { id: 'seg-2', speaker: 'customer', speakerName: 'Cliente', start: '00:31', end: '01:00', startSeconds: 31, endSeconds: 60, text: 'Ya le dije que no tengo tiempo.', sentiment: 'frustrated' }
      ], false)
    ],
    evidences: [
      {
        id: 'ev-1',
        code: 'I6-001',
        name: 'I6 - intentos de contacto.png',
        source: 'I6',
        type: 'image',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '2026-04-06T10:00:00.000Z',
        description: '15 llamadas realizadas y 6 interacciones escritas sin contacto efectivo',
        fileSize: '815 KB',
        fileUrl: 'local://i6-intentos.png',
        previewType: 'image',
        previewData: {}
      },
      {
        id: 'ev-2',
        code: 'AV-001',
        name: 'Aula Virtual - sin actividad.png',
        source: 'Aula Virtual',
        type: 'image',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '2026-04-07T10:00:00.000Z',
        description: 'alumna sin ingreso a materias y sin actividad en aula virtual',
        fileSize: '902 KB',
        fileUrl: 'local://aula-virtual.png',
        previewType: 'image',
        previewData: {}
      },
      {
        id: 'ev-3',
        code: 'SIU-001',
        name: 'SIU - sin calificaciones.png',
        source: 'SIU',
        type: 'image',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '2026-04-07T11:00:00.000Z',
        description: 'sin calificaciones registradas',
        fileSize: '721 KB',
        fileUrl: 'local://siu-calificaciones.png',
        previewType: 'image',
        previewData: {}
      }
    ],
    timeline: [
      { id: 'tl-1', date: '16/03/2026', time: '08:00', title: 'Fecha Oficial de Inicio de Ciclo', description: 'Apertura de ciclo lectivo conforme a calendario escolar.', actor: 'Sistema Académico', system: 'SIU', type: 'info' },
      { id: 'tl-2', date: '26/03/2026', time: '11:00', title: 'Radicación de Solicitud de Deserción', description: 'Apertura de proceso con motivo: No se localiza y no ingresa', actor: 'Lorena Guadalupe Moran Mejia', system: 'Flokzu', type: 'warning' },
      { id: 'tl-3', date: '06/04/2026', time: '14:00', title: 'Evidencia I6 Cargada', description: 'Captura de intentos de contacto (15 llamadas + 6 escritos)', actor: 'Auditor', system: 'I6', type: 'info' }
    ],
    dictamen: {
      classification: 'CANCELACION_VENTA_ILOCALIZABLE',
      confidence: 85,
      rootCause: 'AGOTAMIENTO_PROTOCOLO_ILOCALIZABLE',
      text: 'Se dictamina CANCELACIÓN DE VENTA POR ILOCALIZABLE al haberse verificado el cumplimiento riguroso de los intentos mínimos de contacto...',
      status: 'BORRADOR',
      modifiedByAuditor: false
    },
    decisionData: {
      fechaInicio: '2026-03-16',
      fechaSolicitud: '2026-03-26',
      diasHabilesDesdeInicio: 7,
      semanasDesdeInicio: 2,
      nivelEducativo: 'LICENCIATURA',
      programa: 'LICENCIATURA EN MERCADOTECNIA',
      estatusAlumno: 'En proceso de auditoría',
      canalVenta: 'INC_INCONCERT',
      contactoEfectivo: false,
      contactoEfectivoDetalle: { efectivo: false, criterios: [] },
      llamadas: 15,
      llamadasValidasPorHorario: true,
      llamadasDistribuidasSemanas: true,
      interaccionesEscritas: 6,
      ingresoAula: false,
      ingresoAulaValidoPosgrado: false,
      seleccionModalidad: false,
      actividadesEntregadas: false,
      calificaciones: false,
      materiasCargadas: false,
      fallaCargaMaterias: false,
      erroresAdministrativos: false,
      erroresFinancieros: false,
      errorInscripcion: false,
      promesaVenta: false,
      solicitudAjuste: false,
      ajusteDentroDe20Dias: false,
      ajusteRealizado: false,
      contactoConExitoEstudiantil: false,
      areaOperativaCanalizoAExito: false,
      retencionRealizada: false,
      retencionAceptada: false,
      motivoSolicitud: 'No se localiza y no ingresa',
      intencionCancelacionManifiesta: true,
      frasesDetectadas: [],
      cambioCicloGestionado: 'ninguno',
      cambioCicloReincidenteNoIngreso: false,
      cambioCicloRevalidacion: false,
      mysteryShopper: false
    } as CaseDecisionData
  },
  {
    id: 'CAVE-30274',
    status: 'EN_ANALISIS',
    statusLabel: 'En análisis',
    matricula: '010912443',
    studentName: 'Fernando Castro Morales',
    program: 'LICENCIATURA EN ADMINISTRACIÓN Y FINANZAS',
    level: 'LICENCIATURA',
    channel: 'DIGITAL_FACEBOOK_ADS',
    startDate: '31/08/2026',
    requestDate: '07/09/2026',
    daysFromStart: 7,
    workingDaysFromStart: 5,
    requestedPolicy: 'Cancelación Operativa - Carga Tardía',
    requestReason: 'Falla en aula virtual / Materias no cargadas oportunamente',
    studentContactNumber: '+52 55 4433 2211',
    campaign: 'RETENCION_UTEL',
    primaryCall: createCallRecord('call-3', 'Llamada de validación - 07/09/2026', transcriptOperativa),
    secondaryCalls: [],
    evidences: [
      {
        id: 'ev-4',
        code: 'FLK-001',
        name: 'Ticket Flokzu - Solicitud Deserción',
        source: 'Flokzu',
        type: 'document',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '2026-09-07T10:00:00.000Z',
        description: 'Expediente de solicitud de deserción radicado formalmente',
        fileSize: '245 KB',
        fileUrl: 'local://flokzu-ticket.pdf',
        previewType: 'pdf_view',
        previewData: {}
      },
      {
        id: 'ev-5',
        code: 'SIU-002',
        name: 'Kárdex SIU - Materias sin cargar',
        source: 'SIU',
        type: 'system_record',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '2026-09-07T10:15:00.000Z',
        description: 'Registro académico muestra materias del primer cuatrimestre sin asignar',
        fileSize: '156 KB',
        fileUrl: 'local://siu-kardex.pdf',
        previewType: 'siu_table',
        previewData: { materiasCargadas: '0 de 6', errorCarga: 'Incidencia masiva detectada' }
      },
      {
        id: 'ev-6',
        code: 'AV-002',
        name: 'Aula Virtual - Captura error',
        source: 'Aula Virtual',
        type: 'image',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '2026-09-07T11:00:00.000Z',
        description: 'Captura de pantalla del aula virtual sin materias disponibles',
        fileSize: '312 KB',
        fileUrl: 'local://aula-error.png',
        previewType: 'image',
        previewData: {}
      }
    ],
    timeline: [
      { id: 'tl-4', date: '31/08/2026', time: '08:00', title: 'Fecha Oficial de Inicio de Ciclo', description: 'Apertura de ciclo lectivo conforme a calendario escolar.', actor: 'Sistema Académico', system: 'SIU', type: 'info' },
      { id: 'tl-5', date: '07/09/2026', time: '10:00', title: 'Radicación de Solicitud', description: 'Falla en aula virtual / Materias no cargadas oportunamente', actor: 'Fernando Castro Morales', system: 'Flokzu', type: 'warning' },
      { id: 'tl-6', date: '07/09/2026', time: '11:00', title: 'Evidencia SIU Cargada', description: 'Kárdex muestra 0 materias cargadas de 6 programadas', actor: 'Auditor', system: 'SIU', type: 'error' }
    ],
    dictamen: {
      classification: 'CANCELACION_VENTA_OPERATIVA',
      confidence: 92,
      rootCause: 'CARGA_TARDIA_MATERIAS',
      text: 'De acuerdo a la política institucional y a las evidencias cotejadas, se dictamina CANCELACIÓN DE VENTA OPERATIVA debido a que se comprobó la causal CARGA_TARDIA_MATERIAS...',
      status: 'BORRADOR',
      modifiedByAuditor: false
    },
    decisionData: {
      fechaInicio: '2026-08-31',
      fechaSolicitud: '2026-09-07',
      diasHabilesDesdeInicio: 5,
      semanasDesdeInicio: 1,
      nivelEducativo: 'LICENCIATURA',
      programa: 'LICENCIATURA EN ADMINISTRACIÓN Y FINANZAS',
      estatusAlumno: 'En proceso de auditoría',
      canalVenta: 'DIGITAL_FACEBOOK_ADS',
      contactoEfectivo: true,
      contactoEfectivoDetalle: { efectivo: true, criterios: [] },
      llamadas: 2,
      llamadasValidasPorHorario: true,
      llamadasDistribuidasSemanas: true,
      interaccionesEscritas: 3,
      ingresoAula: true,
      ingresoAulaValidoPosgrado: false,
      seleccionModalidad: true,
      actividadesEntregadas: false,
      calificaciones: false,
      materiasCargadas: false,
      fallaCargaMaterias: true,
      erroresAdministrativos: true,
      erroresFinancieros: false,
      errorInscripcion: false,
      promesaVenta: false,
      solicitudAjuste: true,
      ajusteDentroDe20Dias: true,
      ajusteRealizado: false,
      contactoConExitoEstudiantil: true,
      areaOperativaCanalizoAExito: true,
      retencionRealizada: true,
      retencionAceptada: false,
      motivoSolicitud: 'Falla en aula virtual / Materias no cargadas oportunamente',
      intencionCancelacionManifiesta: true,
      frasesDetectadas: [],
      cambioCicloGestionado: 'ninguno',
      cambioCicloReincidenteNoIngreso: false,
      cambioCicloRevalidacion: false,
      mysteryShopper: false
    } as CaseDecisionData
  }
];

export { mockAuditCases };