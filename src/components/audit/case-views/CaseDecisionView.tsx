import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ArrowRight,
  GitBranch,
  Layers,
  SlidersHorizontal,
  RotateCw,
  HelpCircle,
  Scale,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { DecisionResult, AppliedRule, RejectedRule, RuleConflict } from '../../../lib/decision-engine/types';
import { AuditCase } from '../../../types/audit';

interface CaseDecisionViewProps {
  decisionResult: DecisionResult;
  caseData: AuditCase;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onOpenDecisionTree: () => void;
  onModifyDecisionData: (key: string, value: any) => void;
  onNavigateToDictamen: () => void;
}

export const CaseDecisionView: React.FC<CaseDecisionViewProps> = ({
  decisionResult,
  caseData,
  isAnalyzing,
  onRunAnalysis,
  onOpenDecisionTree,
  onModifyDecisionData,
  onNavigateToDictamen
}) => {
  const [showSandbox, setShowSandbox] = useState(false);
  const [showSecondaryRules, setShowSecondaryRules] = useState(false);

  const appliedRules: AppliedRule[] = decisionResult?.reglasAplicadas || decisionResult?.appliedRules || [];
  const rejectedRules: RejectedRule[] = decisionResult?.reglasDescartadas || decisionResult?.rejectedRules || [];
  const conflicts: RuleConflict[] = decisionResult?.conflictos || decisionResult?.conflicts || [];
  const d = caseData?.decisionData;

  // Split applied rules: Determinant (high priority 1-2) vs Contextual
  const determinantRules = appliedRules.filter(r => r.status === 'DETERMINANTE' || r.priority <= 2);
  const secondaryRules = appliedRules.filter(r => r.status !== 'DETERMINANTE' && r.priority > 2);
  const hardBlockers = decisionResult?.hardBlockers || [];

  if (!d) return null;

  return (
    <div id="case-decision-view" className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header & Engine Status Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Dictamen Técnico del Motor de Reglas
              </span>
              <span className="text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                Motor Normativo v2.4
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-zinc-100 tracking-tight">
                {decisionResult.classificationName || decisionResult.classification}
              </h2>
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            </div>

            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              <span className="font-semibold text-zinc-300">Causa raíz:</span> {decisionResult.causaRaiz || 'Conforme a la reglamentación'}.
            </p>
          </div>

          {/* Quick Actions & Advance CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-re-eval-motor"
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors disabled:opacity-50"
              title="Re-ejecutar evaluación con parámetros actuales"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Evaluando...' : 'Re-evaluar'}</span>
            </button>

            <button
              id="btn-open-decision-tree"
              onClick={onOpenDecisionTree}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
              <span>Árbol de Decisión</span>
            </button>

            <button
              id="btn-decision-to-dictamen"
              onClick={onNavigateToDictamen}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-zinc-900 bg-zinc-100 hover:bg-white rounded-xl transition-all shadow-sm"
            >
              <span>Continuar a Dictamen Oficial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Confidence metric indicator */}
        <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-500">Nivel de Confianza:</span>
              <span className="font-bold text-zinc-200">
                {Math.round((decisionResult.confidence ?? 0.95) * 100)}%
              </span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-500">Reglas Determinantes:</span>
              <span className="font-bold text-zinc-200">{determinantRules.length}</span>
            </span>
            {conflicts.length > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {conflicts.length} conflicto{conflicts.length > 1 ? 's' : ''} resuelto{conflicts.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Reglamento General UTEL (Art. 5.7)
          </span>
        </div>
      </div>

      {/* 2. Hard Blockers Alert (if present) */}
      {hardBlockers.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Bloqueo Normativo Estricto (Hard Blocker)
            </h4>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              El alumno cuenta con calificaciones registradas en Bimestre 1 (Art. 5.7.d). Conforme a la reglamentación, el servicio se considera devengado, bloqueando cualquier cancelación de venta y forzando la clasificación a <strong className="text-amber-100 font-bold">BAJA</strong>.
            </p>
          </div>
        </div>
      )}

      {/* 3. Determinant Rules (Critical Legal Foundation) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-zinc-400" />
              <span>Reglas Normativas Determinantes</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Criterios reglamentarios que fundamentan la decisión del motor.
            </p>
          </div>
          <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
            {determinantRules.length} activas
          </span>
        </div>

        <div className="space-y-3">
          {determinantRules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-200 font-mono">
                    {rule.id}
                  </span>
                  <span className="text-xs text-zinc-400">• {rule.title}</span>
                </div>
                {rule.article && (
                  <span className="text-[11px] font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded font-mono">
                    {rule.article}
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {rule.description}
              </p>

              {rule.verdictContribution && (
                <div className="text-[11px] text-zinc-500">
                  Acción reglamentaria: <span className="text-zinc-400 font-semibold">{rule.verdictContribution}</span>
                </div>
              )}
            </div>
          ))}

          {determinantRules.length === 0 && (
            <div className="p-6 text-center text-xs text-zinc-500">
              No se activaron reglas determinantes de prioridad alta.
            </div>
          )}
        </div>
      </div>

      {/* 4. Conflict Resolution Panel (if any) */}
      {conflicts.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Resolución de Conflictos Normativos ({conflicts.length})</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Criterios de prelación aplicados cuando colisionan dos o más causales normativas.
          </p>

          <div className="space-y-2 pt-2">
            {conflicts.map((conf, idx) => (
              <div
                key={idx}
                className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-semibold text-zinc-300">
                  <span>Conflicto: {conf.ruleA?.name || 'Regla A'} vs {conf.ruleB?.name || 'Regla B'}</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Prevalece: {conf.selectedClassification}</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  <span className="font-semibold text-zinc-300">Razón jurídica:</span> {conf.resolution}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Progressive Disclosure: Sandbox de Simulación Normativa */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowSandbox(!showSandbox)}
          className="w-full p-5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <span>Simulador de Escenarios / Sandbox de Reglas</span>
                <span className="text-[10px] font-mono font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  Bajo Demanda
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Altere parámetros normativos para evaluar cómo cambiaría el dictamen en tiempo real.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{showSandbox ? 'Ocultar simulador' : 'Abrir simulador'}</span>
            {showSandbox ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showSandbox && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-950/40 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Carga de materias */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-200 block">Carga de materias</span>
                  <span className="text-[11px] text-zinc-500">¿Asignaturas cargadas a tiempo?</span>
                </div>
                <select
                  value={d.cargaMaterias}
                  onChange={(e) => onModifyDecisionData('cargaMaterias', e.target.value)}
                  className="text-xs font-semibold p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="A_TIEMPO">A tiempo</option>
                  <option value="DESTIEMPO">A destiempo</option>
                  <option value="NO_CARGADAS">No cargadas</option>
                </select>
              </div>

              {/* Contacto Efectivo */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-200 block">Contacto Efectivo</span>
                  <span className="text-[11px] text-zinc-500">¿Se contactó al titular?</span>
                </div>
                <input
                  type="checkbox"
                  checked={d.contactoEfectivo}
                  onChange={(e) => onModifyDecisionData('contactoEfectivo', e.target.checked)}
                  className="w-4 h-4 accent-zinc-500 cursor-pointer"
                />
              </div>

              {/* Calificaciones B1 */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-200 block">Calificaciones en B1</span>
                  <span className="text-[11px] text-zinc-500">Devengamiento (Hard Blocker)</span>
                </div>
                <input
                  type="checkbox"
                  checked={d.calificaciones}
                  onChange={(e) => onModifyDecisionData('calificaciones', e.target.checked)}
                  className="w-4 h-4 accent-zinc-500 cursor-pointer"
                />
              </div>

              {/* Falla Operativa */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-200 block">Falla Operativa</span>
                  <span className="text-[11px] text-zinc-500">Escolares / Finanzas / Plataforma</span>
                </div>
                <input
                  type="checkbox"
                  checked={d.fallaOperativa}
                  onChange={(e) => onModifyDecisionData('fallaOperativa', e.target.checked)}
                  className="w-4 h-4 accent-zinc-500 cursor-pointer"
                />
              </div>

              {/* Promesa de Venta */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-200 block">Promesa de Venta</span>
                  <span className="text-[11px] text-zinc-500">Información errónea comprobada</span>
                </div>
                <input
                  type="checkbox"
                  checked={d.promesaVenta}
                  onChange={(e) => onModifyDecisionData('promesaVenta', e.target.checked)}
                  className="w-4 h-4 accent-zinc-500 cursor-pointer"
                />
              </div>

              {/* Invasión de Ciclo */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-200 block">Invasión de Ciclo</span>
                  <span className="text-[11px] text-zinc-500">Sin grado previo acreditado</span>
                </div>
                <input
                  type="checkbox"
                  checked={d.invasionCiclo}
                  onChange={(e) => onModifyDecisionData('invasionCiclo', e.target.checked)}
                  className="w-4 h-4 accent-zinc-500 cursor-pointer"
                />
              </div>

              {/* Llamadas Realizadas */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-200 block">Llamadas Realizadas</span>
                  <span className="text-[11px] text-zinc-500">Meta protocolo: 15 llamadas</span>
                </div>
                <input
                  type="number"
                  value={d.llamadasRealizadas}
                  onChange={(e) => onModifyDecisionData('llamadasRealizadas', Number(e.target.value))}
                  className="w-16 p-1 text-center font-bold bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg"
                />
              </div>

              {/* Escritos Realizados */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-200 block">Escritos Realizados</span>
                  <span className="text-[11px] text-zinc-500">Meta protocolo: 6 escritos</span>
                </div>
                <input
                  type="number"
                  value={d.escritosRealizados}
                  onChange={(e) => onModifyDecisionData('escritosRealizados', Number(e.target.value))}
                  className="w-16 p-1 text-center font-bold bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Progressive Disclosure: Reglas Secundarias y Descartadas */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowSecondaryRules(!showSecondaryRules)}
          className="w-full p-5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <span>Reglas Secundarias y Descartadas</span>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  {secondaryRules.length} secundarias • {rejectedRules.length} descartadas
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Criterios de soporte que no determinaron la resolución o no cumplieron condición.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{showSecondaryRules ? 'Ocultar' : 'Ver detalle'}</span>
            {showSecondaryRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showSecondaryRules && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-950/40 space-y-4 animate-in fade-in duration-150 text-xs">
            {secondaryRules.length > 0 && (
              <div>
                <h5 className="font-bold text-zinc-300 mb-2">Reglas Secundarias Aplicadas</h5>
                <div className="space-y-2">
                  {secondaryRules.map(r => (
                    <div key={r.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-zinc-300">{r.id}</span> - {r.title}
                        <p className="text-[11px] text-zinc-500 mt-0.5">{r.description}</p>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">Prioridad {r.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rejectedRules.length > 0 && (
              <div className="pt-3 border-t border-zinc-800/80">
                <h5 className="font-bold text-zinc-300 mb-2">Reglas Descartadas por Condición</h5>
                <div className="space-y-2">
                  {rejectedRules.map((r, i) => (
                    <div key={i} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between opacity-80">
                      <div>
                        <span className="font-mono font-bold text-zinc-400">{r.id}</span> - {r.title}
                        <p className="text-[11px] text-zinc-500 mt-0.5">Motivo de descarte: {r.reason}</p>
                      </div>
                      <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        No aplicó
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
