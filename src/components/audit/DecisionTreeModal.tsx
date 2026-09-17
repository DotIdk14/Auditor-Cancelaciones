import React from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitFork,
  ArrowDown,
  Layers,
  ShieldCheck,
  Award
} from 'lucide-react';
import { DecisionResult } from '../../lib/decision-engine/types';
import { CaseDecisionData } from '../../lib/decision-engine/types';

interface DecisionTreeModalProps {
  decisionResult: DecisionResult;
  decisionData: CaseDecisionData;
  onClose: () => void;
}

export const DecisionTreeModal: React.FC<DecisionTreeModalProps> = ({
  decisionResult,
  decisionData,
  onClose
}) => {
  if (!decisionData) return null;
  const conflicts = decisionResult?.conflictos || decisionResult?.conflicts || [];
  const priorities = [
    {
      level: 1,
      title: 'Prioridad 1: Calificaciones y Devengamiento (Art. 5.7.d)',
      evaluation: decisionData.calificaciones 
        ? 'Cumplida (Forzó Baja Definitiva)' 
        : 'Descartada (Sin calificaciones registradas)',
      passed: !decisionData.calificaciones,
      notes: 'Si el alumno tiene calificaciones en Bimestre 1 o inicial, por ningún motivo aplica cancelación de venta.'
    },
    {
      level: 2,
      title: 'Prioridad 2: Reglas Especiales de Política (Art. 5.7.c / 5.10)',
      evaluation: decisionData.canalVenta?.includes('Mystery') 
        ? 'Mystery Shopper detectado' 
        : decisionData.invasionCiclo 
        ? 'Invasión de Ciclo sin Grado Previo' 
        : 'Descartada (Canal regular sin invasión)',
      passed: !decisionData.canalVenta?.includes('Mystery') && !decisionData.invasionCiclo,
      notes: 'Mystery Shopper genera cancelación de matrícula sin impacto en KPI. Invasión de ciclo genera cancelación.'
    },
    {
      level: 3,
      title: 'Prioridad 3: Errores Operativos Institucionales (Art. 5.9)',
      evaluation: decisionResult.tipo === 'CANCELACION_VENTA_OPERATIVA' 
        ? 'Cumplida (Determinante para Cancelación Operativa)' 
        : 'Sin errores operativos concluyentes',
      passed: decisionResult.tipo === 'CANCELACION_VENTA_OPERATIVA',
      notes: 'Falla en carga de materias, errores de finanzas/cobranza o falta de canalización formal a Éxito Estudiantil.'
    },
    {
      level: 4,
      title: 'Prioridad 4: Promesa de Venta No Cumplida (Art. 5.6)',
      evaluation: decisionData.promesaVenta 
        ? 'Cumplida (Información engañosa acreditada)' 
        : 'Descartada (Speech conforme a política)',
      passed: decisionData.promesaVenta,
      notes: 'Oferta falsa, tendenciosa o discrepante con el programa curricular.'
    },
    {
      level: 5,
      title: 'Prioridad 5: Error de Inscripción / Ajustes en 20 Días (Art. 5.5)',
      evaluation: decisionData.errorInscripcion && !decisionData.ajusteRealizado
        ? 'Cumplida (Ajuste no aplicado en plazo)' 
        : 'Descartada (Inscripción correcta o ajuste realizado)',
      passed: Boolean(decisionData.errorInscripcion && !decisionData.ajusteRealizado),
      notes: 'Programa, paquete, ciclo o campus incorrecto no resuelto en 20 días hábiles.'
    },
    {
      level: 6,
      title: 'Prioridad 6: Estudiante Ilocalizable (Art. 5.2 / 5.8)',
      evaluation: decisionResult.tipo === 'CANCELACION_VENTA_ILOCALIZABLE'
        ? 'Cumplida (15 llamadas + 6 escritos + sin actividad)'
        : 'Descartada (Hubo contacto efectivo o actividad)',
      passed: decisionResult.tipo === 'CANCELACION_VENTA_ILOCALIZABLE',
      notes: 'Requiere agotar 15 llamadas (2/día en horas distintas), 6 escritos y sin actividad académica.'
    },
    {
      level: 7,
      title: 'Prioridad 7: Regla Residual por Fecha (Art. 5.3)',
      evaluation: 'Evaluada como norma residual',
      passed: true,
      notes: 'Solicitud previa al inicio = Cancelación regular. Solicitud posterior = Proceso de retención / Baja.'
    }
  ];

  return (
    <div 
      id="decision-tree-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Árbol de Decisiones y Jerarquía de Reglas
              </h3>
              <p className="text-xs text-slate-400">
                Basado en el Procedimiento de Deserción de Estudiantes UTEL (GDM_GAM_PRD_MLG_003)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Proposition Card */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-bold text-sky-400 tracking-wider">
                Dictamen Técnico Determinado
              </div>
              <div className="text-lg font-black text-slate-100 mt-0.5">
                {decisionResult.classificationName}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Causa raíz: <span className="font-semibold text-slate-200">{decisionResult.causaRaiz}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-sky-400 font-mono">
                {decisionResult.confidence}%
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Índice de Confianza</div>
            </div>
          </div>

          {/* Conflict Analysis Section (Requested by user) */}
          {conflicts.length > 0 && (
            <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Resolución Explícita de Conflicto de Reglas</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-slate-900 p-3.5 rounded-xl border border-amber-900/60">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Regla A (Residual)</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {conflicts[0].ruleA.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {conflicts[0].ruleA.fundamento}
                  </div>
                </div>

                <div className="bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-800/80">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase">Regla B (Prevalente)</div>
                  <div className="text-xs font-bold text-emerald-200 mt-0.5">
                    {conflicts[0].ruleB.name}
                  </div>
                  <div className="text-xs text-emerald-300 mt-1">
                    {conflicts[0].ruleB.fundamento}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-amber-200 bg-amber-950/70 p-2.5 rounded-lg border border-amber-800/60 leading-relaxed">
                <strong>Resolución del Motor: </strong>
                {conflicts[0].resolution}
              </p>
            </div>
          )}

          {/* Step-by-Step Priority Evaluation */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Evaluación Secuencial por Nivel de Prioridad
            </h4>
            <div className="space-y-3">
              {priorities.map((p) => (
                <div 
                  key={p.level}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    p.level === decisionResult.prioridadRegla
                      ? 'bg-sky-950/50 border-sky-600 ring-1 ring-sky-500/40'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        p.level === decisionResult.prioridadRegla
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {p.level}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{p.title}</span>
                    </div>

                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      p.level === decisionResult.prioridadRegla
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {p.evaluation}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1.5 pl-8">
                    {p.notes}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Reasoning Transcript */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Bitácora de Razonamiento del Motor
            </h4>
            <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-1.5 leading-relaxed border border-slate-800">
              {decisionResult.reasoning.map((r, i) => (
                <div key={i} className="text-emerald-400">
                  <span className="text-slate-500 mr-2">[{i + 1}]</span>
                  {r}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            Entendido, cerrar análisis
          </button>
        </div>
      </div>
    </div>
  );
};
