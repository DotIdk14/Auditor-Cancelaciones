import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RotateCw,
  HelpCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DecisionResult } from '../../lib/decision-engine/types';

interface CaseAnalysisProps {
  decisionResult: DecisionResult;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onOpenDecisionTree: () => void;
}

export const CaseAnalysis: React.FC<CaseAnalysisProps> = ({
  decisionResult,
  isAnalyzing,
  onRunAnalysis,
  onOpenDecisionTree
}) => {
  const appliedRules = decisionResult?.reglasAplicadas || decisionResult?.appliedRules || [];
  const rejectedRules = decisionResult?.reglasDescartadas || decisionResult?.rejectedRules || [];
  const conflicts = decisionResult?.conflictos || decisionResult?.conflicts || [];

  return (
    <div id="case-analysis-panel" className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-700/50 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Análisis del Motor de Reglas
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-950/80 border border-indigo-700/60 px-2 py-0.5 rounded-md">
            Políticas UTEL
          </span>
          <button
            id="btn-re-analyze-case"
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className="p-1 text-slate-400 hover:text-sky-400 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Re-ejecutar motor de reglas"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Proposition */}
      <div className="pt-3 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Propuesta de dictamen</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700">
            Confianza: {decisionResult.confidence}%
          </span>
        </div>

        <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800">
          <div className="text-sm font-black text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            {decisionResult.classificationName}
          </div>
          
          <div className="mt-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Causa raíz: </span>
            <span className="text-slate-200">{decisionResult.causaRaiz}</span>
          </div>

          <div className="mt-1 text-[11px] text-indigo-300 font-mono">
            {decisionResult.politicaArticulo}
          </div>
        </div>
      </div>

      {/* Conflicts if any */}
      {conflicts.length > 0 && (
        <div className="mb-3 p-3 bg-amber-950/40 border border-amber-600/50 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Conflicto normativo resuelto:</span>
          </div>
          <div className="text-[11px] text-amber-200/90 space-y-1">
            <div className="font-medium">
              • {conflicts[0].ruleA.name} <span className="font-bold text-amber-400">vs</span> {conflicts[0].ruleB.name}
            </div>
            <div className="text-slate-300 bg-slate-950/70 p-2 rounded-lg border border-amber-700/50 leading-snug">
              {conflicts[0].resolution}
            </div>
          </div>
        </div>
      )}

      {/* Applied Rules */}
      <div className="pb-3 border-b border-slate-800">
        <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
          <span>Reglas aplicadas</span>
          <span className="text-[10px] text-emerald-400 font-semibold font-mono">
            {appliedRules.length} detectadas
          </span>
        </div>

        <ul className="space-y-2">
          {appliedRules.map((rule) => {
            const isDeterminant = rule.status === 'DETERMINANTE' || rule.priority <= 2;
            return (
              <li
                key={rule.id}
                className={`text-xs p-2 rounded-lg border flex items-start gap-2 ${
                  isDeterminant
                    ? 'bg-emerald-950/20 border-emerald-600/40 text-emerald-200'
                    : 'bg-slate-950/50 border-slate-800 text-slate-300'
                }`}
              >
                <span className={`font-bold mt-0.5 ${isDeterminant ? 'text-emerald-400' : 'text-sky-400'}`}>
                  {isDeterminant ? '★' : '✓'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{rule.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rule.article}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Rejected Rules (if any) */}
      {rejectedRules.length > 0 && (
        <div className="py-2.5 border-b border-slate-800">
          <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
            Reglas descartadas
          </div>
          <ul className="space-y-1">
            {rejectedRules.slice(0, 2).map((rule) => (
              <li key={rule.id} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span className="truncate">{rule.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA to open full decision tree */}
      <div className="pt-3">
        <button
          id="btn-ver-razonamiento-completo"
          onClick={onOpenDecisionTree}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-700/60 transition-colors shadow-2xs"
        >
          <span>Ver árbol de decisión y razonamiento</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
