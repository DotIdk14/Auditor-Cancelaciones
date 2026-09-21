import { AuditCase } from '../types/audit';
import { mockCallCase30274 } from './calls';
import { mockEvidencesCase30274 } from './evidences';

export const mockCases: AuditCase[] = [
  {
    id: 'CAVE-30274',
    status: 'EN_ANALISIS',
    statusLabel: 'En análisis',
    matricula: '010847403',
    studentName: 'Carlos Eduardo Escobar Benitez',
    program: 'Ma. Automatización y Robot Indu',
    level: 'POSGRADO',
    channel: 'ISLA_TOWNCENTER_NICOL',
    startDate: '31/08/2026',
    requestDate: '07/09/2026',
    daysFromStart: 7,
    workingDaysFromStart: 5,
    requestedPolicy: 'Cancelación de Venta',
    requestReason: 'Servicio deficiente / Académico - Carga tardía de materias en aula virtual',
    studentContactNumber: '+52 55 6506 3173',
    campaign: 'UTEL_MX_PN',
    primaryCall: mockCallCase30274,
    evidences: mockEvidencesCase30274,
    timeline: [
      {
        id: 'tl-1',
        date: '22/08/2026',
        time: '11:30',
        title: 'Inscripción y Pago Liquidado',
        description: 'Pago de colegiatura inicial e inscripción formalizada por canal presencial Isla Town Center Nicolás Romero.',
        actor: 'Asesor Comercial',
        system: 'SIU / Pasarela',
        type: 'success'
      },
      {
        id: 'tl-2',
        date: '31/08/2026',
        time: '08:00',
        title: 'Inicio Oficial de Ciclo Escolar',
        description: 'Apertura formal de ciclo lectivo. El alumno ingresa al portal pero las asignaturas no figuran asignadas.',
        actor: 'Sistema Académico',
        system: 'Aula Virtual',
        type: 'warning'
      },
      {
        id: 'tl-3',
        date: '05/09/2026',
        time: '11:24',
        title: 'Reporte vía WhatsApp a Mesa de Ayuda',
        description: 'Estudiante reporta falta de acceso a materias tras 5 días de inicio. Se promete revisión sin generar ticket.',
        actor: 'Helpdesk Soporte',
        system: 'WhatsApp Business',
        type: 'warning'
      },
      {
        id: 'tl-4',
        date: '07/09/2026',
        time: '14:15',
        title: 'Radicación de Ticket de Cancelación',
        description: 'Apertura de proceso de Cancelación de Venta [CAVE] por persistencia de falla en materias.',
        actor: 'Estudiante / Gestor',
        system: 'Flokzu',
        type: 'info'
      },
      {
        id: 'tl-5',
        date: '07/09/2026',
        time: '14:32',
        title: 'Llamada de Validación y Retención',
        description: 'Contacto telefónico efectivo de 08:45 min. Estudiante ratifica que desea cancelar por imposibilidad de cursar.',
        actor: 'Mariana López (Éxito)',
        system: 'I6 / InConcert',
        type: 'info'
      }
    ],
    dictamen: {
      classification: 'Cancelación de Venta Operativa',
      confidence: 87,
      rootCause: 'Carga tardía de materias / falla operativa en aula virtual',
      text: 'De acuerdo a la política y a las evidencias encontradas y compartidas, se determina una Cancelación de Venta Operativa debido a que se comprobó que se le cargaron las materias a destiempo, generando la imposibilidad del estudiante para avanzar conforme a su calendario escolar.',
      status: 'PENDIENTE_REVISION',
      modifiedByAuditor: false,
      reviewerNotes: ''
    },
    decisionData: {
      fechaInicio: '2026-08-31',
      fechaSolicitud: '2026-09-07',
      diasHabilesDesdeInicio: 5,
      semanasDesdeInicio: 1,
      nivelEducativo: 'POSGRADO',
      programa: 'MA Automatización y Robot Industrial',
      estatusAlumno: 'Matriculado con materias pendientes',
      canalVenta: 'ISLA_TOWNCENTER_NICOL',
      contactoEfectivo: true,
      llamadas: 1,
      interaccionesEscritas: 1,
      ingresoAula: true,
      ingresoAulaValidoPosgrado: false, // Ingresó pero no tuvo asignaturas ni foro
      seleccionModalidad: false,
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
      motivoSolicitud: 'Servicio deficiente / Académico - Carga tardía de materias',
      intencionCancelacionManifiesta: true
    }
  },
  {
    id: 'CAVE-30288',
    status: 'PENDIENTE_REVISION',
    statusLabel: 'Pendiente de revisión',
    matricula: '010772194',
    studentName: 'Valeria Montserrat Morales Gómez',
    program: 'Lic. en Mercadotecnia Digital',
    level: 'LICENCIATURA',
    channel: 'CALLCENTER_INBOUND_MX',
    startDate: '31/08/2026',
    requestDate: '12/09/2026',
    daysFromStart: 12,
    workingDaysFromStart: 10,
    requestedPolicy: 'Cancelación de Venta',
    requestReason: 'Motivos personales / Económicos',
    studentContactNumber: '+52 55 1289 4410',
    campaign: 'UTEL_MX_MKTDIG',
    primaryCall: {
      ...mockCallCase30274,
      id: 'CALL-20260912-99012',
      title: 'Llamada del 12/09/2026 – 10:15 h',
      duration: '06:12',
      date: '12/09/2026',
      time: '10:15 h',
      detectedIntentions: ['Solicitud de cancelación extemporánea con materias calificadas'],
      transcript: [
        {
          id: 'tr-vm-1',
          speaker: 'advisor',
          speakerName: 'Asesor',
          start: '00:00',
          end: '00:15',
          startSeconds: 0,
          endSeconds: 15,
          text: 'Buen día, le atiende el área de retención de UTEL, ¿con Valeria Morales?'
        },
        {
          id: 'tr-vm-2',
          speaker: 'customer',
          speakerName: 'Cliente',
          start: '00:16',
          end: '00:32',
          startSeconds: 16,
          endSeconds: 32,
          text: 'Hola, sí soy yo. Me comunico para cancelar mi carrera porque ya no podré pagar las siguientes mensualidades.'
        },
        {
          id: 'tr-vm-3',
          speaker: 'advisor',
          speakerName: 'Asesor',
          start: '00:33',
          end: '00:58',
          startSeconds: 33,
          endSeconds: 58,
          text: 'Entiendo Valeria, revisando tu expediente veo que ya seleccionaste la modalidad de exámenes y tienes una evaluación ya calificada con 9.0 en Fundamentos de Mercadotecnia.'
        },
        {
          id: 'tr-vm-4',
          speaker: 'customer',
          speakerName: 'Cliente',
          start: '00:59',
          end: '01:18',
          startSeconds: 59,
          endSeconds: 78,
          text: 'Sí, hice la primera actividad de la semana 1, pero quiero cancelar mi inscripción completa.'
        }
      ]
    },
    evidences: [
      {
        id: 'ev-siu-calif-30288',
        code: 'SIU-KARDEX-30288',
        name: 'SIU - Kárdex de Calificaciones Bimestre 1',
        source: 'SIU',
        type: 'system_record',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '12/09/2026 09:30',
        description: 'Registro de calificación asentada en materia MKT-101: 9.0 (Acreditada primera entrega).',
        previewType: 'siu_table',
        previewData: {
          calificacionesBimestre1: 'Materia MKT-101 evaluada (Calificación: 9.0). Servicio efectivamente devengado.',
          materiasPlan: [
            { codigo: 'MKT-101', nombre: 'Fundamentos de Mercadotecnia', estatus: 'ACTIVA', calificacion: '9.0' }
          ]
        }
      },
      mockEvidencesCase30274[0],
      mockEvidencesCase30274[5]
    ],
    timeline: [],
    dictamen: {
      classification: 'Baja Definitiva por Calificaciones Registradas',
      confidence: 96,
      rootCause: 'Devengamiento del servicio por actividades y calificaciones en Bimestre 1',
      text: 'Se dictamina BAJA DEFINITIVA en estricto cumplimiento al Art. 5.7.d, habiéndose comprobado que la estudiante cuenta con calificaciones asentadas en plataforma SIU.',
      status: 'PENDIENTE_REVISION',
      modifiedByAuditor: false
    },
    decisionData: {
      fechaInicio: '2026-08-31',
      fechaSolicitud: '2026-09-12',
      diasHabilesDesdeInicio: 10,
      semanasDesdeInicio: 2,
      nivelEducativo: 'LICENCIATURA',
      programa: 'Lic. en Mercadotecnia Digital',
      estatusAlumno: 'Activo con calificaciones',
      contactoEfectivo: true,
      llamadas: 2,
      interaccionesEscritas: 2,
      ingresoAula: true,
      seleccionModalidad: true,
      calificaciones: true, // Prioridad 1 trigger
      calificacionesDetalle: 'Calificación 9.0 en MKT-101 asentada en SIU',
      materiasCargadas: true,
      fallaCargaMaterias: false,
      erroresAdministrativos: false,
      erroresFinancieros: false,
      errorInscripcion: false,
      promesaVenta: false,
      solicitudAjuste: false,
      ajusteRealizado: true,
      contactoConExitoEstudiantil: true,
      retencionRealizada: true,
      retencionAceptada: false,
      motivoSolicitud: 'Motivos personales / Económicos'
    }
  },
  {
    id: 'CAVE-29941',
    status: 'DICTAMINADO',
    statusLabel: 'Dictaminado',
    matricula: '010664910',
    studentName: 'Roberto Ángel Cárdenas Silva',
    program: 'Lic. en Administración de Empresas Turísticas',
    level: 'LICENCIATURA',
    channel: 'DIGITAL_FACEBOOK_ADS',
    startDate: '31/08/2026',
    requestDate: '13/09/2026',
    daysFromStart: 13,
    workingDaysFromStart: 10,
    requestedPolicy: 'Cancelación por Ilocalizable',
    requestReason: 'Sin contacto desde fecha de inicio (Agotamiento de protocolo)',
    studentContactNumber: '+52 55 4190 2883',
    campaign: 'UTEL_LA_ADM',
    primaryCall: {
      ...mockCallCase30274,
      id: 'CALL-20260913-00000',
      title: 'Registro de Intentos de Marcación (I6)',
      duration: '00:00 (Buzón)',
      durationSeconds: 0,
      date: '13/09/2026',
      time: '16:00 h',
      status: 'TRANSCRIPCION_COMPLETADA',
      sentiment: 'Neutro',
      detectedIntentions: ['Sin respuesta del titular - Buzón de voz constante'],
      effectiveContact: {
        efectivo: false,
        criterios: [
          { criterio: 'El contacto debe ser con el titular registrado', cumplido: false, evidencia: '16 marcaciones con timbrado sin respuesta o transferidas a buzón.' },
          { criterio: 'Identificación formal de UTEL Universidad', cumplido: false, evidencia: 'No hubo enlace de voz.' },
          { criterio: 'Información sobre objetivo de la llamada y ciclo', cumplido: false, evidencia: 'Sin contacto.' },
          { criterio: 'Confirmación de datos personales y estatus de pago', cumplido: false, evidencia: 'Sin contacto.' },
          { criterio: 'Manifestación explícita de decisión', cumplido: false, evidencia: 'Sin contacto.' },
          { criterio: 'Respuesta vinculada a política de cancelación', cumplido: false, evidencia: 'Sin contacto.' }
        ],
        observaciones: 'Protocolo de ilocalizable completado: 16 llamadas alternadas y 7 WhatsApp/correos sin respuesta.'
      },
      transcript: [
        {
          id: 'tr-il-1',
          speaker: 'advisor',
          speakerName: 'Asesor',
          start: '00:00',
          end: '00:10',
          startSeconds: 0,
          endSeconds: 10,
          text: '[Grabación automática de InConcert] La llamada fue desviada a buzón de voz tras 6 tonos de espera.'
        }
      ]
    },
    evidences: [
      {
        id: 'ev-i6-marcaciones',
        code: 'I6-REP-16CALLS',
        name: 'Reporte Consolidado InConcert - 16 Llamadas',
        source: 'I6',
        type: 'system_record',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '13/09/2026 17:00',
        description: 'Bitácora técnica con 16 marcaciones distribuidas en horarios matutinos y vespertinos durante 2 semanas consecutivas.',
        previewType: 'i6_log',
        previewData: {
          totalLlamadas: 16,
          distribucionHorarios: '8 matutinas (09:00 - 12:00) y 8 vespertinas (15:00 - 19:30)',
          mensajesEnviados: '7 interacciones escritas (WhatsApp y correo con acuse)',
          estatusContacto: 'Ilocalizable total'
        }
      },
      mockEvidencesCase30274[5]
    ],
    timeline: [],
    dictamen: {
      classification: 'Cancelación por Ilocalizable',
      confidence: 91,
      rootCause: 'Agotamiento de protocolo de localización institucional sin respuesta del alumno',
      text: 'Se dictamina Cancelación de Venta por Ilocalizable al haberse cumplido estrictamente el protocolo de 15 llamadas mínimas y 6 interacciones escritas en horarios alternos sin contacto ni ingreso a plataforma.',
      status: 'APROBADO',
      approvedBy: 'Ian Jarquín (Auditor Calidad)',
      approvedAt: '13/09/2026 17:30',
      modifiedByAuditor: false
    },
    decisionData: {
      fechaInicio: '2026-08-31',
      fechaSolicitud: '2026-09-13',
      diasHabilesDesdeInicio: 10,
      semanasDesdeInicio: 2,
      nivelEducativo: 'LICENCIATURA',
      programa: 'Lic. en Administración de Empresas Turísticas',
      estatusAlumno: 'Ilocalizable',
      contactoEfectivo: false,
      llamadas: 16,
      llamadasValidasPorHorario: true,
      llamadasDistribuidasSemanas: true,
      interaccionesEscritas: 7,
      ingresoAula: false,
      seleccionModalidad: false,
      calificaciones: false,
      materiasCargadas: true,
      fallaCargaMaterias: false,
      erroresAdministrativos: false,
      erroresFinancieros: false,
      errorInscripcion: false,
      promesaVenta: false,
      solicitudAjuste: false,
      ajusteRealizado: false,
      contactoConExitoEstudiantil: false,
      retencionRealizada: false,
      motivoSolicitud: 'Ilocalizable'
    }
  },
  {
    id: 'CAVE-30299',
    status: 'APROBADO',
    statusLabel: 'Dictaminado y Aprobado',
    matricula: '010955214',
    studentName: 'Gabriel Morales Arismendi',
    program: 'Lic. en Ingeniería en Sistemas Computacionales',
    level: 'LICENCIATURA',
    channel: 'CALLCENTER_OUTBOUND_RETENCION',
    startDate: '31/08/2026',
    requestDate: '06/09/2026',
    daysFromStart: 6,
    workingDaysFromStart: 5,
    requestedPolicy: 'Cancelación de Venta Operativa',
    requestReason: 'Falla comprobada en aula virtual y carga tardía de materias con afectación a entrega de asignaciones',
    studentContactNumber: '+52 55 7891 3320',
    campaign: 'UTEL_MX_ING',
    primaryCall: {
      id: 'CALL-20260906-8812',
      title: 'Llamada 1: Retención y Expresión de Inconformidad',
      duration: '09:42',
      durationSeconds: 582,
      date: '06/09/2026',
      time: '11:15 h',
      status: 'TRANSCRIPCION_COMPLETADA',
      campaign: 'RETENCION_INGENIERIA',
      phoneNumber: '+52 55 7891 3320',
      intentsRatio: '1/1',
      sentiment: 'Conflictivo',
      detectedIntentions: [
        'Molestia extrema por aula virtual vacía',
        'Solicitud formal de cancelación de venta',
        'Rechazo de becas compensatorias adicionales'
      ],
      keyMoments: [
        { timestamp: '00:15', label: 'Contacto titular confirmado', type: 'contact' },
        { timestamp: '01:40', label: 'Exposición de falla operativa de materias', type: 'error' },
        { timestamp: '04:10', label: 'Solicitud expresa de cancelación de venta', type: 'request' },
        { timestamp: '07:30', label: 'Rechazo de propuesta de retención', type: 'warning' }
      ],
      effectiveContact: {
        efectivo: true,
        criterios: [
          { criterio: 'El contacto debe ser con el titular registrado', cumplido: true, evidencia: 'Gabriel Morales confirma nombre, matrícula 010955214 y fecha de nacimiento', timestampRef: '00:15' },
          { criterio: 'Identificación formal de UTEL Universidad', cumplido: true, evidencia: 'Asesora Andrea Vázquez se identifica formalmente con área de Éxito Estudiantil', timestampRef: '00:25' },
          { criterio: 'Información sobre objetivo de la llamada y ciclo', cumplido: true, evidencia: 'Se expone llamada de seguimiento al ticket FLK-89100 del ciclo 2026-B', timestampRef: '01:10' },
          { criterio: 'Confirmación de datos personales y estatus de pago', cumplido: true, evidencia: 'Se valida cuota de inscripción liquidada y adeudo en ceros', timestampRef: '02:05' },
          { criterio: 'Manifestación explícita de decisión', cumplido: true, evidencia: 'Estudiante declara: "Quiero cancelar definitivamente mi venta y matrícula"', timestampRef: '04:12' },
          { criterio: 'Respuesta vinculada a política de cancelación', cumplido: true, evidencia: 'Se informa canalización al auditor de cancelaciones conforme a Art. 5.9', timestampRef: '08:45' }
        ],
        observaciones: 'Contacto efectivo 100% verificado conforme a los 6 estándares de política de calidad.'
      },
      transcript: [
        {
          id: 'tr-gm-1',
          speaker: 'advisor',
          speakerName: 'Asesora (Andrea Vázquez)',
          start: '00:00',
          end: '00:14',
          startSeconds: 0,
          endSeconds: 14,
          text: 'Muy buen día, me comunico de Gestión de Éxito Estudiantil de UTEL Universidad, ¿tengo el gusto con el alumno Gabriel Morales Arismendi?'
        },
        {
          id: 'tr-gm-2',
          speaker: 'customer',
          speakerName: 'Cliente (Gabriel Morales)',
          start: '00:15',
          end: '00:30',
          startSeconds: 15,
          endSeconds: 30,
          text: 'Sí, soy yo, dígame Andrea. Supongo que llaman por los cinco reportes que dejé porque mi aula sigue sin materias desde que iniciamos clases el 31 de agosto.'
        },
        {
          id: 'tr-gm-3',
          speaker: 'advisor',
          speakerName: 'Asesora (Andrea Vázquez)',
          start: '00:31',
          end: '01:05',
          startSeconds: 31,
          endSeconds: 65,
          text: 'Efectivamente Gabriel, estoy revisando tu expediente de Ingeniería en Sistemas. Veo que se presentó una incidencia en la carga automática de tus asignaturas de Álgebra y Programación Estructurada.'
        },
        {
          id: 'tr-gm-4',
          speaker: 'customer',
          speakerName: 'Cliente (Gabriel Morales)',
          start: '01:06',
          end: '01:45',
          startSeconds: 66,
          endSeconds: 105,
          text: 'Ya pasaron 6 días completos, mis compañeros ya entregaron el primer entregable y yo sigo con la pantalla en blanco. Es una falta de seriedad inadmisible.'
        },
        {
          id: 'tr-gm-5',
          speaker: 'advisor',
          speakerName: 'Asesora (Andrea Vázquez)',
          start: '01:46',
          end: '02:30',
          startSeconds: 106,
          endSeconds: 150,
          text: 'Comprendo totalmente tu frustración Gabriel. Para compensar este inconveniente la dirección académica te ofrece un 30% de beca adicional y extensión de entrega de dos semanas.'
        },
        {
          id: 'tr-gm-6',
          speaker: 'customer',
          speakerName: 'Cliente (Gabriel Morales)',
          start: '02:31',
          end: '03:15',
          startSeconds: 151,
          endSeconds: 195,
          text: 'No me interesa ninguna beca ni beneficio. Solicito formalmente mi cancelación de venta inmediata porque la universidad no cumplió con entregar el servicio educativo pactado.'
        },
        {
          id: 'tr-gm-7',
          speaker: 'advisor',
          speakerName: 'Asesora (Andrea Vázquez)',
          start: '03:16',
          end: '04:00',
          startSeconds: 196,
          endSeconds: 240,
          text: 'Entendido Gabriel. Al estar dentro de los primeros días y contar con evidencia del error operativo en sistemas, canalizo formalmente tu folio CAVE-30299 al área de auditoría de cancelaciones.'
        }
      ]
    },
    secondaryCalls: [
      {
        id: 'CALL-20260906-9930',
        title: 'Llamada 2: Validación de Folio y Cierre por Supervisión',
        duration: '05:18',
        durationSeconds: 318,
        date: '06/09/2026',
        time: '16:20 h',
        status: 'TRANSCRIPCION_COMPLETADA',
        campaign: 'SUPERVISION_CALIDAD',
        phoneNumber: '+52 55 7891 3320',
        intentsRatio: '1/1',
        sentiment: 'Neutro',
        detectedIntentions: ['Confirmación de radicación de ticket', 'Ratificación de postura del alumno'],
        keyMoments: [
          { timestamp: '00:10', label: 'Contacto titular verificado', type: 'contact' },
          { timestamp: '02:00', label: 'Ratificación de cancelación de venta', type: 'request' }
        ],
        effectiveContact: {
          efectivo: true,
          criterios: [
            { criterio: 'Contacto con titular', cumplido: true, evidencia: 'Gabriel Morales responde y confirma trámite' },
            { criterio: 'Identificación institucional', cumplido: true, evidencia: 'Supervisor Roberto Mena se identifica de Calidad Académica' },
            { criterio: 'Explicación del trámite', cumplido: true, evidencia: 'Se valida que procede dictamen por falla operativa institucional' }
          ]
        },
        transcript: [
          {
            id: 'tr-sec-1',
            speaker: 'advisor',
            speakerName: 'Supervisor (Roberto Mena)',
            start: '00:00',
            end: '00:20',
            startSeconds: 0,
            endSeconds: 20,
            text: 'Buenas tardes Gabriel, le saluda Roberto Mena de la Coordinación de Calidad Académica para dar seguimiento final a su solicitud.'
          },
          {
            id: 'tr-sec-2',
            speaker: 'customer',
            speakerName: 'Cliente (Gabriel Morales)',
            start: '00:21',
            end: '00:45',
            startSeconds: 21,
            endSeconds: 45,
            text: 'Buenas tardes Roberto. Sí, como le comenté a su compañera en la mañana, ratifico que no continuaré y exijo la cancelación definitiva.'
          },
          {
            id: 'tr-sec-3',
            speaker: 'advisor',
            speakerName: 'Supervisor (Roberto Mena)',
            start: '00:46',
            end: '01:20',
            startSeconds: 46,
            endSeconds: 80,
            text: 'Comprendido y corroborado con la bitácora técnica de TI. Queda asentada la solicitud en el expediente CAVE-30299 para dictamen favorable por error operativo.'
          }
        ]
      }
    ],
    evidences: [
      {
        id: 'ev-siu-carga-30299',
        code: 'SIU-CARGA-30299',
        name: 'Reporte SIU - Historial de Carga de Materias',
        source: 'SIU',
        type: 'system_record',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '06/09/2026 12:00',
        description: 'Auditoría de base de datos SIU mostrando estatus "Error de Asignación en Lote B-2026" al 06/09/2026.',
        previewType: 'siu_table',
        previewData: {
          estatusMaterias: '0 materias activas al 06/09/2026 (Ciclo formalmente iniciado el 31/08/2026).',
          materiasPlan: [
            { codigo: 'ISC-101', nombre: 'Álgebra Lineal', estatus: 'ERROR_ASIGNACION', calificacion: 'Sin cursar' },
            { codigo: 'ISC-102', nombre: 'Programación Estructurada', estatus: 'ERROR_ASIGNACION', calificacion: 'Sin cursar' }
          ]
        }
      },
      {
        id: 'ev-flokzu-30299',
        code: 'FLK-TKT-30299',
        name: 'Ticket Flokzu CAVE-30299',
        source: 'Flokzu',
        type: 'pdf',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '06/09/2026 14:00',
        description: 'Formulario oficial de cancelación radicado en Flokzu con folios técnicos adjuntos de la mesa de soporte.',
        previewType: 'doc_view',
        previewData: {
          folioTicket: 'CAVE-30299',
          solicitante: 'Gabriel Morales Arismendi',
          tipoTramite: 'Cancelación de Venta Operativa',
          fechaCreacion: '06/09/2026 14:00'
        }
      },
      {
        id: 'ev-aula-log-30299',
        code: 'AULA-LOG-30299',
        name: 'Aula Virtual - Log de Accesos y Pantalla en Blanco',
        source: 'Aula Virtual',
        type: 'system_record',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '06/09/2026 10:00',
        description: 'Registro de 14 accesos del estudiante al aula virtual constatando que visualizó pantalla sin asignaturas.',
        previewType: 'aula_log',
        previewData: {
          totalAccesos: 14,
          primerAcceso: '31/08/2026 08:12 h',
          ultimoAcceso: '06/09/2026 10:45 h',
          asignaturasDisponibles: 0,
          entregablesEnviados: 0
        }
      },
      {
        id: 'ev-i6-llamadas-30299',
        code: 'I6-AUDIO-30299',
        name: 'Grabación InConcert - 2 Llamadas Grabadas',
        source: 'I6',
        type: 'audio',
        status: 'DISPONIBLE',
        statusLabel: 'Cargado',
        date: '06/09/2026 16:30',
        description: 'Archivos de audio estéreo con marcación y canalización completada a Éxito Estudiantil.',
        previewType: 'i6_log',
        previewData: {
          totalLlamadas: 2,
          llamadasEfectivas: 2,
          duracionTotal: '15 minutos',
          grabacionesDisponibles: 'CALL-20260906-8812, CALL-20260906-9930'
        }
      }
    ],
    timeline: [
      {
        id: 'tl-gm-1',
        date: '20/08/2026',
        time: '14:20',
        title: 'Inscripción y Pago Exitoso',
        description: 'Matrícula formalizada en Licenciatura en Sistemas con pago de colegiatura verificado.',
        actor: 'Asesor Comercial',
        system: 'SIU / Pasarela',
        type: 'success'
      },
      {
        id: 'tl-gm-2',
        date: '31/08/2026',
        time: '08:12',
        title: 'Inicio Oficial de Ciclo 2026-B',
        description: 'Apertura de ciclo. El alumno intenta cursar pero las materias no aparecen en su catálogo.',
        actor: 'Sistema Académico',
        system: 'Aula Virtual',
        type: 'warning'
      },
      {
        id: 'tl-gm-3',
        date: '02/09/2026',
        time: '10:05',
        title: 'Reporte Técnico a Mesa de Ayuda',
        description: 'Alumno levanta folio por falta de materias. TI reporta error en sincronización de lote.',
        actor: 'Mesa de Ayuda TI',
        system: 'HelpDesk',
        type: 'warning'
      },
      {
        id: 'tl-gm-4',
        date: '06/09/2026',
        time: '11:15',
        title: 'Llamada de Retención de Éxito Estudiantil',
        description: 'Contacto efectivo de 09:42 min. El alumno ratifica que desea cancelar por imposibilidad de cursar.',
        actor: 'Andrea Vázquez (Éxito)',
        system: 'I6 / InConcert',
        type: 'info'
      },
      {
        id: 'tl-gm-5',
        date: '06/09/2026',
        time: '14:00',
        title: 'Apertura de Ticket CAVE-30299',
        description: 'Radicación de solicitud formal de cancelación de venta con folio de deserción.',
        actor: 'Gestor de Calidad',
        system: 'Flokzu',
        type: 'info'
      },
      {
        id: 'tl-gm-6',
        date: '08/09/2026',
        time: '18:40',
        title: 'Dictamen Aprobado y Concluido',
        description: 'Auditoría valida error operativo con Art. 5.9. Procede Cancelación de Venta Operativa.',
        actor: 'Ian Jarquín (Auditor Senior)',
        system: 'Sistema de Calidad UTEL',
        type: 'success'
      }
    ],
    dictamen: {
      classification: 'Cancelación de Venta Operativa',
      confidence: 95,
      rootCause: 'Carga tardía de materias / Falla operativa institucional comprobada',
      text: 'De acuerdo al Art. 5.9 del Procedimiento de Deserción y a las evidencias técnicas en SIU y Aula Virtual, se dictamina CANCELACIÓN DE VENTA OPERATIVA debido a que se comprobó que el alumno Gabriel Morales Arismendi no contó con materias asignadas durante la primera semana de clases, originando la imposibilidad para avanzar en su plan de estudios y motivando su desvinculación formal dentro del periodo establecido.',
      status: 'APROBADO',
      approvedBy: 'Ian Jarquín (Auditor de Calidad Senior)',
      approvedAt: '08/09/2026 18:40',
      modifiedByAuditor: false,
      reviewerNotes: 'Expediente auditado y completado al 100%. Se cotejaron las 2 llamadas grabadas, las bitácoras de acceso al aula virtual, el ticket de Flokzu y el reporte de error de asignación de SIU. Todo en orden y dictamen ejecutado.'
    },
    decisionData: {
      fechaInicio: '2026-08-31',
      fechaSolicitud: '2026-09-06',
      diasHabilesDesdeInicio: 5,
      semanasDesdeInicio: 1,
      nivelEducativo: 'LICENCIATURA',
      programa: 'Lic. en Ingeniería en Sistemas Computacionales',
      estatusAlumno: 'Cancelación Operativa Dictaminada',
      canalVenta: 'CALLCENTER_OUTBOUND_RETENCION',
      contactoEfectivo: true,
      llamadas: 2,
      interaccionesEscritas: 3,
      ingresoAula: true,
      ingresoAulaValidoPosgrado: false,
      seleccionModalidad: false,
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
      motivoSolicitud: 'Falla comprobada en aula virtual y carga tardía de materias',
      intencionCancelacionManifiesta: true
    }
  }
];

export const MOCK_CASES = mockCases;
