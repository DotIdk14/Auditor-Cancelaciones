import { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Gavel, Scale, Target, TrendingUp } from 'lucide-react';
import { DecisionResult } from '../../lib/decision-engine/types';

interface CaseAnalysisProps {
  result: DecisionResult | null;
  onViewDecisionTree: () => void;
}

const classificationLabels: Record<string, string> = {
  CANCELACION_VENTA: 'Cancelación de Venta',
  CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE: 'Cancelación de Venta a Solicitud del Estudiante',
  CANCELACION_VENTA_ILOCALIZABLE: 'Cancelación de Venta por Ilocalizable',
  CANCELACION_VENTA_OPERATIVA: 'Cancelación de Venta Operativa',
  CANCELACION_VENTA_PROMESA_NO_CUMPLIDA: 'Cancelación de Venta por Promesa No Cumplida',
  CANCELACION_DE_MATRICULA: 'Cancelación de Matrícula (Mystery Shopper)',
  BAJA: 'Baja Definitiva',
  REQUIERE_REVISION: 'Requiere Revisión Manual'
};

export function CaseAnalysis({ result, onViewDecisionTree }: CaseAnalysisProps) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="text-center py-8 text-zinc-500">
          <Scale className="h-12 w-12 mx-auto text-zinc-700 mb-3" />
          <p className="font-medium text-zinc-400">Sin análisis disponible</p>
          <p className="text-xs mt-1">Selecciona un caso para ver el análisis</p>
        </div>
      </div>
    );
  }

  const appliedRules = result.appliedRules || [];
  const hardBlockers = result.hardBlockers || [];
  const conflicts = result.conflicts || [];
  const determinantRules = appliedRules.filter(r => r.status === 'DETERMINANTE');
  const confidencePercent = Math.round(result.confidence * 100);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white">Análisis Normativo</h3>
          <p className="text-xs text-zinc-500">Resumen del motor de decisiones</p>
        </div>
        <button
          onClick={onViewDecisionTree}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          aria-label="Ver árbol de decisión"
        >
          <Target className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-emerald-400" />
              <span className="font-medium text-white">Clasificación</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-bold">
              {classificationLabels[result.classification] || result.classification}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-sky-400" />
              <span className="font-medium text-white">Confianza</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <span className="text-sm font-bold text-emerald-400 w-10 text-right">{confidencePercent}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-4 w-4 text-amber-400" />
            <span className="font-medium text-white">Causa Raíz</span>
          </div>
          <p className="text-sm text-zinc-300 ml-6">{result.rootCause.replace(/_/g, ' ').toLowerCase()}</p>
        </div>

        {hardBlockers.length > 0 && (
          <div className="rounded-xl border border-rose-800 bg-rose-950/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span className="font-medium text-rose-300">Bloqueos Duros Detectados</span>
            </div>
            <ul className="ml-6 space-y-1 text-sm text-rose-200">
              {hardBlockers.map((blocker, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {blocker.replace(/_/g, ' ').toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="font-medium text-white">Reglas Determinantes</span>
          </div>
          {determinantRules.length === 0 ? (
            <p className="text-xs text-zinc-500 ml-6">Ninguna regla determinante aplicada</p>
          ) : (
            <ul className="ml-6 space-y-1 text-sm text-emerald-300">
              {determinantRules.slice(0, 3).map((rule, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {rule.title}
                </li>
              ))}
              {determinantRules.length > 3 && (
                <li className="text-xs text-zinc-500">+{determinantRules.length - 3} más</li>
              )}
            </ul>
          )}
        </div>

        {conflicts.length > 0 && (
          <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="font-medium text-amber-300">Conflictos Resueltos</span>
            </div>
            <p className="text-sm text-amber-200 ml-6">
              {conflicts.length} conflicto{conflicts.length > 1 ? 's' : ''} resuelto{conflicts.length > 1 ? 's' : ''} por precedencia normativa
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onViewDecisionTree}
        className="w-full py-2 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
      >
        <Target className="h-4 w-4" />
        <span>Ver Árbol de Decisión Completo</span>
      </button>
    </div>
  );
}
