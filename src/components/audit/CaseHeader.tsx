import { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Gavel,
  Headphones,
  Scale,
  Search,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { AuditCase, CaseStatus } from '../../types/audit';

interface CaseHeaderProps {
  caseData: AuditCase;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPreviousCase: () => void;
  onNextCase: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  tabs: { id: string; label: string }[];
}

const statusConfig: Record<CaseStatus, { color: string; bg: string; border: string; icon: ReactNode; label: string }> = {
  EN_ANALISIS: { color: 'text-sky-400', bg: 'bg-sky-950/30', border: 'border-sky-800', icon: <Clock3 className="h-3.5 w-3.5" />, label: 'En análisis' },
  PENDIENTE_REVISION: { color: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-800', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Revisión pendiente' },
  DICTAMINADO: { color: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-800', icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Dictaminado' },
  APROBADO: { color: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-800', icon: <FileCheck className="h-3.5 w-3.5" />, label: 'Aprobado' },
  RECHAZADO: { color: 'text-rose-400', bg: 'bg-rose-950/30', border: 'border-rose-800', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Rechazado' }
};

const tabIcons: Record<string, ReactNode> = {
  summary: <FileText className="h-4 w-4" />,
  call: <Headphones className="h-4 w-4" />,
  evidences: <Search className="h-4 w-4" />,
  analysis: <Scale className="h-4 w-4" />,
  dictamen: <Gavel className="h-4 w-4" />
};

export function CaseHeader({
  caseData,
  activeTab,
  onTabChange,
  onPreviousCase,
  onNextCase,
  hasPrevious,
  hasNext,
  tabs
}: CaseHeaderProps) {
  const config = statusConfig[caseData.status] || statusConfig.EN_ANALISIS;

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/50 px-4 py-3 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onPreviousCase}
              disabled={!hasPrevious}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Caso anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-emerald-400">{caseData.id}</p>
              <h2 className="mt-0.5 text-lg font-bold text-white truncate">{caseData.studentName}</h2>
            </div>
            <button
              onClick={onNextCase}
              disabled={!hasNext}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Caso siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 ml-2 xl:ml-4 pt-2 xl:pt-0 border-l xl:border-l-0 xl:border-t-0 border-zinc-800">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${config.bg} border ${config.border}`}>
              {config.icon}
              <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
            </div>

            <div className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Política: {caseData.requestedPolicy}</span>
            </div>

            <div className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400">
              <FileText className="h-3.5 w-3.5 text-sky-400" />
              <span>Matrícula: {caseData.matricula}</span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end" role="tablist" aria-label="Secciones del expediente">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
                  : 'bg-zinc-900/50 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tabIcons[tab.id] || <FileText className="h-4 w-4" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
