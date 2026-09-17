import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Sparkles,
  User,
  GraduationCap,
  Calendar,
  Phone,
  AlertTriangle,
  FileText,
  CheckSquare,
  Building,
  HelpCircle
} from 'lucide-react';
import { AuditCase, EducationLevel } from '../../types/audit';
import { analyzeCancellationCase } from '../../lib/decision-engine/decision-engine';

interface AddCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCase: (newCase: AuditCase) => void;
}

export const AddCaseModal: React.FC<AddCaseModalProps> = ({
  isOpen,
  onClose,
  onAddCase
}) => {
  if (!isOpen) return null;

  // Form State
  const [ticketId, setTicketId] = useState(`CAVE-${Math.floor(30300 + Math.random() * 900)}`);
  const [studentName, setStudentName] = useState('Sofía Alejandra Mendoza Cruz');
  const [matricula, setMatricula] = useState('010884921');
  const [level, setLevel] = useState<EducationLevel>('LICENCIATURA');
  const [program, setProgram] = useState('Lic. en Pedagogía e Innovación Educativa');
  const [channel, setChannel] = useState('DIGITAL_FACEBOOK_ADS');
  const [phone, setPhone] = useState('+52 55 4433 2211');
  const [startDate, setStartDate] = useState('2026-08-31');
  const [requestDate, setRequestDate] = useState('2026-09-07');
  const [reason, setReason] = useState('Servicio deficiente / Académico - Falla en carga de materias en aula virtual');

  // Condition switches
  const [contactoEfectivo, setContactoEfectivo] = useState(true);
  const [llamadasCount, setLlamadasCount] = useState(2);
  const [mensajesCount, setMensajesCount] = useState(3);
  const [materiasCargadas, setMateriasCargadas] = useState(false);
  const [fallaCargaMaterias, setFallaCargaMaterias] = useState(true);
  const [ingresoAula, setIngresoAula] = useState(true);
  const [calificaciones, setCalificaciones] = useState(false);
  const [erroresOperativos, setErroresOperativos] = useState(true);
  const [promesaVenta, setPromesaVenta] = useState(false);
  const [retencionRealizada, setRetencionRealizada] = useState(true);
  const [retencionAceptada, setRetencionAceptada] = useState(false);

  // Preset loaders
  const loadPreset = (presetName: string) => {
    const randomId = `CAVE-${Math.floor(30300 + Math.random() * 900)}`;
    setTicketId(randomId);

    if (presetName === 'CARGA_TARDIA') {
      setStudentName('Fernando Castro Morales');
      setMatricula('010912443');
      setLevel('LICENCIATURA');
      setProgram('Lic. en Administración y Finanzas');
      setReason('Falla en aula virtual / Materias no cargadas oportunamente');
      setStartDate('2026-08-31');
      setRequestDate('2026-09-07');
      setContactoEfectivo(true);
      setMateriasCargadas(false);
      setFallaCargaMaterias(true);
      setErroresOperativos(true);
      setCalificaciones(false);
      setPromesaVenta(false);
      setRetencionRealizada(true);
      setRetencionAceptada(false);
    } else if (presetName === 'ILOCALIZABLE') {
      setStudentName('Daniela Reyes Fuentes');
      setMatricula('010733819');
      setLevel('LICENCIATURA');
      setProgram('Lic. en Mercadotecnia');
      setReason('Sin contacto telefónico ni acceso a plataforma (Protocolo ilocalizable)');
      setStartDate('2026-08-31');
      setRequestDate('2026-09-13');
      setContactoEfectivo(false);
      setLlamadasCount(16);
      setMensajesCount(7);
      setMateriasCargadas(true);
      setFallaCargaMaterias(false);
      setErroresOperativos(false);
      setIngresoAula(false);
      setCalificaciones(false);
      setPromesaVenta(false);
      setRetencionRealizada(false);
    } else if (presetName === 'PROMESA_VENTA') {
      setStudentName('Héctor Manuel Silva Soto');
      setMatricula('010644321');
      setLevel('LICENCIATURA');
      setProgram('Lic. en Negocios Internacionales');
      setReason('Asesor comercial ofreció acreditación sin requisitos ni costos extras');
      setStartDate('2026-08-31');
      setRequestDate('2026-09-08');
      setContactoEfectivo(true);
      setMateriasCargadas(true);
      setFallaCargaMaterias(false);
      setErroresOperativos(false);
      setCalificaciones(false);
      setPromesaVenta(true);
      setRetencionRealizada(true);
      setRetencionAceptada(false);
    } else if (presetName === 'CALIFICACIONES') {
      setStudentName('Jimena Paulina Romero');
      setMatricula('010555890');
      setLevel('LICENCIATURA');
      setProgram('Lic. en Psicología Organizacional');
      setReason('Motivos económicos / Solicita baja con entregables calificados');
      setStartDate('2026-08-31');
      setRequestDate('2026-09-12');
      setContactoEfectivo(true);
      setMateriasCargadas(true);
      setFallaCargaMaterias(false);
      setErroresOperativos(false);
      setCalificaciones(true); // HARD BLOCKER
      setPromesaVenta(false);
      setRetencionRealizada(true);
      setRetencionAceptada(false);
    } else if (presetName === 'PREVIO_INICIO') {
      setStudentName('Alejandro Torres Vega');
      setMatricula('010444102');
      setLevel('LICENCIATURA');
      setProgram('Lic. en Derecho');
      setReason('Cancelación solicitada con anticipación antes de apertura de ciclo');
      setStartDate('2026-09-01');
      setRequestDate('2026-08-25');
      setContactoEfectivo(true);
      setMateriasCargadas(false);
      setFallaCargaMaterias(false);
      setErroresOperativos(false);
      setCalificaciones(false);
      setPromesaVenta(false);
      setRetencionRealizada(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedStartDate = startDate.split('-').reverse().join('/');
    const formattedRequestDate = requestDate.split('-').reverse().join('/');

    const startD = new Date(startDate);
    const reqD = new Date(requestDate);
    const diffTime = Math.abs(reqD.getTime() - startD.getTime());
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const decisionData = {
      fechaInicio: startDate,
      fechaSolicitud: requestDate,
      diasHabilesDesdeInicio: Math.min(daysDiff, 10),
      semanasDesdeInicio: Math.ceil(daysDiff / 7),
      nivelEducativo: level,
      programa: program,
      estatusAlumno: 'En proceso de auditoría',
      canalVenta: channel,
      contactoEfectivo,
      llamadas: llamadasCount,
      llamadasValidasPorHorario: llamadasCount >= 15,
      interaccionesEscritas: mensajesCount,
      ingresoAula,
      ingresoAulaValidoPosgrado: ingresoAula && !fallaCargaMaterias,
      seleccionModalidad: false,
      calificaciones,
      materiasCargadas,
      fallaCargaMaterias,
      erroresAdministrativos: erroresOperativos,
      erroresFinancieros: false,
      errorInscripcion: false,
      promesaVenta,
      promesaVentaEvidencia: promesaVenta ? 'Grabación de cierre de venta cotejada por calidad' : undefined,
      solicitudAjuste: fallaCargaMaterias,
      ajusteDentroDe20Dias: true,
      ajusteRealizado: false,
      contactoConExitoEstudiantil: contactoEfectivo,
      areaOperativaCanalizoAExito: true,
      retencionRealizada,
      retencionAceptada,
      motivoSolicitud: reason,
      intencionCancelacionManifiesta: true
    };

    // Auto evaluate with decision engine
    const engineResult = analyzeCancellationCase(decisionData);

    const newCase: AuditCase = {
      id: ticketId,
      status: 'EN_ANALISIS',
      statusLabel: 'En análisis',
      matricula,
      studentName,
      program,
      level,
      channel,
      startDate: formattedStartDate,
      requestDate: formattedRequestDate,
      daysFromStart: daysDiff,
      workingDaysFromStart: Math.max(1, Math.min(daysDiff, 10)),
      requestedPolicy: engineResult.classificationName || 'Cancelación de Venta',
      requestReason: reason,
      studentContactNumber: phone,
      campaign: 'AUDITORIA_NUEVO_CASO',
      primaryCall: {
        id: `CALL-${Date.now()}`,
        title: `Llamada de Validación inicial – ${formattedRequestDate}`,
        duration: '06:30',
        durationSeconds: 390,
        date: formattedRequestDate,
        time: '12:00 h',
        status: 'TRANSCRIPCION_COMPLETADA',
        campaign: 'RETENCION_UTEL',
        phoneNumber: phone,
        intentsRatio: '1/1',
        sentiment: 'Neutro',
        detectedIntentions: [reason],
        keyMoments: [
          { timestamp: '00:10', label: 'Contacto titular verificado', type: 'contact' },
          { timestamp: '01:30', label: 'Manifestación de motivos', type: 'request' }
        ],
        effectiveContact: {
          efectivo: contactoEfectivo,
          criterios: [
            { criterio: 'El contacto debe ser con el titular registrado', cumplido: contactoEfectivo, evidencia: 'Titular validado' },
            { criterio: 'Identificación formal de UTEL Universidad', cumplido: contactoEfectivo, evidencia: 'Saludo institucional' },
            { criterio: 'Información sobre objetivo de la llamada y ciclo', cumplido: contactoEfectivo, evidencia: 'Objetivo expuesto' }
          ]
        },
        transcript: [
          {
            id: 't-new-1',
            speaker: 'advisor',
            speakerName: 'Asesor',
            start: '00:00',
            end: '00:15',
            startSeconds: 0,
            endSeconds: 15,
            text: `Buenas tardes, me comunico de Gestión de Calidad UTEL con ${studentName}.`
          },
          {
            id: 't-new-2',
            speaker: 'customer',
            speakerName: 'Cliente',
            start: '00:16',
            end: '00:45',
            startSeconds: 16,
            endSeconds: 45,
            text: `Sí, buenas tardes. Me comunico porque solicito la resolución de mi caso: ${reason}.`
          }
        ]
      },
      secondaryCalls: [],
      evidences: [
        {
          id: `ev-flk-${Date.now()}`,
          code: `FLK-${ticketId}`,
          name: `Ticket de Solicitud ${ticketId}`,
          source: 'Flokzu',
          type: 'document',
          status: 'DISPONIBLE',
          statusLabel: 'Cargado',
          date: `${formattedRequestDate} 10:00`,
          description: `Expediente de solicitud de deserción radicado formalmente. Motivo: ${reason}`,
          previewType: 'doc_view',
          previewData: {
            folio: ticketId,
            alumno: studentName,
            matricula,
            motivo: reason
          }
        },
        {
          id: `ev-siu-${Date.now()}`,
          code: `SIU-${matricula}`,
          name: `Kárdex SIU - ${matricula}`,
          source: 'SIU',
          type: 'system_record',
          status: 'DISPONIBLE',
          statusLabel: 'Cargado',
          date: `${formattedRequestDate} 10:15`,
          description: `Registro académico en sistema SIU. Calificaciones: ${calificaciones ? 'Registradas' : 'Sin registro'}.`,
          previewType: 'siu_table',
          previewData: {
            calificaciones: calificaciones ? 'Asentadas en plataforma' : '0 materias calificadas',
            materiasCargadas: materiasCargadas ? 'Completadas' : 'Error en asignación'
          }
        }
      ],
      timeline: [
        {
          id: `tl-1-${Date.now()}`,
          date: formattedStartDate,
          time: '08:00',
          title: 'Fecha Oficial de Inicio de Ciclo',
          description: 'Apertura de ciclo lectivo conforme a calendario escolar.',
          actor: 'Sistema Académico',
          system: 'SIU',
          type: 'info'
        },
        {
          id: `tl-2-${Date.now()}`,
          date: formattedRequestDate,
          time: '11:00',
          title: 'Radicación de Solicitud de Deserción',
          description: `Apertura de proceso con motivo: ${reason}`,
          actor: studentName,
          system: 'Flokzu',
          type: 'warning'
        }
      ],
      dictamen: {
        classification: engineResult.classificationName || 'Cancelación de Venta',
        confidence: Math.round(engineResult.confidence * 100),
        rootCause: engineResult.causaRaiz || 'En análisis',
        text: engineResult.dictamenSugerido || 'En evaluación por el motor de decisiones.',
        status: 'PENDIENTE_REVISION',
        modifiedByAuditor: false
      },
      decisionData
    };

    onAddCase(newCase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="add-case-modal"
        className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-2xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Agregar Nuevo Caso de Auditoría</h2>
              <p className="text-xs text-slate-400">Crea un caso de prueba para auditar y evaluar de inmediato con el motor de decisiones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Plantillas rápidas:
          </span>
          <button
            type="button"
            onClick={() => loadPreset('CARGA_TARDIA')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sky-300 font-medium hover:bg-slate-700 shrink-0 transition-colors shadow-2xs"
          >
            Carga Tardía Materias
          </button>
          <button
            type="button"
            onClick={() => loadPreset('ILOCALIZABLE')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sky-300 font-medium hover:bg-slate-700 shrink-0 transition-colors shadow-2xs"
          >
            Ilocalizable (15+6)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('PROMESA_VENTA')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sky-300 font-medium hover:bg-slate-700 shrink-0 transition-colors shadow-2xs"
          >
            Promesa de Venta
          </button>
          <button
            type="button"
            onClick={() => loadPreset('CALIFICACIONES')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sky-300 font-medium hover:bg-slate-700 shrink-0 transition-colors shadow-2xs"
          >
            Con Calificaciones (Baja)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('PREVIO_INICIO')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sky-300 font-medium hover:bg-slate-700 shrink-0 transition-colors shadow-2xs"
          >
            Previo al Inicio
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Datos Generales */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" /> Datos del Estudiante y Ticket
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Folio CAVE</label>
                <input
                  type="text"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono font-semibold text-sky-400 focus:bg-slate-900 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Matrícula</label>
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-200 focus:bg-slate-900 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:bg-slate-900 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nivel Educativo</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as EducationLevel)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:bg-slate-900 focus:border-sky-500 focus:outline-none"
                >
                  <option value="LICENCIATURA">Licenciatura</option>
                  <option value="POSGRADO">Posgrado</option>
                  <option value="EJECUTIVAS">Ejecutiva</option>
                  <option value="LICENCIATURAS_ALIANZAS">Alianza</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Programa Académico</label>
                <input
                  type="text"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:bg-slate-900 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. Fechas y Motivo */}
          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" /> Fechas y Causal Reportada
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Inicio de Clases</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:bg-slate-900 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Fecha de Solicitud</label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:bg-slate-900 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Teléfono Contacto</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:bg-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">Motivo / Causal Reportada en Ticket</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:bg-slate-900 focus:border-sky-500 focus:outline-none leading-relaxed"
                required
              />
            </div>
          </div>

          {/* 3. Indicadores de la Auditoría */}
          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-sky-400" /> Indicadores Clave para el Motor de Decisiones
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contacto efectivo */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactoEfectivo}
                  onChange={(e) => setContactoEfectivo(e.target.checked)}
                  className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Contacto Efectivo Acreditado</div>
                  <div className="text-[11px] text-slate-400">Se logró comunicación directa con el titular registrado</div>
                </div>
              </label>

              {/* Materias cargadas */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fallaCargaMaterias}
                  onChange={(e) => {
                    setFallaCargaMaterias(e.target.checked);
                    if (e.target.checked) setMateriasCargadas(false);
                  }}
                  className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Falla en Carga de Materias (A destiempo)</div>
                  <div className="text-[11px] text-slate-400">Materias ausentes o cargadas tarde provocando afectación</div>
                </div>
              </label>

              {/* Calificaciones */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calificaciones}
                  onChange={(e) => setCalificaciones(e.target.checked)}
                  className="mt-0.5 rounded text-rose-500 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-semibold text-rose-300">Tiene Calificaciones Asentadas (Hard Blocker)</div>
                  <div className="text-[11px] text-rose-400 font-medium">Invalida cualquier cancelación y fuerza trámite de Baja</div>
                </div>
              </label>

              {/* Promesa de Venta */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promesaVenta}
                  onChange={(e) => setPromesaVenta(e.target.checked)}
                  className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Promesa de Venta Comprobada</div>
                  <div className="text-[11px] text-slate-400">Información falsa o distorsionada en el cierre comercial</div>
                </div>
              </label>

              {/* Error Operativo general */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={erroresOperativos}
                  onChange={(e) => setErroresOperativos(e.target.checked)}
                  className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Error Operativo Institucional Comprobado</div>
                  <div className="text-[11px] text-slate-400">Falla de finanzas, cobranza, sistemas o canalización</div>
                </div>
              </label>

              {/* Retención aceptada */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retencionAceptada}
                  onChange={(e) => setRetencionAceptada(e.target.checked)}
                  className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Aceptó Beneficio de Retención</div>
                  <div className="text-[11px] text-slate-400">Si aceptó beneficio o beca, no aplica desvinculación</div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Footer */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-md flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear y Auditar Caso</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
