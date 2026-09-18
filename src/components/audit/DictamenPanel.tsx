import { ReactNode, useState } from 'react';
import { CheckCircle2, AlertTriangle, Edit, Copy, ShieldCheck, FileText } from 'lucide-react';
import { DecisionResult } from '../../lib/decision-engine/types';

interface DictamenPanelProps {
  result: DecisionResult | null;
  onEdit: () => void;
  onApprove: () => void;
}

const classificationLabels: Record<string, string> = {
  CANCELACION_VENTA: 'Cancelación de Venta',
  CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE: 'Cancelación de Venta a Solicitud del Estudiante',
  CANCELACION_VENTA_ILOCALIZABLE: 'Cancelación de Venta por Ilocalizable',
  CANCELACION_VENTA_OPERATIVA: 'Cancelación de Venta Operativa',
  CANCELACION_VENTA_PROMESA_NO_CUMPLIDA: 'Cancelación de Venta por Promesa No Cumplida',
  CANCELACION_DE_MATRICULA: 'Cancelación de Matrícula (Mystery Shopper)',
  BAJA: 'Baja Definitiva',
  REQUIERE_REVISION: 'Requiere Revisión Manual'
};

export function DictamenPanel({ result, onEdit, onApprove }: DictamenPanelProps) {
  const [showFullText, setShowFullText] = useState(false);

  if (!result) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="text-center py-8 text-zinc-500">
          <FileText className="h-12 w-12 mx-auto text-zinc-700 mb-3" />
          <p className="font-medium text-zinc-400">Sin dictamen disponible</p>
          <p className="text-xs mt-1">Ejecuta el análisis para generar dictamen</p>
        </div>
      </div>
    );
  }

  const dictamenText = result.dictamenSugerido || 'Dictamen en elaboración...';
  const displayText = showFullText ? dictamenText : (dictamenText.length > 200 ? dictamenText.slice(0, 200) + '...' : dictamenText);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h3 className="font-bold text-white">Dictamen Sugerido</h3>
        </div>
        <span className="px-2 py-1 rounded-full bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-bold">
          {classificationLabels[result.classification] || result.classification}
        </span>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
        <p className="text-sm text-zinc-300 leading-relaxed">{displayText}</p>
        {dictamenText.length > 200 && (
          <button
            onClick={() => setShowFullText(!showFullText)}
            className="mt-2 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            {showFullText ? 'Mostrar menos' : 'Leer más'}
            <span className="inline-block transition-transform" style={{ transform: showFullText ? 'rotate(180deg)' : 'rotate(0)' }}>
              ▼
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
        <button
          onClick={onEdit}
          className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Edit className="h-4 w-4" />
          Editar
        </button>
        <button
          onClick={onApprove}
          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <CheckCircle2 className="h-4 w-4" />
          Aprobar
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Confianza: {Math.round(result.confidence * 100)}%
        </span>
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Art: {result.politicaArticulo || 'GDM_GAM_PRD_MLG_003'}
        </span>
      </div>
    </div>
  );
}