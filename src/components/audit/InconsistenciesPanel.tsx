import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { Inconsistency } from '../../lib/audit/types';

interface InconsistenciesPanelProps {
  incidencias: Inconsistency[];
  onNavigateToEvidence?: (evidenceId: string) => void;
}

const impactIcons: Record<string, typeof AlertTriangle> = {
  BLOQUEANTE: AlertTriangle,
  RELEVANTE: AlertCircle,
  INFORMATIVO: Info,
};

const impactStyles: Record<string, string> = {
  BLOQUEANTE: 'border-red-800 bg-red-950/50 text-red-300',
  RELEVANTE: 'border-amber-800 bg-amber-950/50 text-amber-300',
  INFORMATIVO: 'border-sky-800 bg-sky-950/50 text-sky-300',
};

const impactBadge: Record<string, string> = {
  BLOQUEANTE: 'bg-red-900/60 border-red-700 text-red-300',
  RELEVANTE: 'bg-amber-900/60 border-amber-700 text-amber-300',
  INFORMATIVO: 'bg-sky-900/60 border-sky-700 text-sky-300',
};

const typeLabels: Record<string, string> = {
  CONTRADICCION_ENTRE_EVIDENCIAS: 'Contradicción entre evidencias',
  AMBIGUEDAD_NORMATIVA: 'Ambigüedad normativa',
  REFERENCIA_EXTERNA_NECESARIA: 'Referencia externa necesaria',
  EVIDENCIA_FALTANTE: 'Evidencia faltante',
  EVIDENCIA_ILEGIBLE: 'Evidencia ilegible',
  PROCESAMIENTO_INCOMPLETO: 'Procesamiento incompleto',
  RESULTADO_INCONSISTENTE: 'Resultado inconsistente',
};

export function InconsistenciesPanel({ incidencias, onNavigateToEvidence }: InconsistenciesPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (incidencias.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium text-sm">Sin incongruencias detectadas</span>
        </div>
      </div>
    );
  }

  const bloqueantes = incidencias.filter(i => i.impacto === 'BLOQUEANTE');
  const relevantes = incidencias.filter(i => i.impacto === 'RELEVANTE');
  const informativas = incidencias.filter(i => i.impacto === 'INFORMATIVO');

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h3 className="font-bold text-white">Incongruencias y puntos por revisar</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-amber-900/50 border border-amber-700 text-amber-300 text-xs font-bold">
          {incidencias.length}
        </span>
      </div>

      <div className="flex gap-2 text-xs">
        {bloqueantes.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-900/50 border border-red-700 text-red-300">
            {bloqueantes.length} bloqueante{bloqueantes.length > 1 ? 's' : ''}
          </span>
        )}
        {relevantes.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-900/50 border border-amber-700 text-amber-300">
            {relevantes.length} relevante{relevantes.length > 1 ? 's' : ''}
          </span>
        )}
        {informativas.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-sky-900/50 border border-sky-700 text-sky-300">
            {informativas.length} informativa{informativas.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {incidencias.map(inc => {
          const Icon = impactIcons[inc.impacto] || Info;
          const isOpen = expanded[inc.id] ?? false;

          return (
            <div key={inc.id} className={`rounded-xl border ${impactStyles[inc.impacto]}`}>
              <button
                onClick={() => toggle(inc.id)}
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-white/5 transition-colors"
              >
                {isOpen
                  ? <ChevronDown className="h-4 w-4 shrink-0" />
                  : <ChevronRight className="h-4 w-4 shrink-0" />
                }
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-medium text-sm flex-1">{inc.titulo}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${impactBadge[inc.impacto]}`}>
                  {inc.impacto}
                </span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-current/10">
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{inc.descripcion}</p>

                  {inc.resolucionRequerida && (
                    <div className="rounded-lg bg-zinc-950/50 border border-zinc-800 p-2">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Resolución requerida</p>
                      <p className="text-xs text-zinc-300">{inc.resolucionRequerida}</p>
                    </div>
                  )}

                  {inc.normaRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {inc.normaRefs.map(ref => (
                        <span key={ref} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                          §{ref}
                        </span>
                      ))}
                    </div>
                  )}

                  {inc.evidenceRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {inc.evidenceRefs.map(ref => (
                        <button
                          key={ref.evidenceId}
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToEvidence?.(ref.evidenceId);
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 text-[10px] transition-colors"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          {ref.evidenceId}{ref.page ? ` p.${ref.page}` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
