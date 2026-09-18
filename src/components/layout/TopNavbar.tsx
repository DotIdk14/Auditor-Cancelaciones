import { ReactNode } from 'react';
import { ShieldCheck, Plus, Search, ChevronDown, FileSearch, Bell, Settings, Menu, Home, ArrowLeft, Download } from 'lucide-react';
import { AuditCase } from '../../types/audit';

interface TopNavbarProps {
  cases: AuditCase[];
  selectedCase: AuditCase | null;
  onCaseSelect: (id: string) => void;
  onAddCase: (newCase: AuditCase) => void;
  onOpenAddCase: () => void;
  onOpenPolicy: () => void;
  activeView: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onGoHome?: () => void;
}

export function TopNavbar({
  cases,
  selectedCase,
  onCaseSelect,
  onAddCase,
  onOpenAddCase,
  onOpenPolicy,
  activeView,
  isSidebarCollapsed,
  onToggleSidebar,
  onGoHome
}: TopNavbarProps) {
  const viewLabels: Record<string, string> = {
    search: 'Búsqueda',
    audit: 'Auditoría',
    evidence: 'Evidencias',
    analysis: 'Análisis',
    dictamen: 'Dictamen'
  };

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="mx-auto max-w-full px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {onGoHome && activeView !== 'search' && (
              <button
                onClick={onGoHome}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-colors"
                aria-label="Volver al listado de auditorías"
              >
                <Home className="h-5 w-5" />
              </button>
            )}

            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                aria-label="Abrir menú lateral"
              >
                <Menu className="h-6 w-6" />
              </button>
            )}

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="search"
                  placeholder="Buscar expedientes..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  aria-label="Buscar expedientes"
                />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                {viewLabels[activeView] || activeView}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onOpenPolicy}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-colors"
              aria-label="Ver política oficial"
            >
              <ShieldCheck className="h-5 w-5" />
            </button>

            <button
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-colors relative"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[10px] font-bold flex items-center justify-center">3</span>
            </button>

            <button
              onClick={onOpenAddCase}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Caso</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}