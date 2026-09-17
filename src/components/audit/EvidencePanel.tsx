import React from 'react';
import {
  FileText,
  FileCheck2,
  AlertCircle,
  Plus,
  ChevronRight,
  Download,
  Maximize2,
  ExternalLink,
  ImageIcon,
  GraduationCap,
  PhoneCall,
  Laptop
} from 'lucide-react';
import { EvidenceItem } from '../../types/audit';

interface EvidencePanelProps {
  evidences: EvidenceItem[];
  selectedEvidence: EvidenceItem | null;
  onSelectEvidence: (item: EvidenceItem) => void;
  onAddNewEvidence?: () => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidences,
  selectedEvidence,
  onSelectEvidence,
  onAddNewEvidence
}) => {
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Flokzu':
        return <FileText className="w-4 h-4 text-zinc-300" />;
      case 'SIU':
        return <GraduationCap className="w-4 h-4 text-zinc-300" />;
      case 'I6':
        return <PhoneCall className="w-4 h-4 text-zinc-300" />;
      case 'Aula Virtual':
        return <Laptop className="w-4 h-4 text-zinc-300" />;
      case 'Capturas':
        return <ImageIcon className="w-4 h-4 text-zinc-300" />;
      default:
        return <FileCheck2 className="w-4 h-4 text-zinc-400" />;
    }
  };

  const safeEvidences = evidences || [];
  const featuredScreenshot = safeEvidences.find(e => e.type === 'image') || safeEvidences[0];

  return (
    <div id="evidence-panel-container" className="space-y-4">
      {/* Evidence List Card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm p-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center border border-zinc-700">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              Evidencias del caso
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-zinc-400 font-mono">
            {safeEvidences.length} registradas
          </span>
        </div>

        {/* List items */}
        <div className="divide-y divide-zinc-800/80">
          {safeEvidences.map((ev) => {
            const isLoaded = ev.status === 'DISPONIBLE';
            const isPending = ev.status === 'PENDIENTE';

            return (
              <button
                key={ev.id}
                onClick={() => onSelectEvidence(ev)}
                className="w-full text-left py-3 px-1 flex items-center justify-between group hover:bg-zinc-800/60 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 border border-zinc-700 group-hover:border-zinc-600 transition-all">
                    {getSourceIcon(ev.source)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-200 group-hover:text-zinc-100 truncate transition-colors">
                      {ev.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {ev.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isLoaded 
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
                      : isPending 
                      ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' 
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {ev.statusLabel || (isLoaded ? 'Cargado' : 'Pendiente')}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                </div>
              </button>
            );
          })}

          {/* Add extra evidence row */}
          <div className="pt-2">
            <button
              onClick={onAddNewEvidence}
              className="w-full flex items-center justify-between p-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg border border-dashed border-zinc-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-zinc-400" />
                <span>Evidencias adicionales (Capturas / Documentos)</span>
              </span>
              <span className="text-[11px] text-zinc-300 font-semibold">+ Agregar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visualizer card (Featured evidence preview as seen in screenshot) */}
      {featuredScreenshot && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm p-4">
          <div className="flex items-center justify-between pb-2 mb-2">
            <button
              onClick={() => onSelectEvidence(featuredScreenshot)}
              className="text-xs font-bold text-zinc-200 hover:text-zinc-100 flex items-center gap-1 transition-colors"
            >
              <span>Visualizar evidencia</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded font-mono">
              Captura SIU / Aula
            </span>
          </div>

          {/* Graphic mockup preview representing student portal */}
          <div 
            onClick={() => onSelectEvidence(featuredScreenshot)}
            className="relative rounded-lg overflow-hidden border border-zinc-800 group cursor-pointer bg-zinc-950 aspect-video flex flex-col justify-between p-2 shadow-inner"
          >
            {/* Mock browser header */}
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-[9px] text-zinc-400 font-mono">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                </div>
                <span className="truncate">aulavirtual.utel.edu.mx/dashboard/materias</span>
              </div>
              <span className="bg-rose-950/60 text-rose-300 border border-rose-800/40 px-1 rounded">ERROR CARGA</span>
            </div>

            {/* Simulated portal content with error */}
            <div className="my-auto py-2 px-3 bg-zinc-900 rounded border border-zinc-800 text-center">
              <div className="text-[10px] font-bold text-zinc-200 mb-0.5">
                Portal del Estudiante • Matrícula 010847403
              </div>
              <div className="text-[9px] text-zinc-400 font-mono">
                ⚠️ Sin asignaturas cargadas en el período activo (31/08/2026)
              </div>
            </div>

            {/* Hover overlay with maximize */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs">
              <span className="px-3 py-1 bg-zinc-800 text-zinc-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-lg border border-zinc-700">
                <Maximize2 className="w-3.5 h-3.5 text-zinc-300" />
                <span>Ampliar visor</span>
              </span>
            </div>
          </div>

          {/* Screenshot metadata row */}
          <div className="flex items-center justify-between pt-2.5 text-xs text-zinc-400">
            <div className="min-w-0 pr-2">
              <div className="font-semibold text-zinc-200 truncate text-[11px]">
                {featuredScreenshot.name}
              </div>
              <div className="text-[10px] text-zinc-500">
                Imagen • {featuredScreenshot.fileSize || '2.4 MB'} • {featuredScreenshot.date}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvidence(featuredScreenshot);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md"
                title="Descargar o ver archivo"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => onSelectEvidence(featuredScreenshot)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md"
                title="Ver a pantalla completa"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
