import { CallRecord } from '../types/audit';

export const mockCallCase30274: CallRecord = {
  id: 'CALL-20260907-88492',
  title: 'Llamada del 07/09/2026 – 14:32 h',
  date: '07/09/2026',
  time: '14:32 h',
  duration: '08:45',
  durationSeconds: 525,
  status: 'TRANSCRIPCION_COMPLETADA',
  campaign: 'UTEL_MX_PN',
  phoneNumber: '+52 55 6506 3173',
  intentsRatio: '1/15 (según política)',
  sentiment: 'Negativo',
  detectedIntentions: [
    'Intención expresa de cancelación de inscripción',
    'Reporte de falla operativa en Aula Virtual',
    'Rechazo de dilación en carga de asignaturas'
  ],
  keyMoments: [
    { timestamp: '00:29', label: 'Contacto titular verificado', type: 'contact' },
    { timestamp: '00:46', label: 'Identificación institucional UTEL', type: 'contact' },
    { timestamp: '01:13', label: 'Manifestación de cancelación de venta', type: 'request' },
    { timestamp: '02:06', label: 'Comprobación de pago regular realizado', type: 'contact' },
    { timestamp: '03:11', label: 'Reiteración de cese por falla operativa', type: 'error' }
  ],
  effectiveContact: {
    efectivo: true,
    criterios: [
      {
        criterio: 'El contacto debe ser con el titular registrado',
        cumplido: true,
        evidencia: 'Cliente confirma: "Sí, buen día, soy yo (Carlos Escobar)"',
        timestampRef: '00:29 - 00:45'
      },
      {
        criterio: 'Identificación formal de UTEL Universidad',
        cumplido: true,
        evidencia: 'Asesor explicita: "Perfecto, le hablo de UTEL Universidad"',
        timestampRef: '00:46 - 01:12'
      },
      {
        criterio: 'Información sobre objetivo de la llamada y ciclo',
        cumplido: true,
        evidencia: 'Seguimiento a ciclo iniciado el 31/08/2026 y estatus de inscripción',
        timestampRef: '01:39 - 02:05'
      },
      {
        criterio: 'Confirmación de datos personales y estatus de pago',
        cumplido: true,
        evidencia: 'Alumno confirma pago liquidado al 100%',
        timestampRef: '02:06 - 02:28'
      },
      {
        criterio: 'Manifestación explícita de decisión de no continuar',
        cumplido: true,
        evidencia: 'Alumno expresa: "quiero dar de baja mi inscripción... no puedo esperar más"',
        timestampRef: '01:13 - 01:38'
      },
      {
        criterio: 'Respuesta vinculada a política de cancelación operativa',
        cumplido: true,
        evidencia: 'Motivo fundado en incumplimiento escolar de carga de materias',
        timestampRef: '03:11 - 03:42'
      }
    ],
    observaciones: 'Contacto efectivo 100% validado conforme al Art. 5.8.g de la política de calidad.'
  },
  transcript: [
    {
      id: 'tr-01',
      speaker: 'advisor',
      speakerName: 'Asesor',
      start: '00:00',
      end: '00:28',
      startSeconds: 0,
      endSeconds: 28,
      text: 'Buen día, ¿hablo con el señor Carlos Escobar?',
      sentiment: 'neutral',
      highlightTags: ['Protocolo Inicial', 'Identificación de Titular']
    },
    {
      id: 'tr-02',
      speaker: 'customer',
      speakerName: 'Cliente',
      start: '00:29',
      end: '00:45',
      startSeconds: 29,
      endSeconds: 45,
      text: 'Sí, buen día, soy yo.',
      sentiment: 'neutral',
      highlightTags: ['Titular Confirmado'],
      keyMoment: {
        type: 'contact_criteria',
        label: 'Titular verificado'
      }
    },
    {
      id: 'tr-03',
      speaker: 'advisor',
      speakerName: 'Asesor',
      start: '00:46',
      end: '01:12',
      startSeconds: 46,
      endSeconds: 72,
      text: 'Perfecto, le hablo de UTEL Universidad. ¿En qué puedo ayudarle?',
      sentiment: 'positive',
      highlightTags: ['Identidad Institucional']
    },
    {
      id: 'tr-04',
      speaker: 'customer',
      speakerName: 'Cliente',
      start: '01:13',
      end: '01:38',
      startSeconds: 73,
      endSeconds: 98,
      text: 'Mire, la verdad es que quiero dar de baja mi inscripción. No me han cargado las materias en el aula virtual y ya llevo varios días esperando.',
      sentiment: 'negative',
      highlightTags: ['Intención de Cancelar', 'Falla de Carga de Materias'],
      keyMoment: {
        type: 'cancellation_intent',
        label: 'Solicitud de cancelación por falla operativa'
      }
    },
    {
      id: 'tr-05',
      speaker: 'advisor',
      speakerName: 'Asesor',
      start: '01:39',
      end: '02:05',
      startSeconds: 99,
      endSeconds: 125,
      text: 'Lamento mucho la situación. Voy a revisar tu caso para apoyarte. ¿Me puede confirmar si ya realizó el pago de la inscripción?',
      sentiment: 'neutral',
      highlightTags: ['Validación Administrativa']
    },
    {
      id: 'tr-06',
      speaker: 'customer',
      speakerName: 'Cliente',
      start: '02:06',
      end: '02:28',
      startSeconds: 126,
      endSeconds: 148,
      text: 'Sí, ya hice el pago, todo está en orden. El problema es que no tengo acceso a las materias.',
      sentiment: 'frustrated',
      highlightTags: ['Pago Acreditado', 'Bloqueo Académico'],
      keyMoment: {
        type: 'operational_complaint',
        label: 'Evidencia de pago al corriente sin servicio'
      }
    },
    {
      id: 'tr-07',
      speaker: 'advisor',
      speakerName: 'Asesor',
      start: '02:29',
      end: '03:10',
      startSeconds: 149,
      endSeconds: 190,
      text: 'Entiendo. Permítame revisar con el área de servicios escolares. ¿Le parece si le menciono que le estamos brindando seguimiento y en cuanto tengamos una respuesta le llamamos?',
      sentiment: 'neutral',
      highlightTags: ['Canalización a Servicios Escolares']
    },
    {
      id: 'tr-08',
      speaker: 'customer',
      speakerName: 'Cliente',
      start: '03:11',
      end: '03:42',
      startSeconds: 191,
      endSeconds: 222,
      text: 'Sí, está bien. Pero si no se soluciona, tendré que dar de baja mi inscripción. Ya no puedo esperar más.',
      sentiment: 'negative',
      highlightTags: ['Firmeza de Cancelación', 'Plazo Agotado'],
      keyMoment: {
        type: 'cancellation_intent',
        label: 'Reiteración de cancelación condicionada a solución'
      }
    },
    {
      id: 'tr-09',
      speaker: 'advisor',
      speakerName: 'Asesor',
      start: '03:43',
      end: '04:10',
      startSeconds: 223,
      endSeconds: 250,
      text: 'Perfecto, quedamos en eso. Le agradezco mucho por su tiempo y cualquier actualización se la comparto por este medio. ¿Algo más en lo que pueda ayudarle?',
      sentiment: 'neutral',
      highlightTags: ['Cierre de Llamada']
    },
    {
      id: 'tr-10',
      speaker: 'customer',
      speakerName: 'Cliente',
      start: '04:11',
      end: '04:32',
      startSeconds: 251,
      endSeconds: 272,
      text: 'No, eso es todo. Gracias.',
      sentiment: 'neutral'
    },
    {
      id: 'tr-11',
      speaker: 'advisor',
      speakerName: 'Asesor',
      start: '04:33',
      end: '04:45',
      startSeconds: 273,
      endSeconds: 285,
      text: 'Gracias a usted, que tenga un buen día.',
      sentiment: 'positive'
    }
  ]
};

export const MOCK_CALL_RECORD = mockCallCase30274;
