import { ReactNode } from 'react';
import { X, CheckCircle2, AlertTriangle, ChevronRight, Scale, Target, Search } from 'lucide-react';
import { DecisionResult, RuleConflict } from '../../lib/decision-engine/types';

interface DecisionTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DecisionResult | null;
}

const nodeData = [
  { id: 'n0', label: 'NODO 0\nElegibilidad\nDatos mínimos', priority: 0, type: 'decision' },
  { id: 'n1', label: 'NODO 1\nActividad Académica\nCalificaciones', priority: 1, type: 'blocker' },
  { id: 'n2', label: 'NODO 2\nMystery Shopper\nCanal evaluador', priority: 2, type: 'decision' },
  { id: 'n3', label: 'NODO 3\nOperativa / Dec 35/53\nCarga tardía, finanzas', priority: 3, type: 'decision' },
  { id: 'n4', label: 'NODO 4\nPromesa de Venta\nPromesa no cumplida', priority: 4, type: 'decision' },
  { id: 'n5', label: 'NODO 5\nError Inscripción\nCambio de ciclo', priority: 5, type: 'decision' },
  { id: 'n6', label: 'NODO 6\nContacto / Ilocalizable\n15 llamadas + 6 escritos', priority: 6, type: 'decision' },
  { id: 'n7', label: 'NODO 7\nFechas / Solicitud / Retención\nVentana 10 días', priority: 7, type: 'decision' },
  { id: 'n8', label: 'NODO 8\nDocumentación\nExpediente completo', priority: 8, type: 'decision' },
];

const classificationOutcomes = [
  { id: 'c1', label: 'CANCELACIÓN VENTA\nOPERATIVA', color: 'bg-sky-950/50 border-sky-800 text-sky-300' },
  { id: 'c2', label: 'CANCELACIÓN VENTA\nILOCALIZABLE', color: 'bg-amber-950/50 border-amber-800 text-amber-300' },
  { id: 'c3', label: 'CANCELACIÓN VENTA\nPROMESA NO CUMPLIDA', color: 'bg-rose-950/50 border-rose-800 text-rose-300' },
  { id: 'c4', label: 'CANCELACIÓN VENTA\nSOLICITUD ESTUDIANTE', color: 'bg-emerald-950/50 border-emerald-800 text-emerald-300' },
  { id: 'c5', label: 'BAJA DEFINITIVA', color: 'bg-zinc-950/50 border-zinc-800 text-zinc-300' },
  { id: 'c6', label: 'REQUIERE REVISIÓN', color: 'bg-amber-950/50 border-amber-800 text-amber-300' },
];

