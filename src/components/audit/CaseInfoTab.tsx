import React from 'react';
import {
  User,
  GraduationCap,
  Calendar,
  PhoneCall,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  CreditCard,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { AuditCase } from '../../types/audit';

interface CaseInfoTabProps {
  currentCase: AuditCase;
  onModifyDecisionData: (key: string, value: any) => void;
}

export const CaseInfoTab: React.FC<CaseInfoTabProps> = ({
  currentCase,
  onModifyDecisionData
}) => {
  const d = currentCase?.decisionData;
  if (!d) return null;

  return (
    <div className="space-y-6">
      {/* Student & Academic Summary */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm p-6">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-zinc-300" />
          <span>Ficha General del Estudiante</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-400 font-medium block text-[11px]">Matrícula Oficial</span>
            <span className="font-bold text-zinc-200 font-mono text-sm">{currentCase.matricula}</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-400 font-medium block text-[11px]">Nombre Completo</span>
            <span className="font-bold text-zinc-200 text-sm">{currentCase.studentName}</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-400 font-medium block text-[11px]">Nivel Académico</span>
            <span className="font-bold text-zinc-200">{currentCase.level}</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 md:col-span-2">
            <span className="text-zinc-400 font-medium block text-[11px]">Programa de Estudio</span>
            <span className="font-bold text-zinc-200">{currentCase.program}</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-400 font-medium block text-[11px]">Canal de Venta</span>
            <span className="font-bold text-zinc-200 font-mono">{currentCase.channel}</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-400 font-medium block text-[11px]">Inicio de Ciclo Escolar</span>
            <span className="font-bold text-zinc-200 font-mono">{currentCase.startDate}</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-400 font-medium block text-[11px]">Fecha de Solicitud de Baja</span>
            <span className="font-bold text-zinc-200 font-mono">{currentCase.requestDate}</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-400 font-medium block text-[11px]">Días Transcurridos</span>
            <span className="font-bold text-zinc-200 font-mono">{currentCase.daysFromStart ?? (currentCase as any).daysSinceStart ?? 0} días naturales</span>
          </div>
        </div>
      </div>

      {/* Decision Engine Variables Matrix & Live Sandbox */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-300" />
              <span>Variables de Reglas de Auditoría (Entrada del Motor)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Modifique los parámetros para probar en tiempo real cómo el Árbol de Decisiones actualiza el dictamen
            </p>
          </div>
          <span className="text-[11px] font-semibold bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full border border-zinc-700">
            Modo Sandbox de Pruebas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Carga de materias */}
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-200 block">Carga de materias</span>
              <span className="text-[11px] text-zinc-500">¿Asignaturas cargadas a tiempo?</span>
            </div>
            <select
              value={d.cargaMaterias}
              onChange={(e) => onModifyDecisionData('cargaMaterias', e.target.value)}
              className="text-xs font-semibold p-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              <option value="A_TIEMPO">A tiempo</option>
              <option value="DESTIEMPO">A destiempo</option>
              <option value="NO_CARGADAS">No cargadas</option>
            </select>
          </div>

          {/* Contacto Efectivo */}
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-200 block">Contacto Efectivo</span>
              <span className="text-[11px] text-zinc-500">¿Se contactó al titular?</span>
            </div>
            <input
              type="checkbox"
              checked={d.contactoEfectivo}
              onChange={(e) => onModifyDecisionData('contactoEfectivo', e.target.checked)}
              className="w-4 h-4 accent-zinc-500 cursor-pointer"
            />
          </div>

          {/* Calificaciones B1 */}
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-200 block">Calificaciones en B1</span>
              <span className="text-[11px] text-zinc-500">Devengamiento de servicio</span>
            </div>
            <input
              type="checkbox"
              checked={d.calificaciones}
              onChange={(e) => onModifyDecisionData('calificaciones', e.target.checked)}
              className="w-4 h-4 accent-zinc-500 cursor-pointer"
            />
          </div>

          {/* Falla Operativa */}
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-200 block">Falla Operativa</span>
              <span className="text-[11px] text-zinc-500">Escolares / Finanzas / Cobranza</span>
            </div>
            <input
              type="checkbox"
              checked={d.fallaOperativa}
              onChange={(e) => onModifyDecisionData('fallaOperativa', e.target.checked)}
              className="w-4 h-4 accent-zinc-500 cursor-pointer"
            />
          </div>

          {/* Promesa de Venta */}
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-200 block">Promesa de Venta</span>
              <span className="text-[11px] text-zinc-500">Información errónea comprobada</span>
            </div>
            <input
              type="checkbox"
              checked={d.promesaVenta}
              onChange={(e) => onModifyDecisionData('promesaVenta', e.target.checked)}
              className="w-4 h-4 accent-zinc-500 cursor-pointer"
            />
          </div>

          {/* Invasión de Ciclo */}
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-200 block">Invasión de Ciclo</span>
              <span className="text-[11px] text-zinc-500">Sin grado académico previo</span>
            </div>
            <input
              type="checkbox"
              checked={d.invasionCiclo}
              onChange={(e) => onModifyDecisionData('invasionCiclo', e.target.checked)}
              className="w-4 h-4 accent-zinc-500 cursor-pointer"
            />
          </div>

          {/* Llamadas Realizadas */}
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-200 block">Llamadas Realizadas</span>
              <span className="text-[11px] text-zinc-500">Meta política: 15 llamadas</span>
            </div>
            <input
              type="number"
              value={d.llamadasRealizadas}
              onChange={(e) => onModifyDecisionData('llamadasRealizadas', Number(e.target.value))}
              className="w-16 p-1 text-center font-bold bg-zinc-900 border border-zinc-700 text-zinc-200 rounded"
            />
          </div>

          {/* Escritos Realizados */}
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-200 block">Escritos Realizados</span>
              <span className="text-[11px] text-zinc-500">Meta política: 6 escritos</span>
            </div>
            <input
              type="number"
              value={d.escritosRealizados}
              onChange={(e) => onModifyDecisionData('escritosRealizados', Number(e.target.value))}
              className="w-16 p-1 text-center font-bold bg-zinc-900 border border-zinc-700 text-zinc-200 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
