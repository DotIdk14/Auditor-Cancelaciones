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
  ArrowLeft,
  X
} from 'lucide-react';
import { DictamenData, AuditCase } from '../../../types/audit';
import { DecisionResult, AppliedRule } from '../../../lib/decision-engine/types';

interface CaseDictamenViewProps {
  dictamen: DictamenData;
  caseData: AuditCase;
  decisionResult?: DecisionResult;
  onUpdateDictamen: (updated: DictamenData) => void;
  onApproveDictamen: () => void;
  onNavigateToDecision: () => void;
}

export const CaseDictamenView: React.FC<CaseDictamenViewProps> = ({
  dictamen,
  caseData,
  decisionResult,
  onUpdateDictamen,
  onApproveDictamen,
  onNavigateToDecision
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(dictamen.text);
  const [editClassification, setEditClassification] = useState(dictamen.classification);
  const [editRootCause, setEditRootCause] = useState(dictamen.rootCause);
  const [copied, setCopied] = useState(false);

  const isApproved = dictamen.status === 'APROBADO' || caseData.status === 'APROBADO';
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
    <div id="case-dictamen-view" className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Official Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
              isApproved
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}>
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
                  Expediente de Dictaminación Oficial
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                  isApproved
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  {isApproved ? 'DICTAMEN APROBADO' : 'PENDIENTE DE CERTIFICACIÓN'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Caso: <span className="font-mono font-bold text-zinc-300">{caseData.id}</span> • Alumno:{' '}
                <span className="font-medium text-zinc-200">{caseData.studentName}</span> ({caseData.matricula})
              </p>
            </div>
          </div>

          {/* Action Buttons with Clear Primary Dominance */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700 transition-all"
              title="Copiar texto formal del dictamen"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Dictamen'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700 transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Imprimir</span>
            </button>

            {!isEditing && !isApproved && (
              <button
                onClick={() => {
                  setEditText(dictamen.text);
                  setEditClassification(dictamen.classification);
                  setEditRootCause(dictamen.rootCause);
                  setIsEditing(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Editar</span>
              </button>
            )}

            {/* Dominant Primary Action */}
            {!isApproved ? (
              <button
                id="btn-approve-dictamen"
                onClick={onApproveDictamen}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-white text-zinc-950 transition-all shadow-sm"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Aprobar y Certificar Dictamen</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Certificación Vigente</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Dictamen Details & Certifier Signature */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Official Verdict & Text (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs">
                  UTEL
                </div>
                <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                  Formato de Dictamen Pericial • {caseData.id}
                </h3>
              </div>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded font-mono">
                Plantilla Oficial CAVE
              </span>
            </div>

            {/* Official Data Grid */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 bg-zinc-950">
                <div className="p-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Nombre del Alumno</span>
                  <span className="font-semibold text-zinc-200 mt-0.5 block">{caseData.studentName}</span>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Matrícula</span>
                  <span className="font-mono font-semibold text-zinc-200 mt-0.5 block">{caseData.matricula}</span>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Nivel y Programa</span>
                  <span className="text-zinc-200 mt-0.5 block truncate">{caseData.level} • {caseData.program}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 border-t border-zinc-800 bg-zinc-950/60">
                <div className="p-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Canal de Venta</span>
                  <span className="font-mono text-zinc-300 mt-0.5 block">{caseData.channel}</span>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Inicio de Ciclo</span>
                  <span className="text-zinc-300 font-mono mt-0.5 block">{caseData.startDate}</span>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Solicitud Alumno</span>
                  <span className="text-zinc-300 font-mono mt-0.5 block">{caseData.requestDate || 'Sin registro'}</span>
                </div>
              </div>
            </div>

            {/* Verdict and Root Cause */}
            <div className="pt-2">
              {isEditing ? (
                <div className="space-y-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">Modificando Dictamen</span>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Clasificación</label>
                    <input
                      type="text"
                      value={editClassification}
                      onChange={(e) => setEditClassification(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Causa Raíz</label>
                    <input
                      type="text"
                      value={editRootCause}
                      onChange={(e) => setEditRootCause(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Fundamentación Pericial</label>
                    <textarea
                      rows={6}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 leading-relaxed font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-1.5 text-xs font-bold bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        Clasificación Dictaminada
                      </div>
                      <div className="text-lg font-bold text-zinc-100 mt-0.5">
                        {dictamen.classification}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        <span className="font-semibold text-zinc-300">Causa raíz:</span> {dictamen.rootCause}
                      </div>
                    </div>
                    {dictamen.article && (
                      <div className="sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
                          Fundamento Reglamentario
                        </span>
                        <span className="text-xs font-bold text-zinc-300 font-mono mt-0.5 block">
                          {dictamen.article}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Fundamentación Jurídica y Análisis de Evidencias
                    </h4>
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-mono">
                      {dictamen.text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Signature & Audit Trail (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-zinc-800">
              <UserCheck className="w-4 h-4 text-zinc-400" />
              <span>Certificación y Firma de Calidad</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Auditor Certificador</span>
                <span className="font-semibold text-zinc-200 mt-0.5 block">
                  {dictamen.approvedBy || 'Ian Jarquín'}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">
                  Auditor de Calidad y Procesos • UTEL
                </span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Fecha y Hora de Certificación</span>
                <span className="font-mono text-zinc-200 mt-0.5 block">
                  {dictamen.approvedAt || (isApproved ? 'Certificado' : 'Pendiente de firma')}
                </span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Identificador CAVE</span>
                <span className="font-mono font-bold text-zinc-200 mt-0.5 block">
                  {caseData.id}
                </span>
              </div>
            </div>

            {isApproved && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Dictamen certificado con validez ante Servicios Escolares y Finanzas.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
