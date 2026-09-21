import { EvidenceItem } from '../types/audit';

export const mockEvidencesCase30274: EvidenceItem[] = [
  {
    id: 'ev-flokzu-30274',
    code: 'FLOKZU-CAVE-30274',
    name: 'Ticket Flokzu (CAVE-30274)',
    source: 'Flokzu',
    type: 'system_record',
    status: 'DISPONIBLE',
    statusLabel: 'Cargado',
    date: '07/09/2026 14:15',
    description: 'Solicitud formal de cancelación de venta radicada por el estudiante Carlos Eduardo Escobar Benitez.',
    fileSize: '142 KB',
    previewType: 'doc_view',
    previewData: {
      ticketNumber: 'CAVE-30274',
      proceso: 'CANCELACIÓN DE VENTAS [CAVE]',
      fechaRadicacion: '07/09/2026 14:15:22',
      solicitante: 'Carlos Eduardo Escobar Benitez',
      motivoReportado: 'Servicio deficiente / Académico - Materias no cargadas en plataforma',
      areaResponsable: 'Gestión de Matrícula / Éxito Estudiantil',
      estatusFlokzu: 'En dictaminación de auditoría',
      tiempoRespuestaRestante: '28 horas (dentro de plazo de 72h)'
    }
  },
  {
    id: 'ev-siu-30274',
    code: 'SIU-HIST-010847403',
    name: 'SIU - Historial académico y financiero',
    source: 'SIU',
    type: 'system_record',
    status: 'DISPONIBLE',
    statusLabel: 'Cargado',
    date: '07/09/2026 14:20',
    description: 'Registro escolar en SIU: Inicio de ciclo 31/08/2026, estatus de pago al corriente, sin materias activas asignadas a la fecha de inicio.',
    fileSize: '310 KB',
    previewType: 'siu_table',
    previewData: {
      matricula: '010847403',
      alumno: 'Carlos Eduardo Escobar Benitez',
      programa: 'MA Automatización y Robot Industrial',
      cicloInicio: '31/08/2026',
      fechaInscripcion: '22/08/2026',
      estatusFinanciero: 'Pagado 100% (Colegiatura e inscripción registradas)',
      saldoPendiente: '$0.00 MXN',
      materiasPlan: [
        { codigo: 'AUT-501', nombre: 'Robótica Industrial Avanzada', estatus: 'NO CARGADA AL INICIO', fechaCargaReal: '08/09/2026 (Extemporánea)', calificacion: '-' },
        { codigo: 'AUT-502', nombre: 'Sistemas de Control y Automatización', estatus: 'NO CARGADA AL INICIO', fechaCargaReal: '08/09/2026 (Extemporánea)', calificacion: '-' }
      ],
      calificacionesBimestre1: 'Ninguna (0 registros)'
    }
  },
  {
    id: 'ev-i6-30274',
    code: 'I6-LOG-30274',
    name: 'I6 - Registro de llamadas y CRM',
    source: 'I6',
    type: 'system_record',
    status: 'DISPONIBLE',
    statusLabel: 'Cargado',
    date: '07/09/2026 14:32',
    description: 'Bitácora telefónica en CRM InConcert (I6): 1 llamada saliente atendida con contacto efectivo.',
    fileSize: '85 KB',
    previewType: 'i6_log',
    previewData: {
      idLlamada: 'CALL-20260907-88492',
      campana: 'UTEL_MX_PN',
      numeroMarcado: '+52 55 6506 3173',
      duracionTotal: '08:45 min',
      agente: 'Mariana López (Gestor Éxito)',
      resultadoTipificacion: 'Inconformidad por Servicio - Sin Carga de Materias',
      canalizacionExito: 'Registrada pero retrasada por mesa de ayuda',
      intentosPrevios: '1 marcación registrada'
    }
  },
  {
    id: 'ev-aula-30274',
    code: 'AULA-010847403',
    name: 'Aula Virtual - Actividad del alumno',
    source: 'Aula Virtual',
    type: 'system_record',
    status: 'PENDIENTE',
    statusLabel: 'Pendiente',
    date: '07/09/2026 15:00',
    description: 'Consulta de logs en plataforma Moodle/Canvas. El alumno ingresó a la plataforma general pero no encontró materias en su tablero.',
    fileSize: '64 KB',
    previewType: 'aula_log',
    previewData: {
      primerIngreso: '01/09/2026 19:14:02',
      ultimoIngreso: '06/09/2026 21:05:40',
      totalSesiones: 4,
      asignaturasEnTablero: 0,
      participacionForoPresentacion: false,
      actividadesEnviadas: 0,
      observacion: 'El alumno intentó ingresar en 4 ocasiones consecutivas durante la primera semana, visualizando mensaje: "No tienes cursos asignados".'
    }
  },
  {
    id: 'ev-img-falla-30274',
    code: 'IMG-EVID-01',
    name: 'captura_falla_carga_materias.png',
    source: 'Capturas',
    type: 'image',
    status: 'DISPONIBLE',
    statusLabel: 'Cargado',
    date: '07/09/2026 15:12',
    description: 'Captura de pantalla enviada por el alumno donde se evidencia el portal del estudiante con la leyenda de materias pendientes de asignación tras el inicio del ciclo.',
    fileSize: '2.4 MB',
    fileUrl: '/assets/captura_falla_carga_materias.png',
    previewType: 'image',
    previewData: {
      resolucion: '1920x1080 px',
      fechaCaptura: '07/09/2026 14:10',
      dispositivo: 'PC Windows / Chrome 128',
      contenidoVisual: 'Pantalla de Aula Virtual UTEL con matrícula 010847403 y tablero vacío con aviso de error de carga escolar.'
    }
  },
  {
    id: 'ev-pdf-politica',
    code: 'DOC-POL-GDM003',
    name: 'Procedimiento Deserción de Estudiantes (GDM_GAM_PRD_MLG_003)',
    source: 'Documentos',
    type: 'pdf',
    status: 'DISPONIBLE',
    statusLabel: 'Cargado',
    date: '19/02/2025',
    description: 'Documento oficial vigente de Políticas de Deserción y Cancelaciones de Venta UTEL.',
    fileSize: '1.2 MB',
    previewType: 'pdf_view',
    previewData: {
      codigo: 'GDM_GAM_PRD_MLG_003',
      version: '2',
      fechaPublicacion: '19/02/2025',
      paginas: 19,
      articulosClave: ['Art. 5.2 Intentos Mínimos', 'Art. 5.3 A Solicitud del Estudiante', 'Art. 5.7 Entrega de Documentos', 'Art. 5.8 Ilocalizables', 'Art. 5.9 Cancelaciones Operativas']
    }
  },
  {
    id: 'ev-chat-whatsapp',
    code: 'WAPP-CHAT-30274',
    name: 'Captura Chat WhatsApp - Mesa de Soporte',
    source: 'WhatsApp',
    type: 'image',
    status: 'DISPONIBLE',
    statusLabel: 'Cargado',
    date: '05/09/2026 11:24',
    description: 'Intercambio de mensajes donde el estudiante reportó la ausencia de materias y el asesor indicó esperar 48h hábiles.',
    fileSize: '680 KB',
    previewType: 'image',
    previewData: {
      numeroOrigen: '+52 55 6506 3173',
      contacto: 'Soporte UTEL Alumnos',
      resumen: 'Alumno reporta día 5 sin materias; asesor promete solución sin escalar ticket a Servicios Escolares.'
    }
  }
];

export const MOCK_EVIDENCES = mockEvidencesCase30274;
export const OFFICIAL_POLICY_PDF = mockEvidencesCase30274.find(e => e.type === 'pdf') || mockEvidencesCase30274[4];
