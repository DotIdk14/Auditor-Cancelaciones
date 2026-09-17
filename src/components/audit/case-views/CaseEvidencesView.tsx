import React, { useState } from 'react';
import {
  FileCheck2,
  PhoneCall,
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Upload,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Volume2
} from 'lucide-react';
import { AuditCase, AuditEvidence, CallRecord } from '../../../types/audit';
import { CallPlayer } from '../CallPlayer';
import { CallTranscript } from '../CallTranscript';

interface CaseEvidencesViewProps {
  currentCase?: AuditCase;
  caseData?: AuditCase;
  activeCall?: CallRecord;
  allCalls?: CallRecord[];
  activeCallId?: string;
  onSelectCall?: (callId: string) => void;
  onAddCall?: (newCall: CallRecord) => void;
  currentPlayTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSelectEvidence: (ev: AuditEvidence) => void;
  onAddNewEvidence?: () => void;
  onNavigateToDecision: () => void;
}

export const CaseEvidencesView: React.FC<CaseEvidencesViewProps> = ({
  currentCase: propCurrentCase,
  caseData: propCaseData,
  activeCall,
  allCalls = [],
  activeCallId,
  onSelectCall,
  onAddCall,
  currentPlayTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  onSelectEvidence,
  onAddNewEvidence,
  onNavigateToDecision
}) => {
  const currentCase = propCurrentCase || propCaseData;

  // Sub-view segmented control inside Evidences: 'calls' | 'documents'
  const [activeSection, setActiveSection] = useState<'calls' | 'documents'>('calls');
  const [documentFilter, setDocumentFilter] = useState<string>('ALL');
  const [documentSearch, setDocumentSearch] = useState<string>('');

  if (!currentCase) return null;

  const evidences = currentCase.evidences || [];
  const availableDocs = evidences.filter(e => e.status === 'DISPONIBLE');
  const pendingDocs = evidences.filter(e => e.status === 'PENDIENTE');

  const filteredDocuments = evidences.filter(ev => {
    const matchesFilter = documentFilter === 'ALL' || ev.source === documentFilter || ev.type === documentFilter;
    const matchesSearch =
      (ev.title || '').toLowerCase().includes(documentSearch.toLowerCase()) ||
      (ev.description || '').toLowerCase().includes(documentSearch.toLowerCase()) ||
      (ev.source || '').toLowerCase().includes(documentSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'SIU':
        return 'bg-blue-950/70 text-blue-300 border-blue-800/60';
      case 'Flokzu':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'InConcert':
      case 'I6':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60';
      case 'Moodle':
      case 'Aula':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div id="case-evidences-view" className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header & Segmented Switcher */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-zinc-400" />
              <span>Evidencias del Expediente</span>
            </h2>
            <span className="text-xs font-mono font-semibold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
              {evidences.length} elementos
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Grabaciones de audio con diarización pericial y documentos probatorios de SIU / Flokzu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Section Switcher */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              id="tab-evidences-calls"
              onClick={() => setActiveSection('calls')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSection === 'calls'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Llamadas y Audio</span>
              <span className="text-[10px] font-mono bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                {allCalls.length || 1}
              </span>
            </button>

            <button
              id="tab-evidences-documents"
              onClick={() => setActiveSection('documents')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSection === 'documents'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Expediente Documental</span>
              <span className="text-[10px] font-mono bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                {evidences.length}
              </span>
            </button>
          </div>

          {/* Primary Action to Advance to Decision */}
          <button
            id="btn-evidences-to-decision"
            onClick={onNavigateToDecision}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-zinc-900 bg-zinc-100 hover:bg-white rounded-xl transition-all shadow-sm"
          >
            <span>Evaluar Decisión</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Content Area based on Selected Section */}
      {activeSection === 'calls' ? (
        <div className="space-y-4">
          {/* Integrated Call Player Banner */}
          {activeCall && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Reproductor de Audio Vinculado a la Diarización</span>
              </div>
              <CallPlayer
                call={activeCall}
                currentPlayTime={currentPlayTime}
                isPlaying={isPlaying}
                onTogglePlay={onTogglePlay}
                onSeek={onSeek}
                onOpenDetailsModal={() => {
                  const callEv = evidences.find(e => e.source === 'I6');
                  if (callEv) onSelectEvidence(callEv);
                }}
              />
            </div>
          )}

          {/* Full Diarization & Transcript Component */}
          {activeCall ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
              <CallTranscript
                call={activeCall}
                allCalls={allCalls}
                activeCallId={activeCallId}
                onSelectCall={onSelectCall}
                onAddCall={onAddCall}
                currentPlayTime={currentPlayTime}
                onSeek={onSeek}
              />
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-400">
              No se encontró registro de llamada telefónica para este caso.
            </div>
          )}
        </div>
      ) : (
        /* Document Repository Section */
        <div className="space-y-4">
          {/* Filter and Search Toolbar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={documentSearch}
                onChange={(e) => setDocumentSearch(e.target.value)}
                placeholder="Filtrar por título, fuente o folio..."
                className="w-full bg-zinc-950 text-zinc-200 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {['ALL', 'SIU', 'Flokzu', 'Aula', 'I6'].map((source) => (
                <button
                  key={source}
                  onClick={() => setDocumentFilter(source)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    documentFilter === source
                      ? 'bg-zinc-100 text-zinc-900 font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {source === 'ALL' ? 'Todos' : source}
                </button>
              ))}

              {onAddNewEvidence && (
                <button
                  onClick={onAddNewEvidence}
                  className="ml-auto px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 transition-colors"
                >
                  + Adjuntar Documento
                </button>
              )}
            </div>
          </div>

          {/* Document Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocuments.map((ev) => (
              <div
                key={ev.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${getSourceBadge(ev.source)}`}>
                      {ev.source}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      ev.status === 'DISPONIBLE' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ev.status === 'DISPONIBLE' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                      {ev.status === 'DISPONIBLE' ? 'Disponible' : 'Pendiente'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-200 tracking-tight">
                    {ev.title}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {ev.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {ev.date || 'Fecha registrada'}
                  </span>
                  <button
                    onClick={() => onSelectEvidence(ev)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspeccionar</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredDocuments.length === 0 && (
              <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-400">
                No se encontraron documentos probatorios que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
