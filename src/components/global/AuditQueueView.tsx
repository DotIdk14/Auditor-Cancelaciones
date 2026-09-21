import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  ShieldAlert,
  Flame,
  User,
  GraduationCap,
  Calendar,
  Layers,
  Inbox
} from 'lucide-react';
import { AuditCase } from '../../types/audit';

interface AuditQueueViewProps {
  cases: AuditCase[];
  onSelectCase: (c: AuditCase) => void;
}

export const AuditQueueView: React.FC<AuditQueueViewProps> = ({ cases, onSelectCase }) => {
  const [filter, setFilter] = useState<'ALL' | 'URGENT' | 'ANALYSIS' | 'APPROVED'>('ALL');

  // Categorize cases
  const queueCases = cases.map(c => {
    const days = c.daysFromStart ?? (c as any).daysSinceStart ?? 0;
    const isOverdue = days >= 18;
    const hasBlocker = c.dictamen?.classification === 'BAJA' && (c.decisionData?.calificaciones || false);
    const isUrgent = isOverdue || hasBlocker || c.status === 'EN_ANALISIS';

    return {
      ...c,
      days,
      isOverdue,
      hasBlocker,
      isUrgent
    };
  });

  const filtered = queueCases.filter(c => {
    if (filter === 'URGENT') return c.isUrgent && c.status !== 'APROBADO';
    if (filter === 'ANALYSIS') return c.status === 'EN_ANALISIS';
    if (filter === 'APPROVED') return c.status === 'APROBADO';
    return true;
  });

  return (
    <div id="audit-queue-view" className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              <Inbox className="w-5 h-5 text-zinc-400" />
              <span>Cola de Auditoría Priorizada</span>
            </h2>
            <span className="text-xs font-mono font-semibold bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded border border-zinc-700">
              {queueCases.filter(c => c.status !== 'APROBADO').length} pendientes
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Expedientes clasificados según el plazo normativo de 20 días de la Política de Deserción UTEL.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'ALL' ? 'bg-zinc-800 text-zinc-100 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({queueCases.length})
          </button>
          <button
            onClick={() => setFilter('URGENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === 'URGENT' ? 'bg-amber-950/80 text-amber-200 border border-amber-800/60 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Prioridad Alta</span>
          </button>
          <button
            onClick={() => setFilter('ANALYSIS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'ANALYSIS' ? 'bg-zinc-800 text-zinc-100 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            En Análisis
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'APPROVED' ? 'bg-zinc-800 text-zinc-100 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Aprobados
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelectCase(c)}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all cursor-pointer shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group"
          >
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono font-bold text-sm text-zinc-100 group-hover:text-white transition-colors">
                  {c.id}
                </span>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  {c.matricula}
                </span>
                <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                  {c.level}
                </span>
                {c.hasBlocker && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    Hard Blocker: Calificaciones
                  </span>
                )}
                {c.isOverdue && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800/60">
                    <Clock className="w-3 h-3 text-rose-400" />
                    SLA crítico ({c.days} días)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-zinc-200">{c.studentName}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400 truncate max-w-md">{c.program}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end md:self-center flex-shrink-0">
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  c.status === 'APROBADO'
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'APROBADO' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  {c.statusLabel}
                </span>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {c.days} días desde inicio
                </div>
              </div>

              <button
                className="p-2 text-zinc-400 group-hover:text-zinc-100 group-hover:bg-zinc-800 rounded-xl transition-all"
                title="Abrir expediente"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-xs text-zinc-500">
            No hay casos en este segmento de la cola de auditoría.
          </div>
        )}
      </div>
    </div>
  );
};