export function DecisionTreeModal({ isOpen, onClose, result }: DecisionTreeModalProps) {
  if (!isOpen) return null;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const getNodeStatus = (nodeId: string) => {
    if (!result) return 'pending';
    const appliedRule = result.appliedRules.find(r => r.priority === parseInt(nodeId.replace('n', '')));
    if (appliedRule) return appliedRule.status === 'DETERMINANTE' ? 'determinante' : 'cumplida';
    const rejectedRule = result.rejectedRules.find(r => r.priority === parseInt(nodeId.replace('n', '')));
    if (rejectedRule) return 'descartada';
    return 'pending';
  };

  const getOutcomeStatus = (outcomeId: string) => {
    if (!result) return 'inactive';
    const classificationMap: Record<string, string> = {
      c1: 'CANCELACION_VENTA_OPERATIVA',
      c2: 'CANCELACION_VENTA_ILOCALIZABLE',
      c3: 'CANCELACION_VENTA_PROMESA_NO_CUMPLIDA',
      c4: 'CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE',
      c5: 'BAJA',
      c6: 'REQUIERE_REVISION'
    };
    return result.classification === classificationMap[outcomeId] ? 'selected' : 'inactive';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200" onKeyDown={handleKeyDown}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-5xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-sky-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Árbol de Decisión Normativo</h3>
              <p className="text-xs text-zinc-500">Flujo de evaluación jerárquica por prioridades</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-8">
          <div className="space-y-4">
            {nodeData.map((node, index) => {
              const status = getNodeStatus(node.id);
              const isLast = index === nodeData.length - 1;
              
              return (
                <div key={node.id} className="flex items-start gap-4 relative">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-40 px-3 py-4 rounded-xl text-center text-sm font-medium transition-all ${
                      status === 'determinante' ? 'bg-emerald-950/50 border-2 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20' :
                      status === 'cumplida' ? 'bg-sky-950/50 border border-sky-800 text-sky-300' :
                      status === 'descartada' ? 'bg-amber-950/50 border border-amber-800 text-amber-300' :
                      'bg-zinc-900/50 border border-zinc-800 text-zinc-500'
                    }`}>
                      {node.label}
                    </div>
                    {!isLast && (
                      <div className={`w-px h-12 mt-1 ${status === 'determinante' ? 'bg-emerald-500' : status === 'cumplida' ? 'bg-sky-500' : status === 'descartada' ? 'bg-amber-500' : 'bg-zinc-800'}`} />
                    )}
                  </div>
                  <div className="flex-1 pt-2 space-y-1 text-xs text-zinc-500">
                    <p className="font-medium text-zinc-400">Prioridad: {node.priority}</p>
                    <p>Tipo: {node.type === 'blocker' ? 'Bloqueo Duro (Hard Blocker)' : 'Decisión Normativa'}</p>
                    {status === 'determinante' && <p className="text-emerald-400">✓ DETERMINANTE - Corta evaluación</p>}
                    {status === 'cumplida' && <p className="text-sky-400">✓ CUMPLIDA - Suma a clasificación</p>}
                    {status === 'descartada' && <p className="text-amber-400">✗ DESCARTADA - Condiciones no cumplidas</p>}
                    {status === 'pending' && <p className="text-zinc-500">⏳ Pendiente de evaluación</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-400" />
              Resultados Posibles (Clasificaciones Finales)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {classificationOutcomes.map(outcome => {
                const status = getOutcomeStatus(outcome.id);
                return (
                  <div
                    key={outcome.id}
                    className={`p-4 rounded-xl text-center transition-all ${outcome.color} ${status === 'selected' ? 'ring-2 ring-emerald-500 scale-105 shadow-lg shadow-emerald-500/20' : ''}`}
                  >
                    <p className="font-bold text-sm">{outcome.label}</p>
                    {status === 'selected' && (
                      <div className="mt-2 flex items-center justify-center gap-1 text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">SELECCIONADA</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {result && result.conflicts && result.conflicts.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                Conflictos Detectados y Resueltos
              </h4>
              <div className="space-y-3">
                {result.conflicts.map((conflict, index) => (
                  <div key={index} className="rounded-xl border border-rose-800/50 bg-rose-950/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 rounded bg-rose-950 text-rose-300 text-xs font-bold">CONFLICTO {index + 1}</span>
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-xs">Resuelto por precedencia normativa</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="rounded-lg bg-zinc-900/50 p-3">
                        <p className="text-xs font-bold text-rose-300 mb-1">Regla A (Perdedora)</p>
                        <p className="font-medium text-white">{conflict.ruleA.name}</p>
                        <p className="text-sm text-zinc-400">{conflict.ruleA.classification}</p>
                        <p className="text-xs text-zinc-500 mt-1">Prioridad: {conflict.ruleA.priority}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <ChevronRight className="h-6 w-6 text-rose-400" />
                      </div>
                      <div className="rounded-lg bg-zinc-900/50 p-3">
                        <p className="text-xs font-bold text-emerald-300 mb-1">Regla B (Ganadora)</p>
                        <p className="font-medium text-white">{conflict.ruleB.name}</p>
                        <p className="text-sm text-zinc-400">{conflict.ruleB.classification}</p>
                        <p className="text-xs text-zinc-500 mt-1">Prioridad: {conflict.ruleB.priority}</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-rose-950/30 p-3 border border-rose-800/50">
                      <p className="text-xs font-bold text-rose-300 mb-1">Resolución</p>
                      <p className="text-sm text-rose-200">{conflict.resolution}</p>
                      <p className="text-xs text-rose-400 mt-1">Clasificación final: {conflict.selectedClassification}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && result.missingEvidence.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-sky-400" />
                Evidencias Faltantes
              </h4>
              <div className="rounded-xl border border-sky-800/50 bg-sky-950/20 p-4">
                <ul className="space-y-2">
                  {result.missingEvidence.map((ev, i) => (
                    <li key={i} className="flex items-center gap-2 text-sky-300">
                      <span className="h-2 w-2 rounded-full bg-sky-400 flex-shrink-0" />
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}