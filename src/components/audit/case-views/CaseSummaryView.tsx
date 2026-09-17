import React from 'react';
import {
  User,
  GraduationCap,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Cpu,
  ArrowRight,
  PhoneCall,
  FileSpreadsheet,
  Building,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';
import { AuditCase } from '../../../types/audit';
import { DecisionResult } from '../../../lib/decision-engine/types';

interface CaseSummaryViewProps {
  currentCase?: AuditCase;
  caseData?: AuditCase;
  decisionResult?: DecisionResult | null;
  onNavigateToTab?: (tab: 'summary' | 'evidences' | 'decision' | 'dictamen') => void;
  onNavigateToEvidences?: () => void;
  onNavigateToDecision?: () => void;
}

export const CaseSummaryView: React.FC<CaseSummaryViewProps> = ({
  currentCase: propCurrentCase,
  caseData: propCaseData,
  decisionResult,
  onNavigateToTab,
  onNavigateToEvidences,
  onNavigateToDecision
}) => {
  const currentCase = propCurrentCase || propCaseData;
  if (!currentCase) return null;

  const d = currentCase.decisionData;
  if (!d) return null;

  const handleGoToEvidences = () => {
    if (onNavigateToEvidences) {
      onNavigateToEvidences();
    } else if (onNavigateToTab) {
      onNavigateToTab('evidences');
    }
  };

  const handleGoToDecision = () => {
    if (onNavigateToDecision) {
      onNavigateToDecision();
    } else if (onNavigateToTab) {
      onNavigateToTab('decision');
    }
  };

  const daysSince = currentCase.daysFromStart ?? (currentCase as any).daysSinceStart ?? 0;
  const isApproved = currentCase.status === 'APROBADO';
  const hasHardBlocker = Boolean(decisionResult?.hardBlockers && decisionResult.hardBlockers.length > 0);
  const missingEvidences = decisionResult?.missingEvidences || [];
  const confidenceVal = decisionResult?.confidence ?? (decisionResult as any)?.confidenceScore ?? 0.95;

  return (
    <div id="case-summary-view" className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Hero Executive Status Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Diagnóstico del Expediente
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isApproved
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                  : 'bg-amber-950/50 text-amber-300 border-amber-800/60'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                {currentCase.statusLabel}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight">
              {decisionResult?.classificationName || decisionResult?.classification || 'En Evaluación'}
            </h2>

            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              {decisionResult?.causaRaiz 
                ? `Causa raíz identificada: ${decisionResult.causaRaiz}. ` 
                : ''}
              {hasHardBlocker
                ? 'Atención: Existen bloqueos normativos estrictos que impiden la cancelación de venta.'
                : 'El caso cuenta con elementos probatorios preliminares para avanzar en el flujo de auditoría.'}
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="btn-summary-to-evidences"
              onClick={handleGoToEvidences}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-zinc-900 bg-zinc-100 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <span>Revisar Evidencias del Caso</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="btn-summary-to-decision"
              onClick={handleGoToDecision}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 rounded-xl transition-colors cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span>Ver Decisión Normativa</span>
            </button>
          </div>
        </div>

        {/* Confidence & Alerts Bar */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
            <div className="text-[11px] text-zinc-500 font-medium">Nivel de Confianza del Motor</div>
            <div className="text-base font-bold text-zinc-200 mt-0.5 flex items-center gap-2">
              <span>{Math.round(confidenceVal * 100)}%</span>
              <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-zinc-400 rounded-full" 
                  style={{ width: `${Math.round(confidenceVal * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
            <div className="text-[11px] text-zinc-500 font-medium">Tiempo Transcurrido</div>
            <div className="text-base font-bold text-zinc-200 mt-0.5 font-mono">
              {daysSince} días naturales
              <span className="text-[11px] text-zinc-500 font-normal ml-1">
                ({daysSince <= 20 ? 'Dentro de ventana 20d' : 'Fuera de ventana 20d'})
              </span>
            </div>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
            <div className="text-[11px] text-zinc-500 font-medium">Evidencias Probatorias</div>
            <div className="text-base font-bold text-zinc-200 mt-0.5">
              {currentCase.evidences?.length || 0} disponibles
              {missingEvidences.length > 0 && (
                <span className="text-amber-400 text-xs font-normal ml-1.5">
                  ({missingEvidences.length} faltante{missingEvidences.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grid: Academic Identity & Regulatory Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Student & Academic Profile */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-400" />
              <span>Ficha Académica del Alumno</span>
            </h3>
            <span className="text-xs font-mono font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              {currentCase.level}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 font-medium block">Nombre Completo</span>
              <span className="text-sm font-semibold text-zinc-200 block mt-0.5">{currentCase.studentName}</span>
            </div>

            <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 font-medium block">Matrícula Oficial</span>
              <span className="text-sm font-bold text-zinc-200 font-mono block mt-0.5">{currentCase.matricula}</span>
            </div>

            <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 sm:col-span-2">
              <span className="text-[11px] text-zinc-500 font-medium block">Programa Académico</span>
              <span className="text-xs font-semibold text-zinc-200 block mt-0.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                {currentCase.program}
              </span>
            </div>

            <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 font-medium block">Canal de Venta</span>
              <span className="text-xs font-semibold text-zinc-200 font-mono block mt-0.5">{currentCase.channel}</span>
            </div>

            <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 font-medium block">Fecha de Inicio de Ciclo</span>
              <span className="text-xs font-semibold text-zinc-200 font-mono block mt-0.5">{currentCase.startDate}</span>
            </div>

            <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 font-medium block">Fecha de Solicitud del Alumno</span>
              <span className="text-xs font-semibold text-zinc-200 font-mono block mt-0.5">{currentCase.requestDate || 'Sin registro'}</span>
            </div>

            <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 font-medium block">Auditor a Cargo</span>
              <span className="text-xs font-semibold text-zinc-200 block mt-0.5">Ian Jarquín (Auditor de Calidad)</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Process Progress & Stage Guidance */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <span>Etapas de la Auditoría</span>
            </h3>

            <div className="space-y-3 text-xs">
              {/* Step 1: Resumen */}
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700">
                <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-900 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <div className="font-semibold text-zinc-100">Resumen y Estado</div>
                  <div className="text-[11px] text-zinc-400">Identificación de matrícula y ventana de tiempo.</div>
                </div>
              </div>

              {/* Step 2: Evidencias */}
              <button
                onClick={() => onNavigateToTab('evidences')}
                className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div>
                  <div className="font-semibold text-zinc-300">Revisión de Evidencias</div>
                  <div className="text-[11px] text-zinc-500">Llamadas diarizadas y capturas SIU/Flokzu.</div>
                </div>
              </button>

              {/* Step 3: Decisión */}
              <button
                onClick={() => onNavigateToTab('decision')}
                className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </div>
                <div>
                  <div className="font-semibold text-zinc-300">Decisión y Motor de Reglas</div>
                  <div className="text-[11px] text-zinc-500">Causales, bloqueos duros y fundamentos.</div>
                </div>
              </button>

              {/* Step 4: Dictamen */}
              <button
                onClick={() => onNavigateToTab('dictamen')}
                className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  4
                </div>
                <div>
                  <div className="font-semibold text-zinc-300">Dictamen Oficial</div>
                  <div className="text-[11px] text-zinc-500">Firma pericial y certificación digital.</div>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 text-center">
            Procedimiento Institucional UTEL • v2.4
          </div>
        </div>
      </div>
    </div>
  );
};
