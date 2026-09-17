import React from 'react';
import {
  User,
  GraduationCap,
  Calendar,
  ArrowLeft,
  MoreVertical,
  FileCheck2,
  Cpu,
  CheckSquare,
  FileText
} from 'lucide-react';
import { AuditCase } from '../../types/audit';

export type CaseTabType = 'summary' | 'evidences' | 'decision' | 'dictamen';

interface CaseHeaderProps {
  caseData: AuditCase;
  activeTab: CaseTabType;
  onSelectTab: (tab: CaseTabType) => void;
  onBackToCases: () => void;
}

export const CaseHeader: React.FC<CaseHeaderProps> = ({
  caseData,
  activeTab,
  onSelectTab,
  onBackToCases
}) => {
  if (!caseData) return null;
  const isApproved = caseData.status === 'APROBADO';

  return (
    <div id="case-header-card" className="bg-zinc-900 border-b border-zinc-800">
      {/* Top action row */}
      <div className="px-6 pt-4 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            id="btn-volver-a-casos"
            onClick={onBackToCases}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg transition-colors mr-1 shadow-2xs"
            title="Regresar a la lista de casos"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Casos</span>
          </button>

          <h1 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight font-mono">
            {caseData.id}
          </h1>

          <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
            isApproved
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
              : caseData.status === 'EN_ANALISIS'
              ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
              : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-zinc-400'}`}></span>
            {caseData.statusLabel}
          </span>

          <span className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded font-mono font-medium">
            {caseData.level}
          </span>
        </div>

        {/* Essential Student Identification */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-200 truncate max-w-[200px]" title={caseData.studentName}>
              {caseData.studentName}
            </span>
            <span className="font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              {caseData.matricula}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-zinc-800 text-[11px] text-zinc-400">
            <span className="truncate max-w-[200px]" title={caseData.program}>
              {caseData.program}
            </span>
            <span>•</span>
            <span className="font-mono">{caseData.channel}</span>
          </div>
        </div>
      </div>

      {/* Case Navigation Tabs: Resumen, Evidencias, Decisión, Dictamen */}
      <div className="px-6 flex items-center gap-2 border-t border-zinc-800 overflow-x-auto bg-zinc-950">
        {/* 1. Resumen */}
        <button
          id="case-tab-resumen"
          onClick={() => onSelectTab('summary')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'summary'
              ? 'border-zinc-200 text-zinc-100 bg-zinc-900 shadow-xs'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
          }`}
        >
          <FileText className={`w-3.5 h-3.5 ${activeTab === 'summary' ? 'text-zinc-200' : 'text-zinc-400'}`} />
          <span>Resumen</span>
        </button>

        {/* 2. Evidencias */}
        <button
          id="case-tab-evidencias"
          onClick={() => onSelectTab('evidences')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'evidences'
              ? 'border-zinc-200 text-zinc-100 bg-zinc-900 shadow-xs'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
          }`}
        >
          <FileCheck2 className={`w-3.5 h-3.5 ${activeTab === 'evidences' ? 'text-zinc-200' : 'text-zinc-400'}`} />
          <span>Evidencias</span>
          <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono border ${
            activeTab === 'evidences'
              ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
          }`}>
            {caseData.evidences?.length || 0}
          </span>
        </button>

        {/* 3. Decisión */}
        <button
          id="case-tab-decision"
          onClick={() => onSelectTab('decision')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'decision'
              ? 'border-zinc-200 text-zinc-100 bg-zinc-900 shadow-xs'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
          }`}
        >
          <Cpu className={`w-3.5 h-3.5 ${activeTab === 'decision' ? 'text-zinc-200' : 'text-zinc-400'}`} />
          <span>Decisión</span>
          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono border border-zinc-700">
            Motor Reglas
          </span>
        </button>

        {/* 4. Dictamen */}
        <button
          id="case-tab-dictamen"
          onClick={() => onSelectTab('dictamen')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'dictamen'
              ? 'border-zinc-200 text-zinc-100 bg-zinc-900 shadow-xs'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
          }`}
        >
          <CheckSquare className={`w-3.5 h-3.5 ${activeTab === 'dictamen' ? 'text-zinc-200' : 'text-zinc-400'}`} />
          <span>Dictamen</span>
          {isApproved && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>
      </div>
    </div>
  );
};
