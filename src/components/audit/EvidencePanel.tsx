import { ReactNode } from 'react';
import { FileText, Image, Video, Music, FolderOpen, Search, Eye, Download, Plus, Clock, Calendar } from 'lucide-react';
import { EvidenceItem } from '../../types/audit';

interface EvidencePanelProps {
  evidences: EvidenceItem[];
  selectedEvidence: EvidenceItem | null;
  onSelectEvidence: (evidence: EvidenceItem) => void;
  onViewAll: () => void;
  onAttachEvidence: () => void;
}

const sourceIcons = {
  Flokzu: <FileText className="h-4 w-4" />,
  SIU: <FolderOpen className="h-4 w-4" />,
  I6: <Music className="h-4 w-4" />,
  'Aula Virtual': <Video className="h-4 w-4" />,
  WhatsApp: <MessageSquare className="h-4 w-4" />,
  Correo: <Mail className="h-4 w-4" />,
  Capturas: <Image className="h-4 w-4" />,
  Documentos: <FileText className="h-4 w-4" />,
  Otros: <FileText className="h-4 w-4" />
};

const typeIcons = {
  image: <Image className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
  audio: <Music className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  system_record: <FolderOpen className="h-4 w-4" />
};

const statusColors = {
  DISPONIBLE: 'text-emerald-400 bg-emerald-950/30 border-emerald-800',
  PENDIENTE: 'text-amber-400 bg-amber-950/30 border-amber-800',
  ERROR: 'text-rose-400 bg-rose-950/30 border-rose-800',
  REQUERIDA: 'text-sky-400 bg-sky-950/30 border-sky-800'
};

function MessageSquare({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function Mail({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function getSourceLabel(source: EvidenceItem['source']): string {
  const labels: Record<string, string> = {
    'Flokzu': 'Flokzu',
    'SIU': 'SIU',
    'I6': 'I6',
    'Aula Virtual': 'Aula Virtual',
    'WhatsApp': 'WhatsApp',
    'Correo': 'Correo',
    'Capturas': 'Capturas',
    'Documentos': 'Documentos',
    'Otros': 'Otros'
  };
  return labels[source] || source;
}

export function EvidencePanel({ evidences, selectedEvidence, onSelectEvidence, onViewAll, onAttachEvidence }: EvidencePanelProps) {
  const sortedEvidences = [...evidences].sort((a, b) => {
    const aDate = new Date(a.date).getTime();
    const bDate = new Date(b.date).getTime();
    return bDate - aDate;
  });

  const displayEvidences = sortedEvidences.slice(0, 5);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-sky-400" />
          <h3 className="font-bold text-white">Evidencias del Expediente</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium">
            {evidences.length} total
          </span>
          <button
            onClick={onAttachEvidence}
            className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600 hover:text-white transition-colors"
            aria-label="Adjuntar evidencia"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {evidences.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          <FolderOpen className="h-12 w-12 mx-auto text-zinc-700 mb-3" />
          <p className="font-medium text-zinc-400">Sin evidencias cargadas</p>
          <p className="text-xs mt-1">Adjunta documentos para iniciar el análisis</p>
          <button
            onClick={onAttachEvidence}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adjuntar primera evidencia
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {displayEvidences.map(evidence => (
              <button
                key={evidence.id}
                onClick={() => onSelectEvidence(evidence)}
                className={`w-full rounded-xl p-3 transition-all text-left flex items-center gap-3 ${
                  selectedEvidence?.id === evidence.id
                    ? 'bg-emerald-950/30 border border-emerald-800'
                    : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  statusColors[evidence.status as keyof typeof statusColors] || 'text-zinc-400 bg-zinc-900'
                }`}>
                  {(typeIcons as any)[evidence.type] || <FileText className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">{evidence.name}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      statusColors[evidence.status as keyof typeof statusColors] || 'text-zinc-400 bg-zinc-800'
                    }`}>
                      {evidence.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      {(sourceIcons as any)[evidence.source] || <FileText className="h-3 w-3" />}
                      {getSourceLabel(evidence.source)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(evidence.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      {(typeIcons as any)[evidence.type] || <FileText className="h-3 w-3" />}
                      {evidence.type}
                    </span>
                  </div>
                  {evidence.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-1 mt-1">{evidence.description}</p>
                  )}
                </div>
                <Eye className="h-4 w-4 text-zinc-500" />
              </button>
            ))}
          </div>

          {evidences.length > 5 && (
            <button
              onClick={onViewAll}
              className="w-full py-2 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Search className="h-4 w-4" />
              Ver todas las evidencias ({evidences.length})
            </button>
          )}
        </>
      )}
    </div>
  );
}