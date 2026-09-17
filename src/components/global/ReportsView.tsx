import React from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Calendar,
  Users,
  ShieldCheck,
  Building
} from 'lucide-react';
import { AuditCase } from '../../types/audit';

interface ReportsViewProps {
  cases: AuditCase[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ cases }) => {
  const totalCases = cases.length;
  const approvedCases = cases.filter(c => c.status === 'APROBADO').length;
  const inAnalysisCases = cases.filter(c => c.status === 'EN_ANALISIS').length;

  const cancelacionesVenta = cases.filter(c => (c.dictamen?.classification || '').includes('CANCELACION')).length;
  const bajas = cases.filter(c => (c.dictamen?.classification || '').includes('BAJA')).length;
  const revisiones = totalCases - cancelacionesVenta - bajas;

  return (
    <div id="reports-view" className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
              Reportes Ejecutivos de Auditoría de Cancelaciones
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Consolidado de dictámenes, causales de deserción y efectividad de retención.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Expedientes</div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{totalCases}</div>
          <div className="text-[11px] text-zinc-500 mt-1">100% de la muestra activa</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Tasa de Aprobación</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {Math.round((approvedCases / (totalCases || 1)) * 100)}%
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">{approvedCases} dictámenes certificados</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Cancelaciones de Venta</div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{cancelacionesVenta}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Falla operativa o ilocalizable</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Bajas Académicas</div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{bajas}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Devengamiento de servicio</div>
        </div>
      </div>

      {/* Breakdown Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Distribución por Causa Raíz
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-zinc-300 font-medium mb-1">
                <span>Carga tardía de materias en aula virtual</span>
                <span className="font-bold font-mono">50%</span>
              </div>
              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-zinc-300 rounded-full w-1/2"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-zinc-300 font-medium mb-1">
                <span>Devengamiento de servicio (Calificaciones B1)</span>
                <span className="font-bold font-mono">25%</span>
              </div>
              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-zinc-400 rounded-full w-1/4"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-zinc-300 font-medium mb-1">
                <span>Agotamiento de protocolo de ilocalizable</span>
                <span className="font-bold font-mono">25%</span>
              </div>
              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-zinc-500 rounded-full w-1/4"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Cumplimiento de Ventana Normativa (20 Días Naturales)
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-200 block">Dentro del plazo de 20 días</span>
                <span className="text-[11px] text-zinc-500">Casos procedentes para resolución rápida</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 font-mono">75%</span>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-200 block">Exceden plazo de 20 días</span>
                <span className="text-[11px] text-zinc-500">Requieren análisis de devengamiento</span>
              </div>
              <span className="text-xs font-bold text-amber-400 font-mono">25%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
