import { useState } from 'react';
import { FileText, Image, Video, Music, FolderOpen, Search, Eye, Download, Filter, Plus, X, Trash2, Clock, Calendar, ChevronDown } from 'lucide-react';
import { EvidenceItem, EvidenceSource, EvidenceType } from '../../types/audit';
import { EvidenceViewer } from './EvidenceViewer';
import { AttachEvidenceModal } from './AttachEvidenceModal';

interface EvidenceFullViewProps {
  evidences: EvidenceItem[];
  currentCaseId: string;
  onAttachEvidence: (evidence: EvidenceItem) => void;
  onRemoveEvidence: (id: string) => void;
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

const sources: EvidenceSource[] = ['Flokzu', 'SIU', 'I6', 'Aula Virtual', 'WhatsApp', 'Correo', 'Capturas', 'Documentos', 'Otros'];
const types: EvidenceType[] = ['image', 'pdf', 'audio', 'document', 'system_record'];

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

export function EvidenceFullView({ evidences, currentCaseId, onAttachEvidence, onRemoveEvidence }: EvidenceFullViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<EvidenceSource | 'all'>('all');
  const [selectedType, setSelectedType] = useState<EvidenceType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<EvidenceItem['status'] | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [viewingEvidence, setViewingEvidence] = useState<EvidenceItem | null>(null);

  const sortedEvidences = [...evidences].sort((a, b) => {
    const aDate = new Date(a.date).getTime();
    const bDate = new Date(b.date).getTime();
    return bDate - aDate;
  });

  const filteredEvidences = sortedEvidences.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = selectedSource === 'all' || e.source === selectedSource;
    const matchesType = selectedType === 'all' || e.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || e.status === selectedStatus;
    return matchesSearch && matchesSource && matchesType && matchesStatus;
  });

  const hasActiveFilters = selectedSource !== 'all' || selectedType !== 'all' || selectedStatus !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Repositorio de Evidencias</h2>
          <p className="text-sm text-zinc-500 mt-1">{evidences.length} evidencia{evidences.length !== 1 ? 's' : ''} en el expediente</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-sky-950/50 border border-sky-800 text-sky-300'
                : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 rounded-full bg-sky-950 text-sky-300 text-[10px] font-bold">
                {Number(selectedSource !== 'all') + Number(selectedType !== 'all') + Number(selectedStatus !== 'all')}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setShowAttachModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adjuntar Evidencia
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, código, descripción..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedSource}
                onChange={e => setSelectedSource(e.target.value as EvidenceSource | 'all')}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none min-w-[160px]"
              >
                <option value="all">Todas las fuentes</option>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as EvidenceType | 'all')}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none min-w-[140px]"
              >
                <option value="all">Todos los tipos</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as EvidenceItem['status'] | 'all')}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none min-w-[140px]"
              >
                <option value="all">Todos los estados</option>
                <option value="DISPONIBLE">Disponible</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="ERROR">Error</option>
                <option value="REQUERIDA">Requerida</option>
              </select>
              {(selectedSource !== 'all' || selectedType !== 'all' || selectedStatus !== 'all') && (
                <button
                  onClick={() => { setSelectedSource('all'); setSelectedType('all'); setSelectedStatus('all'); }}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Fecha</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Evidencia</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 hidden md:table-cell">Fuente</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 hidden lg:table-cell">Tipo</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Estado</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredEvidences.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    <FolderOpen className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
                    <p className="font-medium text-zinc-400">{searchQuery || hasActiveFilters ? 'No se encontraron evidencias' : 'Sin evidencias cargadas'}</p>
                    <p className="text-sm mt-1">{searchQuery || hasActiveFilters ? 'Intenta ajustar los filtros de búsqueda' : 'Adjunta documentos para iniciar el análisis'}</p>
                  </td>
                </tr>
              ) : (
                filteredEvidences.map(evidence => (
                  <tr key={evidence.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(evidence.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          statusColors[evidence.status as keyof typeof statusColors] || 'text-zinc-400 bg-zinc-900'
                        }`}>
                          {(typeIcons as any)[evidence.type] || <FileText className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{evidence.name}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{evidence.description || 'Sin descripción'}</p>
                          <p className="text-[10px] text-zinc-600 font-mono">{evidence.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 hidden md:table-cell">
                      <span className="flex items-center gap-1">
                        {(sourceIcons as any)[evidence.source] || <FileText className="h-3 w-3" />}
                        {getSourceLabel(evidence.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 hidden lg:table-cell">
                      <span className="flex items-center gap-1">
                        {(typeIcons as any)[evidence.type] || <FileText className="h-3 w-3" />}
                        {evidence.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${
                        statusColors[evidence.status as keyof typeof statusColors] || 'text-zinc-400 bg-zinc-800'
                      }`}>
                        {evidence.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingEvidence(evidence)}
                          className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600 hover:text-white transition-colors"
                          aria-label="Ver evidencia"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onRemoveEvidence(evidence.id)}
                          className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-rose-950/50 hover:border-rose-800 hover:text-rose-400 transition-colors"
                          aria-label="Eliminar evidencia"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAttachModal && (
        <AttachEvidenceModal
          isOpen={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          onAddEvidence={(evidence) => {
            onAttachEvidence(evidence);
            setShowAttachModal(false);
          }}
          currentCaseId={currentCaseId}
        />
      )}

      {viewingEvidence && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80" onClick={() => setViewingEvidence(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
            <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
              <EvidenceViewer
                evidence={viewingEvidence}
                onClose={() => setViewingEvidence(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
