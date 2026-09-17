import React, { useState } from 'react';
import {
  FileCheck,
  CheckCircle,
  Clock,
  ShieldCheck,
  Edit3,
  Save,
  Printer,
  Copy,
  Check,
  AlertCircle,
  UserCheck,
  Cpu,
  Layers,
  Scale,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { DictamenData, AuditCase } from '../../types/audit';
import { DecisionResult, AppliedRule } from '../../lib/decision-engine/types';

interface DictamenFullViewProps {
  dictamen: DictamenData;
  caseData: AuditCase;
  decisionResult?: DecisionResult;
  onUpdateDictamen: (updated: DictamenData) => void;
  onApproveDictamen: () => void;
  onSelectTab: (tab: string) => void;
}

export const DictamenFullView: React.FC<DictamenFullViewProps> = ({
  dictamen,
  caseData,
  decisionResult,
  onUpdateDictamen,
  onApproveDictamen,
  onSelectTab
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(dictamen.text);
  const [editClassification, setEditClassification] = useState(dictamen.classification);
  const [editRootCause, setEditRootCause] = useState(dictamen.rootCause);
  const [copied, setCopied] = useState(false);

  const isApproved = dictamen.status === 'APROBADO';
  const appliedRules: AppliedRule[] = decisionResult?.reglasAplicadas || decisionResult?.appliedRules || [];

  const handleSave = () => {
    onUpdateDictamen({
      ...dictamen,
      classification: editClassification,
      rootCause: editRootCause,
      text: editText,
      modifiedByAuditor: true
    });
    setIsEditing(false);
  };

  const handleCopySummary = () => {
    const textToCopy = `EXPEDIENTE DE DICTAMEN OFICIAL UTEL
Caso: ${caseData.id}
Alumno: ${caseData.studentName} (Matrícula: ${caseData.matricula})
Programa: ${caseData.program}
Dictamen: ${dictamen.classification}
Causa Raíz: ${dictamen.rootCause}
Fundamento: ${dictamen.article}
Estado: ${dictamen.status}
Auditor: ${dictamen.approvedBy || 'Ian Jarquín (Auditor de Calidad)'}
Fecha: ${dictamen.approvedAt || new Date().toLocaleString()}

Fundamentación Técnica:
${dictamen.text}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div id="dictamen-full-view" className="space-y-6 animate-fadeIn">
      {/* Official Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-950/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
              isApproved
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                : 'bg-indigo-950/80 border-indigo-700/50 text-indigo-400'
            }`}>
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Expediente de Dictaminación de Auditoría
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                  isApproved
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                    : 'bg-amber-950/90 text-amber-300 border-amber-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isApproved ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  {isApproved ? 'DICTAMEN APROBADO' : 'PENDIENTE DE APROBACIÓN'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Caso: <span className="font-mono font-bold text-slate-300">{caseData.id}</span> • Alumno:{' '}
                <span className="font-medium text-slate-200">{caseData.studentName}</span> ({caseData.matricula})
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-2xs"
              title="Copiar texto formal del dictamen al portapapeles"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Dictamen'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Imprimir Ficha</span>
            </button>

            {!isEditing && (
              <button
                onClick={() => {
                  setEditText(dictamen.text);
                  setEditClassification(dictamen.classification);
                  setEditRootCause(dictamen.rootCause);
                  setIsEditing(true);
                }}
                disabled={isApproved}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-2xs disabled:opacity-40"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Editar</span>
              </button>
            )}

            {!isApproved ? (
              <button
                onClick={onApproveDictamen}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all shadow-lg hover:shadow-emerald-600/30"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Aprobar y Certificar Dictamen</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Certificación Vigente</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / CENTER: Official Verdict & Text (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Official UTEL Report Table Card matching PDF template */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center font-mono font-bold text-xs">
                  UTEL
                </div>
                <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                  Formato Oficial de Dictamen • {caseData.id}
                </h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
                Plantilla Oficial CAVE
              </span>
            </div>

            {/* Official PDF Table Grid */}
            <div className="border border-slate-700 rounded-xl overflow-hidden text-xs">
              {/* Row 1: Nombre, Matrícula, Correo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 bg-slate-950">
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Nombre</span>
                  <span className="font-semibold text-slate-100 mt-0.5 block">{caseData.studentName}</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Matrícula</span>
                  <span className="font-mono font-semibold text-sky-300 mt-0.5 block">{caseData.matricula}</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Correo</span>
                  <span className="text-slate-300 mt-0.5 block truncate">edumct15@gmail.com</span>
                </div>
              </div>

              {/* Row 2: Canal, Programa, Fecha de creación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 border-t border-slate-700 bg-slate-950/80">
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Canal</span>
                  <span className="font-mono text-slate-300 mt-0.5 block">{caseData.channel}_NICOLAS_R_MEX</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Programa</span>
                  <span className="text-slate-200 font-medium mt-0.5 block">{caseData.program}</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha de creación</span>
                  <span className="text-slate-300 mt-0.5 block">1 de Agosto de 2026 a las 16:03</span>
                </div>
              </div>

              {/* Row 3: Fecha Decisión, Fecha de inicio de ciclo (Inicio del Ticket), Fecha solicitud de ticket */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 border-t border-slate-700 bg-slate-950">
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha Decisión</span>
                  <span className="font-mono text-slate-300 mt-0.5 block">D53 - 22/08</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha de inicio de ciclo</span>
                  <span className="font-mono text-emerald-300 font-semibold mt-0.5 block">{caseData.startDate} (Inicio Ticket)</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha solicitud de ticket</span>
                  <span className="font-mono text-slate-300 mt-0.5 block">{caseData.requestDate}</span>
                </div>
              </div>

              {/* Row 4: Asignado a Dictaminar, Última sesión, Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 border-t border-slate-700 bg-slate-950/80">
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Asignado a Dictaminar</span>
                  <span className="text-slate-300 mt-0.5 block">8/09 (Ian Jarquín)</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Última sesión</span>
                  <span className="text-slate-400 mt-0.5 block">-</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Teléfono</span>
                  <span className="font-mono text-slate-200 mt-0.5 block">{caseData.studentContactNumber}</span>
                </div>
              </div>

              {/* Row 5: Primer pago, Política que aplica, Motivo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 border-t border-slate-700 bg-slate-950">
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Primer pago</span>
                  <span className="font-semibold text-amber-400 mt-0.5 block flex items-center gap-1">
                    🚫 <span className="text-xs">Validado / Liquidado</span>
                  </span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Política que aplica</span>
                  <span className="font-semibold text-sky-300 mt-0.5 block">09 Cancelación de venta operativa</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Motivo</span>
                  <span className="text-slate-200 mt-0.5 block">{caseData.requestReason}</span>
                </div>
              </div>

              {/* Row 6: Descripción */}
              <div className="p-2.5 border-t border-slate-700 bg-slate-950/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Descripción del Caso</span>
                <p className="text-slate-200 mt-1 leading-relaxed">
                  El estudiante solicita su baja debido a que no cuenta con carga de materias en el Aula Virtual, indicando retraso superior a una semana y media tras su inicio de clases (31/08), expresando molestia y solicitando su desvinculación el 7/09.
                </p>
              </div>

              {/* Row 7: Comentarios BO & HelpDesk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 border-t border-slate-700 bg-slate-950">
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Comentarios BO</span>
                  <span className="text-slate-300 mt-0.5 block">08/09 El alumno no desea continuar por la falla en la carga de sus materias, en todo caso aplicaría como CV operativa.</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Comentarios HelpDesk</span>
                  <span className="text-slate-300 mt-0.5 block">08/09 Se somete a revisión la cancelación de venta debido a que el estudiante solicita su baja por falta de materias curriculares.</span>
                </div>
              </div>

              {/* Row 8: Firmas / Revisores & SER / Finanzas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 border-t border-slate-700 bg-slate-950/80">
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Revisores (Jacqueline / Claudia)</span>
                  <span className="text-emerald-400 font-semibold mt-0.5 block">✓ Validado por Operaciones</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Comentarios SER / Finanzas</span>
                  <span className="text-slate-400 mt-0.5 block">Sin adeudos pendientes / Aprobado</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Dictamen aplicado el</span>
                  <span className="font-mono text-sky-300 mt-0.5 block">10 de septiembre de 2026 (16:41)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Verdict Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
            {isEditing ? (
              /* Editing Form */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-sky-400" />
                    <span>Modificar Dictamen y Fundamentación</span>
                  </h3>
                  <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                    Modificación manual del auditor
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Clasificación Oficial del Dictamen
                  </label>
                  <select
                    value={editClassification}
                    onChange={(e) => setEditClassification(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-sky-500 font-semibold"
                  >
                    <option value="Cancelación de Venta Operativa">Cancelación de Venta Operativa (Falla de Carga / Incumplimiento)</option>
                    <option value="Cancelación por Ilocalizable">Cancelación por Ilocalizable (Sin Contacto Efectivo ni Ingreso al Aula)</option>
                    <option value="Cancelación de Venta Regular">Cancelación de Venta Regular (Dentro de Días Hábiles sin Invasión)</option>
                    <option value="Cancelación de Venta por Promesa no Cumplida">Cancelación de Venta por Promesa no Cumplida (Ventas)</option>
                    <option value="Cancelación de Venta por Ajuste no Aplicado">Cancelación de Venta por Ajuste no Aplicado</option>
                    <option value="Baja Definitiva por Calificaciones Registradas">Baja Definitiva por Calificaciones Registradas</option>
                    <option value="Baja Definitiva a Solicitud del Estudiante">Baja Definitiva a Solicitud del Estudiante</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Causa Raíz
                  </label>
                  <input
                    type="text"
                    value={editRootCause}
                    onChange={(e) => setEditRootCause(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Texto de la Fundamentación y Conclusión
                  </label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={7}
                    className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Official View */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Clasificación Formal
                    </span>
                    <h3 className="text-xl font-black text-slate-100 mt-0.5">
                      {dictamen.classification}
                    </h3>
                  </div>

                  {dictamen.modifiedByAuditor && (
                    <span className="text-[11px] bg-amber-950/70 text-amber-300 border border-amber-700/60 px-2.5 py-1 rounded-full font-medium">
                      ✎ Ajustado por Auditor
                    </span>
                  )}
                </div>

                {/* Causa Raiz & Articulo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Causa Raíz
                    </span>
                    <p className="text-xs font-semibold text-slate-200 mt-1">
                      {dictamen.rootCause}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Artículo / Normativa Aplicada
                    </span>
                    <p className="text-xs font-semibold text-indigo-300 font-mono mt-1">
                      {dictamen.article || 'Reglamento General de Alumnos Art. 18'}
                    </p>
                  </div>
                </div>

                {/* Official Text */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Fundamentación del Dictamen
                  </span>
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {dictamen.text}
                  </div>
                </div>

                {/* Digital Certification Stamp */}
                {isApproved ? (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-300">
                          Dictamen Aprobado y Certificado
                        </div>
                        <div className="text-[11px] text-emerald-200/80 mt-0.5">
                          Auditor:{' '}
                          <span className="font-semibold text-emerald-100">
                            {dictamen.approvedBy || 'Ian Jarquín (Auditor de Calidad)'}
                          </span>{' '}
                          • Fecha: {dictamen.approvedAt || new Date().toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
                          Hash de certificación: UTEL-QA-{caseData.id}-2026-VAL892
                        </div>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold tracking-wider uppercase shrink-0">
                      Sello de Calidad Válido
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-slate-400">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Dictamen en espera de aprobación final por parte del auditor.</span>
                    </div>
                    <button
                      onClick={onApproveDictamen}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-md"
                    >
                      Aprobar Ahora
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Applied Rules Breakdown (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Reglas que Sustentan este Dictamen
                </h3>
              </div>
              <button
                onClick={() => onSelectTab('analysis')}
                className="text-[10px] font-bold text-sky-400 hover:text-sky-300"
              >
                Ver Análisis Completo →
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              El motor de decisiones identificó las siguientes reglas que dan validez jurídica y operativa al dictamen:
            </p>

            <div className="space-y-3">
              {appliedRules.map((rule) => {
                const isDeterminant = rule.status === 'DETERMINANTE' || rule.priority <= 2;

                return (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isDeterminant
                        ? 'bg-emerald-950/30 border-emerald-500/50'
                        : 'bg-sky-950/20 border-sky-600/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span
                        className={`px-2 py-0.2 rounded text-[10px] font-bold font-mono border ${
                          isDeterminant
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                            : 'bg-sky-950 text-sky-300 border-sky-700'
                        }`}
                      >
                        {rule.id}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                          isDeterminant
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {isDeterminant ? '★ Determinante' : '✓ Requisito'}
                      </span>
                    </div>

                    <div
                      className={`text-xs font-bold leading-tight mt-1 ${
                        isDeterminant ? 'text-emerald-200' : 'text-sky-200'
                      }`}
                    >
                      {rule.title}
                    </div>

                    <div className="text-[11px] text-slate-300 mt-1.5 leading-snug">
                      {rule.verdictContribution || rule.description}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{rule.article}</span>
                      <span>P{rule.priority}</span>
                    </div>
                  </div>
                );
              })}

              {appliedRules.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">
                  Sin reglas vinculadas. Ejecute el motor desde la pestaña de Análisis.
                </div>
              )}
            </div>

            {/* Quick Sandbox link */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => onSelectTab('info')}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold text-center transition-all"
              >
                Ver Expediente Académico e Información →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
