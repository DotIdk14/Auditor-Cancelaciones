import { ReactNode, useState } from 'react';
import {
  Search,
  Headphones,
  FileText,
  Gavel,
  Scale,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export type ViewMode = 'search' | 'audit' | 'evidence' | 'analysis' | 'dictamen';

interface SidebarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  casesCount: number;
  casesInReview: number;
  onToggleCollapse?: () => void;
  collapsed?: boolean;
}

const viewItems: { id: ViewMode; label: string; icon: ReactNode; description: string }[] = [
  { id: 'search', label: 'Búsqueda', icon: <Search className="h-5 w-5" />, description: 'Listado y filtrado de expedientes' },
  { id: 'audit', label: 'Auditoría', icon: <Headphones className="h-5 w-5" />, description: 'Reproducción y diarización de llamadas' },
  { id: 'evidence', label: 'Evidencias', icon: <FileText className="h-5 w-5" />, description: 'Repositorio documental probatorio' },
  { id: 'analysis', label: 'Análisis', icon: <Scale className="h-5 w-5" />, description: 'Motor normativo y reglas aplicadas' },
  { id: 'dictamen', label: 'Dictamen', icon: <Gavel className="h-5 w-5" />, description: 'Dictamen oficial y certificación' }
];

export function Sidebar({ activeView, onViewChange, casesCount, casesInReview, onToggleCollapse, collapsed = false }: SidebarProps) {
  const [showProfile, setShowProfile] = useState(false);

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-16 bottom-0 w-16 bg-zinc-950/95 border-r border-zinc-800 z-40 flex flex-col transition-all duration-300">
        <nav className="flex-1 px-2 py-4 space-y-2" aria-label="Navegación principal colapsada">
          {viewItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full h-12 rounded-xl flex items-center justify-center transition-all ${
                activeView === item.id
                  ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
              aria-current={activeView === item.id ? 'page' : undefined}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </nav>
        <button
          onClick={onToggleCollapse}
          className="p-2 mx-2 rounded-xl hover:bg-zinc-800 text-zinc-400 transition-colors"
          aria-label="Expandir sidebar"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-72 bg-zinc-950/95 border-r border-zinc-800 z-40 flex flex-col transition-all duration-300">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Módulos del Auditor
        </h2>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navegación principal">
        {viewItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full rounded-xl p-3 text-left transition-all flex items-center gap-3 ${
              activeView === item.id
                ? 'bg-emerald-950/50 border border-emerald-800 text-white'
                : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
            }`}
            aria-current={activeView === item.id ? 'page' : undefined}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              activeView === item.id ? 'bg-emerald-950/50 text-emerald-400' : 'bg-zinc-900 text-zinc-400'
            }`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              <p className="text-xs text-zinc-500 truncate">{item.description}</p>
            </div>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-3">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900">
          <div className="w-10 h-10 rounded-full bg-emerald-950/50 flex items-center justify-center">
            <User className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Auditor Principal</p>
            <p className="text-xs text-zinc-500">Calidad y Normativa</p>
          </div>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="text-zinc-400 hover:text-white p-1"
            aria-expanded={showProfile}
            aria-label="Menú de usuario"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showProfile ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showProfile && (
          <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
            <button className="w-full rounded-lg p-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </button>
            <button className="w-full rounded-lg p-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-800">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Resumen de expedientes</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-zinc-900 p-3">
              <p className="text-2xl font-bold text-white">{casesCount}</p>
              <p className="text-xs text-zinc-500">Total expedientes</p>
            </div>
            <div className="rounded-lg bg-zinc-900 p-3">
              <p className="text-2xl font-bold text-amber-400">{casesInReview}</p>
              <p className="text-xs text-zinc-500">En revisión</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}