import React from 'react';
import {
  FolderOpen,
  Inbox,
  BarChart3,
  Scale,
  Settings,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { AuditCase } from '../../types/audit';

export type GlobalNavView = 'cases' | 'queue' | 'reports' | 'policies' | 'settings' | 'case_detail';

interface SidebarProps {
  activeView: GlobalNavView;
  onSelectView: (view: GlobalNavView) => void;
  currentCase?: AuditCase;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  currentCase
}) => {
  return (
    <aside 
      id="main-sidebar" 
      className="w-64 bg-zinc-950 text-zinc-300 flex flex-col flex-shrink-0 min-h-screen border-r border-zinc-800 select-none"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
            <span className="text-zinc-100 font-extrabold text-xl tracking-tighter">u</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-100 font-bold text-lg tracking-tight">utel</span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
            </div>
            <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
              UNIVERSIDAD
            </div>
          </div>
        </div>
      </div>

      {/* Global Navigation Menu */}
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
            Navegación Global
          </div>

          {/* 1. Casos */}
          <button 
            id="nav-casos"
            onClick={() => onSelectView('cases')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'cases' 
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-xs' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-zinc-400" />
            <span>Casos</span>
          </button>

          {/* 2. Cola de Auditoría */}
          <button 
            id="nav-cola-auditoria"
            onClick={() => onSelectView('queue')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'queue' 
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-xs' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Inbox className="w-4 h-4 text-zinc-400" />
            <span>Cola de auditoría</span>
          </button>

          {/* 3. Reportes */}
          <button 
            id="nav-reportes"
            onClick={() => onSelectView('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'reports' 
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-xs' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            <span>Reportes</span>
          </button>

          {/* 4. Políticas */}
          <button 
            id="nav-politicas"
            onClick={() => onSelectView('policies')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'policies' 
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-xs' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Scale className="w-4 h-4 text-zinc-400" />
            <span>Políticas</span>
          </button>

          {/* 5. Configuración */}
          <button 
            id="nav-configuracion"
            onClick={() => onSelectView('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'settings' 
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-xs' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>Configuración</span>
          </button>
        </div>

        {/* Active Case Indicator (Context Card) */}
        {currentCase && (
          <div className="pt-4 border-t border-zinc-800/80">
            <div className="px-3 pb-2 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
              Expediente en Turno
            </div>
            <div 
              onClick={() => onSelectView('case_detail')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                activeView === 'case_detail'
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-sm'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-zinc-200">
                  {currentCase.id}
                </span>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded border border-zinc-700">
                  {currentCase.level}
                </span>
              </div>
              <div className="text-xs font-semibold truncate mt-1 text-zinc-300">
                {currentCase.studentName}
              </div>
              <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                {currentCase.matricula} • {currentCase.statusLabel}
              </div>

              <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                <span>{activeView === 'case_detail' ? 'Auditoría en curso' : 'Abrir expediente'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between text-xs mb-3 text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Motor Normativo en línea
          </span>
          <span className="font-mono text-[11px] text-zinc-500">v2.4</span>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center border border-zinc-700">
            IJ
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-zinc-200 truncate">Ian Jarquín</div>
            <div className="text-[11px] text-zinc-500 truncate">Auditor de Calidad</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
