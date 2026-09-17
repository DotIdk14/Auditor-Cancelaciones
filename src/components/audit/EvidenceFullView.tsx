import React, { useState } from 'react';
import {
  FileCheck2,
  Image as ImageIcon,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  Plus,
  Eye,
  Download,
  FolderOpen,
  Volume2,
  HardDrive
} from 'lucide-react';
import { AuditEvidence } from '../../types/audit';

interface EvidenceFullViewProps {
  evidences: AuditEvidence[];
  onSelectEvidence: (ev: AuditEvidence) => void;
  onAddNewEvidence?: () => void;
}

export const EvidenceFullView: React.FC<EvidenceFullViewProps> = ({
  evidences,
  onSelectEvidence,
  onAddNewEvidence
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const safeEvidences = evidences || [];

  const availableCount = safeEvidences.filter(e => e.status === 'DISPONIBLE').length;
  const pendingCount = safeEvidences.filter(e => e.status === 'PENDIENTE').length;

  const filteredEvidences = safeEvidences.filter(ev => {
    const matchesFilter = selectedFilter === 'ALL' || ev.source === selectedFilter || ev.type === selectedFilter;
    const matchesSearch =
      (ev.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.source || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'SIU':
        return 'bg-blue-950/80 text-blue-300 border-blue-700';
      case 'Flokzu':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
      case 'InConcert':
      case 'I6':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700';
      case 'Moodle':
      case 'Aula':
        return 'bg-amber-950/80 text-amber-300 border-amber-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div id="evidence-full-view" className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-950/80 border border-sky-700/50 text-sky-400 flex items-center justify-center shadow-inner">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Repositorio Central de Evidencias de Auditoría
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {safeEvidences.length} documentos
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Archivos probatorios, registros de llamadas, capturas de pantalla de SIU y tickets Flokzu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">{availableCount} Disponibles</span>
              {pendingCount > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-amber-300">{pendingCount} Pendientes</span>
                </>
              )}
            </div>

            {onAddNewEvidence && (
              <button
                onClick={onAddNewEvidence}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adjuntar Evidencia</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === 'ALL'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Todas ({safeEvidences.length})
          </button>
          <button
            onClick={() => setSelectedFilter('SIU')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === 'SIU'
                ? 'bg-blue-950 text-blue-300 border border-blue-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            SIU (Kardex / Carga)
          </button>
          <button
            onClick={() => setSelectedFilter('Flokzu')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === 'Flokzu'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Flokzu (Tickets)
          </button>
          <button
            onClick={() => setSelectedFilter('InConcert')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === 'InConcert'
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            InConcert (Audio)
          </button>
          <button
            onClick={() => setSelectedFilter('Moodle')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === 'Moodle'
                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Moodle (Aula Virtual)
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por texto o fuente..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Evidences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvidences.map((ev) => {
          const isAvailable = ev.status === 'DISPONIBLE';

          return (
            <div
              key={ev.id}
              onClick={() => onSelectEvidence(ev)}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 cursor-pointer transition-all shadow-md hover:shadow-xl relative flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getSourceBadge(ev.source)}`}>
                      {ev.source}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {ev.id}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                    isAvailable
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    {ev.status}
                  </span>
                </div>

                {/* Evidence Title & Description */}
                <div className="mt-3 space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {ev.description}
                  </p>
                </div>

                {/* Thumbnail / Preview placeholder */}
                {ev.url && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 relative h-32 flex items-center justify-center">
                    {ev.type === 'image' ? (
                      <img
                        src={ev.url}
                        alt={ev.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : ev.type === 'audio' ? (
                      <div className="flex flex-col items-center gap-2 text-indigo-400">
                        <Volume2 className="w-8 h-8 animate-pulse" />
                        <span className="text-[11px] font-mono font-medium text-slate-300">Grabación InConcert I6</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-sky-400">
                        <FileText className="w-8 h-8" />
                        <span className="text-[11px] font-mono font-medium text-slate-300">Registro Documental</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2.5">
                      <span className="text-[10px] text-slate-300 font-mono flex items-center gap-1">
                        <Eye className="w-3 h-3 text-sky-400" /> Clic para inspeccionar
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[10px] font-mono text-slate-500">
                  {ev.timestamp || 'Fecha verificada'}
                </span>
                <span className="text-sky-400 group-hover:text-sky-300 text-xs font-semibold flex items-center gap-1">
                  <span>Examinar</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvidences.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No se encontraron evidencias</div>
          <p className="text-xs text-slate-500">
            Intente con otro filtro o término de búsqueda.
          </p>
        </div>
      )}
    </div>
  );
};
