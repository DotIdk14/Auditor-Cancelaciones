import { ReactNode, useState } from 'react';
import { X, Download, RotateCcw, RotateCw, ZoomIn, ZoomOut, FileText, Image, Video, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import { EvidenceItem } from '../../types/audit';

interface EvidenceViewerProps {
  evidence: EvidenceItem;
  onClose: () => void;
}

const typeIcons = {
  image: <Image className="h-8 w-8" />,
  pdf: <FileText className="h-8 w-8" />,
  audio: <Music className="h-8 w-8" />,
  document: <FileText className="h-8 w-8" />,
  system_record: <FileText className="h-8 w-8" />
};

const statusColors = {
  DISPONIBLE: 'text-emerald-400 bg-emerald-950/30 border-emerald-800',
  PENDIENTE: 'text-amber-400 bg-amber-950/30 border-amber-800',
  ERROR: 'text-rose-400 bg-rose-950/30 border-rose-800',
  REQUERIDA: 'text-sky-400 bg-sky-950/30 border-sky-800'
};

export function EvidenceViewer({ evidence, onClose }: EvidenceViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const renderPreview = () => {
    switch (evidence.previewType) {
      case 'image':
        return (
          <img
            src={evidence.fileUrl}
            alt={evidence.name}
            className="max-h-[70vh] max-w-full object-contain"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        );
      case 'pdf_view':
        return (
          <iframe
            src={evidence.fileUrl}
            className="w-full h-[70vh] rounded-xl border border-zinc-800"
            title={evidence.name}
          />
        );
      case 'siu_table':
        return (
          <div className="w-full max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-3 font-bold text-zinc-300">Campo</th>
                  <th className="text-left p-3 font-bold text-zinc-300">Valor</th>
                </tr>
              </thead>
              <tbody>
                {evidence.previewData && Object.entries(evidence.previewData).map(([key, value]) => (
                  <tr key={key} className="border-b border-zinc-800/50">
                    <td className="p-3 text-zinc-500 font-mono">{key}</td>
                    <td className="p-3 text-zinc-200">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'i6_log':
        return (
          <div className="w-full max-h-[70vh] overflow-auto font-mono text-sm bg-zinc-950 p-4 rounded-xl">
            <pre className="text-zinc-300 whitespace-pre-wrap">
              {evidence.previewData?.log || 'Log de llamadas I6 no disponible'}
            </pre>
          </div>
        );
      case 'aula_log':
        return (
          <div className="w-full max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-3 font-bold text-zinc-300">Fecha</th>
                  <th className="text-left p-3 font-bold text-zinc-300">Actividad</th>
                  <th className="text-left p-3 font-bold text-zinc-300">Estado</th>
                </tr>
              </thead>
              <tbody>
                {evidence.previewData?.activities && evidence.previewData.activities.map((a: any, i: number) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="p-3 text-zinc-400">{a.date}</td>
                    <td className="p-3 text-zinc-200">{a.activity}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        a.completed ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                      }`}>
                        {a.completed ? 'Completado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'doc_view':
        return (
          <div className="w-full max-h-[70vh] overflow-auto p-4 bg-zinc-950 rounded-xl">
            <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-sm">
              {JSON.stringify(evidence.previewData, null, 2)}
            </pre>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-[70vh] text-zinc-500">
            <p>Vista previa no disponible para este tipo de evidencia</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200" onKeyDown={handleKeyDown}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${statusColors[evidence.status] || 'bg-zinc-800 text-zinc-400'}`}>
              {(typeIcons as any)[evidence.type] || <FileText className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white truncate max-w-md">{evidence.name}</h3>
              <p className="text-xs text-zinc-500">{evidence.source} • {evidence.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" aria-label="Acercar"><ZoomIn className="h-4 w-4" /></button>
            <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" aria-label="Alejar"><ZoomOut className="h-4 w-4" /></button>
            <button onClick={() => setRotation(rotation - 90)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" aria-label="Rotar izquierda"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={() => setRotation(rotation + 90)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" aria-label="Rotar derecha"><RotateCw className="h-4 w-4" /></button>
            <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors ml-2"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          {renderPreview()}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Código</dt>
              <dd className="mt-1 font-mono text-zinc-200">{evidence.code}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">SHA256</dt>
              <dd className="mt-1 font-mono text-[11px] text-zinc-400 truncate">No disponible en este formato</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Fecha Evidencia</dt>
              <dd className="mt-1 text-zinc-200">{new Date(evidence.date).toLocaleString('es-MX')}</dd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex-1 py-2 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 font-medium flex items-center justify-center gap-2">
              <Download className="h-4 w-4" />
              Descargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}