import React from 'react';
import {
  Settings,
  User,
  ShieldCheck,
  Cpu,
  Sliders,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div id="settings-view" className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
              Configuración del Sistema Auditor
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Parámetros de auditoría, preferencias del auditor y configuración del motor normativo.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-400" />
            <span>Perfil del Auditor</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">Nombre del Auditor</span>
              <span className="font-semibold text-zinc-200 mt-0.5 block">Ian Jarquín</span>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">Rol y Nivel de Certificación</span>
              <span className="font-semibold text-zinc-200 mt-0.5 block">Auditor de Calidad y Procesos (Nivel Senior)</span>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">Campus Principal</span>
              <span className="font-semibold text-zinc-200 mt-0.5 block">UTEL México (Virtual)</span>
            </div>
          </div>
        </div>

        {/* Regulatory Engine Config */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-400" />
            <span>Parámetros del Motor de Decisión</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-200 block">Versión del Motor</span>
                <span className="text-[11px] text-zinc-500">Pipeline de 6 etapas con cortocircuitos</span>
              </div>
              <span className="font-mono font-bold text-zinc-300 text-xs">v2.4 Jerárquico</span>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-200 block">Ventana Normativa Máxima</span>
                <span className="text-[11px] text-zinc-500">Días naturales para subsanación</span>
              </div>
              <span className="font-mono font-bold text-zinc-300 text-xs">20 días</span>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-200 block">Meta Protocolo Ilocalizable</span>
                <span className="text-[11px] text-zinc-500">Llamadas mínimas + Escritos</span>
              </div>
              <span className="font-mono font-bold text-zinc-300 text-xs">15 tel / 6 esc</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
