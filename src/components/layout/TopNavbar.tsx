import React, { useState } from 'react';
import { Search, Bell, ChevronRight, CheckCircle2, SlidersHorizontal, BookOpen, Plus } from 'lucide-react';
import { AuditCase } from '../../types/audit';

interface TopNavbarProps {
  currentCase?: AuditCase;
  allCases: AuditCase[];
  onSelectCase: (caseItem: AuditCase) => void;
  onOpenPolicyDoc: () => void;
  onOpenAddCaseModal?: () => void;
  activeGlobalView?: string;
  activeCaseTab?: string;
  onNavigateGlobal?: (view: any) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentCase,
  allCases,
  onSelectCase,
  onOpenPolicyDoc,
  onOpenAddCaseModal,
  activeGlobalView = 'cases',
  activeCaseTab = 'summary',
  onNavigateGlobal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const safeCases = allCases || [];
  const filteredCases = safeCases.filter(c =>
    (c?.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c?.matricula || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c?.studentName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGlobalTitle = () => {
    switch (activeGlobalView) {
      case 'queue': return 'Cola de auditoría';
      case 'reports': return 'Reportes';
      case 'policies': return 'Políticas';
      case 'settings': return 'Configuración';
      case 'case_detail': return 'Casos';
      default: return 'Casos';
    }
  };

  const getCaseTabName = () => {
    switch (activeCaseTab) {
      case 'summary': return 'Resumen';
      case 'evidences': return 'Evidencias';
      case 'decision': return 'Decisión';
      case 'dictamen': return 'Dictamen';
      default: return 'Resumen';
    }
  };

  return (
    <header 
      id="top-navbar"
      className="h-16 bg-zinc-900 border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm"
    >
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
        <span 
          onClick={() => onNavigateGlobal && onNavigateGlobal('cases')} 
          className="hover:text-zinc-200 transition-colors cursor-pointer"
        >
          Auditoría
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        <span 
          onClick={() => onNavigateGlobal && onNavigateGlobal(activeGlobalView === 'case_detail' ? 'cases' : activeGlobalView)}
          className="hover:text-zinc-200 transition-colors cursor-pointer"
        >
          {getGlobalTitle()}
        </span>

        {activeGlobalView === 'case_detail' && currentCase && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-200 font-semibold bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 font-mono">
              {currentCase.id}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-300 font-medium">
              {getCaseTabName()}
            </span>
          </>
        )}
      </nav>

      {/* Center / Search Bar */}
      <div className="relative w-full max-w-lg mx-6">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
          <input
            id="case-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Buscar por CAVE, matrícula o nombre del alumno..."
            className="w-full bg-zinc-950 hover:bg-zinc-950/80 focus:bg-zinc-950 text-zinc-200 text-xs pl-9 pr-8 py-2 rounded-xl border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600 focus:outline-none transition-all placeholder:text-zinc-500"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 text-xs text-zinc-500 hover:text-zinc-300 px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Search Results */}
        {isSearchOpen && (
          <div 
            id="search-results-dropdown"
            className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
              <span>Casos disponibles en auditoría ({filteredCases.length})</span>
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Cerrar
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800">
              {filteredCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectCase(c);
                    setIsSearchOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left p-3 hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                    currentCase && c.id === currentCase.id ? 'bg-zinc-800 border-l-4 border-zinc-400' : ''
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-200 font-mono">{c.id}</span>
                      <span className="text-[11px] text-zinc-400 font-mono">Matrícula: {c.matricula}</span>
                      <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-medium border border-zinc-700">
                        {c.level}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-200 truncate mt-0.5">
                      {c.studentName}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {c.program} • Inicio: {c.startDate}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      c.status === 'APROBADO'
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                        : c.status === 'EN_ANALISIS'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}>
                      {c.statusLabel}
                    </span>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {c.dictamen?.classification || ''}
                    </div>
                  </div>
                </button>
              ))}
              {filteredCases.length === 0 && (
                <div className="p-4 text-center text-xs text-zinc-500">
                  No se encontraron casos con el término "{searchTerm}".
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Add new case button */}
        {onOpenAddCaseModal && (
          <button
            id="btn-add-new-case"
            onClick={onOpenAddCaseModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-white rounded-xl transition-colors shadow-xs"
            title="Registrar un nuevo caso para auditar"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Caso</span>
          </button>
        )}

        {/* Quick policy doc link */}
        <button
          id="btn-open-policy-guide"
          onClick={onOpenPolicyDoc}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-700"
          title="Ver Procedimiento Oficial de Deserción UTEL"
        >
          <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Política Deserción</span>
        </button>

        {/* Notifications */}
        <button 
          id="btn-notifications"
          className="relative p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
          title="Notificaciones de auditoría"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-zinc-400 rounded-full ring-2 ring-zinc-900"></span>
        </button>

        {/* Auditor Profile Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center border border-zinc-700">
            IJ
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-zinc-200 leading-tight">Ian Jarquín</div>
            <div className="text-[10px] text-zinc-500 font-medium">Auditor de Calidad</div>
          </div>
        </div>
      </div>
    </header>
  );
};
