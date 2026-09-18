import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Gavel, Scale, Search, Target } from 'lucide-react';
import { DecisionResult } from '../../lib/decision-engine/types';

interface AnalysisFullViewProps {
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

const priorityLabels: Record<number, string> = {
  0: 'Elegibilidad',
  1: 'Actividad académica',
  2: 'Mystery shopper',
  3: 'Operativa / Decisiones 35-53',
  4: 'Promesa de venta',
  5: 'Inscripción / cambio ciclo',
  6: 'Contacto / ilocalizable',
  7: 'Fechas / solicitud / retención',
  8: 'Documentación'
};

export function AnalysisFullView({ result, onViewDecisionTree }: AnalysisFullViewProps) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 py-12 text-center text-zinc-500">
        <Scale className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
        <p className="text-lg font-medium text-zinc-400">Sin análisis disponible</p>
        <p className="mt-1 text-sm">Selecciona un caso para ejecutar el motor de decisiones.</p>
      </div>
    );
  }

  const appliedRules = result.appliedRules || [];
  const rejectedRules = result.rejectedRules || [];
  const missingEvidence = result.missingEvidence || [];
  const conflicts = result.conflicts || [];
  const reasoning = result.reasoning || [];
  const groupedApplied = groupByPriority(appliedRules);
  const groupedRejected = groupByPriority(rejectedRules);
  const determinantRules = appliedRules.filter(rule => rule.status === 'DETERMINANTE');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Análisis Normativo</h2>
          <p className="mt-1 text-sm text-zinc-500">Lectura compacta del motor; expande solo lo que necesites auditar.</p>
        </div>
        <button
          onClick={onViewDecisionTree}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-sky-500"
        >
          <Target className="h-4 w-4" />
          Árbol de decisión
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          icon={<Gavel className="h-4 w-4 text-emerald-400" />}
          label="Clasificación"
          value={classificationLabels[result.classification] || result.classification}
          tone={result.classification === 'REQUIERE_REVISION' ? 'warning' : 'success'}
        />
        <MetricCard icon={<Target className="h-4 w-4 text-sky-400" />} label="Confianza" value={`${Math.round(result.confidence * 100)}%`} />
        <MetricCard icon={<Scale className="h-4 w-4 text-amber-400" />} label="Causa raíz" value={result.rootCause.replace(/_/g, ' ').toLowerCase()} />
        <MetricCard icon={<Search className="h-4 w-4 text-rose-400" />} label="Faltantes" value={String(missingEvidence.length)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-bold text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Reglas aplicadas
              </h3>
              <span className="rounded-full bg-emerald-950/40 px-2 py-1 text-xs font-semibold text-emerald-300">{appliedRules.length}</span>
            </div>
            <RuleGroups groups={groupedApplied} tone="success" />
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-bold text-white">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Reglas descartadas
              </h3>
              <span className="rounded-full bg-amber-950/40 px-2 py-1 text-xs font-semibold text-amber-300">{rejectedRules.length}</span>
            </div>
            <RuleGroups groups={groupedRejected} tone="warning" />
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="font-bold text-white">Determinantes</h3>
            <div className="mt-3 space-y-2">
              {determinantRules.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin reglas determinantes.</p>
              ) : determinantRules.map(rule => (
                <div key={rule.id} className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3">
                  <p className="text-sm font-semibold text-white">{rule.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{rule.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="font-bold text-white">Pendientes</h3>
            <div className="mt-3 space-y-2">
              {missingEvidence.length === 0 ? (
                <p className="text-sm text-zinc-500">No hay evidencias faltantes.</p>
              ) : missingEvidence.map((item, index) => (
                <p key={index} className="rounded-xl border border-sky-900/60 bg-sky-950/20 p-3 text-sm text-sky-200">{item}</p>
              ))}
            </div>
          </section>

          {conflicts.length > 0 && (
            <section className="rounded-2xl border border-rose-900/70 bg-rose-950/20 p-4">
              <h3 className="font-bold text-white">Conflictos resueltos</h3>
              <div className="mt-3 space-y-2">
                {conflicts.map((conflict, index) => (
                  <details key={index} className="group rounded-xl border border-rose-900/60 bg-zinc-950/40 p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-rose-200">
                      Conflicto {index + 1}
                      <ChevronRight className="h-4 w-4 text-rose-300 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-2 text-xs text-zinc-400">{conflict.resolution}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-white">
          Razonamiento algorítmico
          <ChevronRight className="h-5 w-5 text-zinc-500 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-zinc-300">
          {reasoning.map((step, index) => (
            <p key={index} className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <span className="font-mono font-bold text-sky-400">{index + 1}</span>
              <span>{step}</span>
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}

function MetricCard({ icon, label, value, tone = 'neutral' }: { icon: ReactNode; label: string; value: string; tone?: 'neutral' | 'success' | 'warning' }) {
  const toneClass = tone === 'success'
    ? 'border-emerald-900/60 bg-emerald-950/20'
    : tone === 'warning'
      ? 'border-amber-900/60 bg-amber-950/20'
      : 'border-zinc-800 bg-zinc-900/60';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function RuleGroups({ groups, tone }: { groups: Record<number, any[]>; tone: 'success' | 'warning' }) {
  const entries = Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));

  if (entries.length === 0) {
    return <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-500">Sin registros.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([priority, rules], index) => (
        <details key={priority} className="group rounded-xl border border-zinc-800 bg-zinc-950/50 p-3" open={index === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className={`rounded-lg px-2 py-1 text-xs font-bold ${tone === 'success' ? 'bg-emerald-950/50 text-emerald-300' : 'bg-amber-950/50 text-amber-300'}`}>
              Nodo {priority}: {priorityLabels[Number(priority)] || 'Prioridad'}
            </span>
            <span className="ml-auto text-xs text-zinc-500">{rules.length} regla{rules.length === 1 ? '' : 's'}</span>
            <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {rules.map(rule => (
              <div key={rule.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                <p className="text-sm font-semibold text-white">{rule.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{rule.description || rule.reason}</p>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function groupByPriority<T extends { priority: number }>(rules: T[] = []) {
  return rules.reduce((acc, rule) => {
    if (!acc[rule.priority]) acc[rule.priority] = [];
    acc[rule.priority].push(rule);
    return acc;
  }, {} as Record<number, T[]>);
}
