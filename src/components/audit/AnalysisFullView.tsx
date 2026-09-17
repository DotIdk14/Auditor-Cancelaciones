import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  BookOpen,
  ArrowRight,
  GitBranch,
  Layers,
  FileCheck2,
  SlidersHorizontal,
  Sparkles,
  Info,
  Scale
} from 'lucide-react';
import { DecisionResult, AppliedRule, RejectedRule, RuleConflict } from '../../lib/decision-engine/types';
import { AuditCase } from '../../types/audit';

interface AnalysisFullViewProps {
  decisionResult: DecisionResult;
  caseData: AuditCase;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onOpenDecisionTree: () => void;
  onSelectTab: (tab: string) => void;
}

export const AnalysisFullView: React.FC<AnalysisFullViewProps> = ({
  decisionResult,
  caseData,
  isAnalyzing,
  onRunAnalysis,
  onOpenDecisionTree,
  onSelectTab
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'DETERMINANTE' | 'CONFLICTO' | 'DESCARTADA' | 'REASONING'>('ALL');

  const appliedRules: AppliedRule[] = decisionResult.reglasAplicadas || decisionResult.appliedRules || [];
  const rejectedRules: RejectedRule[] = decisionResult.reglasDescartadas || decisionResult.rejectedRules || [];
  const conflicts: RuleConflict[] = decisionResult.conflictos || decisionResult.conflicts || [];
  const reasoning: string[] = decisionResult.reasoning || [];

  // Group applied rules
  const determinantRules = appliedRules.filter(r => r.status === 'DETERMINANTE' || r.priority <= 2);
  const secondaryRules = appliedRules.filter(r => r.status !== 'DETERMINANTE' && r.priority > 2);

  return (
    <div id="analysis-full-view" className="space-y-6 animate-fadeIn">
      {/* Top Banner: Engine Verdict Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-400 flex items-center justify-center shadow-inner">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                    Motor de Decisión Normativa
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                    v2.4 Jerárquico
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Evaluación automatizada contra el Reglamento General de Estudiantes UTEL y Criterios Operativos.
                </p>
              </div>
            </div>

            {/* Main Verdict Badge */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Dictamen Sugerido por el Motor
                </div>
                <div className="text-lg font-black text-emerald-400 mt-0.5 flex items-center gap-2">
                  <span>{decisionResult.classificationName || decisionResult.classification}</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Causa Raíz Determinada
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-1 max-w-md">
                  {decisionResult.causaRaiz || 'Conforme a la reglamentación'}
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Nivel de Confianza
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-black font-mono text-indigo-300">
                    {decisionResult.confidence}%
                  </span>
                  <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${decisionResult.confidence}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 justify-end">
            <button
              onClick={onOpenDecisionTree}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 rounded-xl text-xs font-bold transition-all shadow-md hover:border-indigo-500"
            >
              <GitBranch className="w-4 h-4 text-indigo-400" />
              <span>Ver Árbol Interactivo</span>
            </button>

            <button
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 text-sky-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Reevaluando...' : 'Reejecutar Motor'}</span>
            </button>

            <button
              onClick={() => onSelectTab('dictamen')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <span>Ir a Dictamen Formal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Navigation Tabs for Rules */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'ALL'
                ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todas las Reglas ({appliedRules.length + rejectedRules.length})</span>
          </button>

          <button
            onClick={() => setFilterType('DETERMINANTE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'DETERMINANTE'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 shadow-xs'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Determinantes ({determinantRules.length})</span>
          </button>

          {conflicts.length > 0 && (
            <button
              onClick={() => setFilterType('CONFLICTO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterType === 'CONFLICTO'
                  ? 'bg-amber-950/70 text-amber-300 border border-amber-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Conflictos Resueltos ({conflicts.length})</span>
            </button>
          )}

          <button
            onClick={() => setFilterType('DESCARTADA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'DESCARTADA'
                ? 'bg-slate-800/90 text-slate-300 border border-slate-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Descartadas ({rejectedRules.length})</span>
          </button>

          <button
            onClick={() => setFilterType('REASONING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'REASONING'
                ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-700/60 shadow-xs'
                : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-900'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Bitácora de Razonamiento ({reasoning.length})</span>
          </button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500"></span>
            Determinante
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500"></span>
            Prevalente / Conflicto
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-sky-500/30 border border-sky-500"></span>
            Requisito Accesorio
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700"></span>
            Descartada
          </span>
        </div>
      </div>

      {/* CONFLICT CARD (If active and filtered) */}
      {(filterType === 'ALL' || filterType === 'CONFLICTO') && conflicts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Conflictos Normativos y Resolución de Prevalencia</span>
          </div>

          {conflicts.map((c, idx) => (
            <div
              key={idx}
              className="bg-amber-950/20 border border-amber-600/40 rounded-2xl p-5 space-y-4 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-400" /> Conflicto de Reglas #{idx + 1}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono border border-amber-800">
                  Desempate por Jerarquía
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule A */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Regla A (Cedente / Residual)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      Prioridad {c.ruleA.priority}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-300">{c.ruleA.name}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{c.ruleA.fundamento}</p>
                </div>

                {/* Rule B (Winning) */}
                <div className="bg-emerald-950/30 border border-emerald-500/50 p-4 rounded-xl space-y-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Regla B (Prevalente Ganadora)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                      Prioridad {c.ruleB.priority} (Mayor Jerarquía)
                    </span>
                  </div>
                  <div className="text-sm font-bold text-emerald-300">{c.ruleB.name}</div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">{c.ruleB.fundamento}</p>
                </div>
              </div>

              {/* Resolution statement */}
              <div className="bg-slate-900/90 border border-amber-500/30 p-3.5 rounded-xl text-xs text-slate-300 flex items-start gap-3">
                <span className="font-bold text-amber-400 uppercase tracking-wider shrink-0 mt-0.5">
                  Criterio de Resolución:
                </span>
                <p className="leading-relaxed text-slate-200">{c.resolution}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* APPLIED RULES SECTION */}
      {(filterType === 'ALL' || filterType === 'DETERMINANTE') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Reglas Aplicadas en la Evaluación ({appliedRules.length})</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {determinantRules.length} Determinantes • {secondaryRules.length} Criterios Accesorios
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {appliedRules
              .filter(r => filterType === 'ALL' || (filterType === 'DETERMINANTE' && (r.status === 'DETERMINANTE' || r.priority <= 2)))
              .map((rule) => {
                const isDeterminant = rule.status === 'DETERMINANTE' || rule.priority <= 2;

                return (
                  <div
                    key={rule.id}
                    className={`rounded-xl border p-4.5 transition-all ${
                      isDeterminant
                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md hover:border-emerald-400'
                        : 'bg-sky-950/20 border-sky-600/30 hover:border-sky-500/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono uppercase tracking-wide border ${
                            isDeterminant
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                              : 'bg-sky-950 text-sky-300 border-sky-700'
                          }`}
                        >
                          {rule.id}
                        </span>
                        <h4
                          className={`text-sm font-bold ${
                            isDeterminant ? 'text-emerald-200' : 'text-sky-200'
                          }`}
                        >
                          {rule.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                            isDeterminant
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          }`}
                        >
                          {isDeterminant ? '★ Determinante / Causal Principal' : '✓ Requisito Accesorio'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          Prioridad {rule.priority}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                      <div className="lg:col-span-8 space-y-2">
                        <div className="text-slate-300 leading-relaxed">
                          {rule.description}
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                          <span className="font-bold text-slate-400">Contribución al Dictamen: </span>
                          <span>{rule.verdictContribution}</span>
                        </div>
                      </div>

                      <div className="lg:col-span-4 space-y-2 lg:border-l lg:border-slate-800 lg:pl-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                            Fundamento Normativo
                          </span>
                          <span className="font-semibold text-slate-300 font-mono text-[11px] block mt-0.5">
                            {rule.article}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                            Evidencias Vinculadas
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {rule.evidenceSource.map((ev, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300"
                              >
                                {ev}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* REJECTED RULES SECTION */}
      {(filterType === 'ALL' || filterType === 'DESCARTADA') && rejectedRules.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400/80" />
              <span>Reglas Evaluadas y Descartadas ({rejectedRules.length})</span>
            </h3>
            <span className="text-xs text-slate-500">
              No cumplieron las condiciones fácticas o de tiempo requeridas
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {rejectedRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 transition-all opacity-85 hover:opacity-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-400 border border-slate-700">
                      {rule.id}
                    </span>
                    <span className="text-xs font-bold text-slate-300 line-through-text">
                      {rule.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/50">
                      Descartada
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {rule.article}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 text-xs flex items-start gap-2 text-slate-400">
                  <span className="text-rose-400 font-bold shrink-0">Motivo de no aplicación:</span>
                  <span className="text-slate-300">{rule.reason || (rule as any).rejectionReason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REASONING LOG SECTION */}
      {(filterType === 'ALL' || filterType === 'REASONING') && reasoning.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Traza de Auditoría y Razonamiento Paso a Paso</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {reasoning.length} pasos documentados
            </span>
          </div>

          <div className="space-y-2.5">
            {reasoning.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed"
              >
                <span className="text-indigo-400 font-bold shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
