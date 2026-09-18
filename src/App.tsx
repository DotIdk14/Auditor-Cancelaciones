import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { ShieldCheck, Plus, AlertTriangle, CheckCircle2, FileText, FolderOpen, Gavel, Headphones, Menu, Scale, X } from 'lucide-react';
import { mockAuditCases } from './mock/audit-cases';
import { AuditCase, EvidenceItem } from './types/audit';
import { CaseHeader } from './components/audit/CaseHeader';
import { CallTranscript } from './components/audit/CallTranscript';
import { CallPlayer } from './components/audit/CallPlayer';
import { DictamenPanel } from './components/audit/DictamenPanel';
import { EvidencePanel } from './components/audit/EvidencePanel';
import { EvidenceFullView } from './components/audit/EvidenceFullView';
import { AnalysisFullView } from './components/audit/AnalysisFullView';
import { DictamenFullView } from './components/audit/DictamenFullView';
import { DecisionTreeModal } from './components/audit/DecisionTreeModal';
import { EvidenceFirstAddCaseModal } from './components/audit/EvidenceFirstAddCaseModal';
import { analyzeCancellationCase } from './lib/decision-engine/decision-engine';
import { DecisionResult } from './lib/decision-engine/types';
import { ExternalLinksPanel } from './components/audit/ExternalLinksPanel';
import { ExternalLinkViewer } from './components/audit/ExternalLinkViewer';
import { AttachEvidenceModal } from './components/audit/AttachEvidenceModal';
import { EvidenceViewer } from './components/audit/EvidenceViewer';

const statusLabels: Record<AuditCase['status'], string> = {
  EN_ANALISIS: 'En análisis',
  PENDIENTE_REVISION: 'Revisión pendiente',
  DICTAMINADO: 'Dictaminado',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado'
};

type AuditTab = 'summary' | 'call' | 'evidences' | 'analysis' | 'dictamen';

function StatusPill({ status }: { status: AuditCase['status'] }) {
  const isGood = status === 'DICTAMINADO' || status === 'APROBADO';
  const isPending = status === 'PENDIENTE_REVISION' || status === 'EN_ANALISIS';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
      isGood ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800' :
      isPending ? 'bg-amber-950/50 text-amber-300 border border-amber-800' :
      'bg-rose-950/50 text-rose-300 border border-rose-800'
    }`}>
      {statusLabels[status]}
    </span>
  );
}

function HeaderMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-[120px] items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
      {icon}
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="truncate text-xs font-semibold text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [tickets, setTickets] = useState<AuditCase[]>(mockAuditCases);
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<AuditTab>('summary');
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDecisionTreeOpen, setIsDecisionTreeOpen] = useState(false);
  const [isAddCaseOpen, setIsAddCaseOpen] = useState(false);
  const [viewingEvidence, setViewingEvidence] = useState<any>(null);
  const [viewingExternalLink, setViewingExternalLink] = useState<{ url: string; label: string } | null>(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1
  });
  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) ?? tickets[0];
  const calls = [
    selectedTicket.primaryCall,
    ...(selectedTicket.secondaryCalls || [])
  ];
  const activeCallId = calls[0]?.id || '';

  const ticketIndex = tickets.findIndex(t => t.id === selectedTicketId);
  const hasPrevious = ticketIndex > 0;
  const hasNext = ticketIndex < tickets.length - 1;

  const runAnalysis = useCallback(async () => {
    if (!selectedTicket) return;
    setIsAnalyzing(true);
    try {
      const decisionDataWithEvidence = {
        ...selectedTicket.decisionData,
        evidences: selectedTicket.evidences,
      };
      const result = analyzeCancellationCase(decisionDataWithEvidence);
      setDecisionResult(result);
    } catch (error) {
      console.error('Error analyzing case:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedTicket]);

  useEffect(() => {
    runAnalysis();
  }, [selectedTicketId, runAnalysis]);

  const handleAddCall = useCallback((newCall: any) => {
    setTickets(prev => prev.map(t => {
      if (t.id === selectedTicketId) {
        const secondaryCalls = t.secondaryCalls || [];
        return { ...t, secondaryCalls: [...secondaryCalls, newCall] };
      }
      return t;
    }));
  }, [selectedTicketId]);

  const handleAddCase = useCallback((newCase: AuditCase) => {
    setTickets(prev => [newCase, ...prev]);
    setSelectedTicketId(newCase.id);
    setIsAddCaseOpen(false);
  }, []);

  const handleAttachEvidence = useCallback((newEvidence: EvidenceItem) => {
    setTickets(prev => prev.map(t => {
      if (t.id === selectedTicketId) {
        return { ...t, evidences: [...t.evidences, newEvidence] };
      }
      return t;
    }));
    setShowAttachModal(false);
  }, [selectedTicketId]);

  const handleRemoveEvidence = useCallback((id: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === selectedTicketId) {
        return { ...t, evidences: t.evidences.filter(e => e.id !== id) };
      }
      return t;
    }));
  }, [selectedTicketId]);

  const handlePreviousCase = useCallback(() => {
    const currentIndex = tickets.findIndex(t => t.id === selectedTicketId);
    if (currentIndex > 0) {
      setSelectedTicketId(tickets[currentIndex - 1].id);
      setActiveTab('summary');
    }
  }, [selectedTicketId, tickets]);

  const handleNextCase = useCallback(() => {
    const currentIndex = tickets.findIndex(t => t.id === selectedTicketId);
    if (currentIndex < tickets.length - 1) {
      setSelectedTicketId(tickets[currentIndex + 1].id);
      setActiveTab('summary');
    }
  }, [selectedTicketId, tickets]);

  const handleApproveDictamen = useCallback(() => {
    setTickets(prev => prev.map(t => {
      if (t.id === selectedTicketId) {
        return {
          ...t,
          status: 'APROBADO' as const,
          dictamen: {
            ...t.dictamen,
            status: 'APROBADO',
            approvedBy: 'Auditor Principal',
            approvedAt: new Date().toISOString()
          }
        };
      }
      return t;
    }));
  }, [selectedTicketId, decisionResult]);

  const stats = useMemo(() => ({
    total: tickets.length,
    automaticos: tickets.filter(t => t.dictamen.status === 'APROBADO').length,
    revision: tickets.filter(t => t.status === 'PENDIENTE_REVISION').length
  }), [tickets]);

  const primaryCallDuration = selectedTicket.primaryCall?.durationSeconds || 0;

  if (!selectedTicket) {
    return <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">Sin tickets disponibles.</main>;
  }

  const tabs: { id: AuditTab; label: string }[] = [
    { id: 'summary', label: 'Resumen' },
    { id: 'call', label: 'Transcriptor' },
    { id: 'evidences', label: 'Evidencias' },
    { id: 'analysis', label: 'Análisis' },
    { id: 'dictamen', label: 'Dictamen' }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="mx-auto max-w-full px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setIsCaseMenuOpen(true)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
                aria-label="Abrir menú de expedientes"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white">Auditor de Cancelaciones</h1>
                <p className="truncate text-xs text-zinc-500">{selectedTicket.id} · {selectedTicket.studentName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
              <HeaderMetric
                icon={<Gavel className="h-3.5 w-3.5 text-emerald-400" />}
                label="Resultado"
                value={decisionResult ? decisionResult.classification.replace(/_/g, ' ').toLowerCase() : 'pendiente'}
              />
              <HeaderMetric
                icon={<Scale className="h-3.5 w-3.5 text-sky-400" />}
                label="Confianza"
                value={decisionResult ? `${Math.round(decisionResult.confidence * 100)}%` : '--'}
              />
              <HeaderMetric
                icon={<FolderOpen className="h-3.5 w-3.5 text-emerald-400" />}
                label="Evidencias"
                value={String(selectedTicket.evidences.length)}
              />
              <HeaderMetric
                icon={<Headphones className="h-3.5 w-3.5 text-amber-400" />}
                label="Llamadas"
                value={String(calls.length)}
              />
              <button
                onClick={() => setIsAddCaseOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Caso</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {isCaseMenuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsCaseMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-full max-w-md border-r border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <div>
                <h2 className="font-bold text-white">Bandeja de expedientes</h2>
                <p className="text-xs text-zinc-500">{stats.total} casos · {stats.revision} en revisión</p>
              </div>
              <button
                onClick={() => setIsCaseMenuOpen(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-144px)] overflow-y-auto p-3 space-y-2">
              {tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => { setSelectedTicketId(ticket.id); setActiveTab('summary'); setIsCaseMenuOpen(false); }}
                  className={`w-full rounded-xl p-3 text-left transition-all ${
                    selectedTicketId === ticket.id
                      ? 'bg-emerald-950/30 border border-emerald-800/50'
                      : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-emerald-400">{ticket.id}</span>
                    <StatusPill status={ticket.status} />
                  </div>
                  <p className="mt-1 font-medium text-white truncate">{ticket.studentName}</p>
                  <p className="text-xs text-zinc-500 truncate">{ticket.program}</p>
                  <p className="mt-1 truncate text-[11px] text-zinc-600">{ticket.requestReason}</p>
                </button>
              ))}
            </div>
            <div className="border-t border-zinc-800 p-4">
              <button
                onClick={() => { setIsAddCaseOpen(true); setIsCaseMenuOpen(false); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                Nuevo caso
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <main className="flex h-full min-w-0 flex-col overflow-hidden">
          <CaseHeader
            caseData={selectedTicket}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onPreviousCase={handlePreviousCase}
            onNextCase={handleNextCase}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            tabs={tabs}
          />

          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
            {activeTab === 'summary' && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="min-w-0 space-y-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-white">Síntesis del expediente</h2>
                        <p className="mt-1 text-sm text-zinc-500">Vista de trabajo rápida; abre cada módulo para revisar detalle sin perder pantalla.</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('analysis')}
                        className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                      >
                        Ver análisis
                      </button>
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          {decisionResult?.missingEvidence.length ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          Validación de evidencias
                        </div>
                        <p className="mt-2 text-sm text-zinc-400">
                          {decisionResult?.missingEvidence.length
                            ? `${decisionResult.missingEvidence.length} evidencia(s) faltante(s) para cerrar con trazabilidad completa.`
                            : 'No hay evidencias faltantes reportadas por el motor.'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          <FileText className="h-4 w-4 text-emerald-400" />
                          Causa raíz
                        </div>
                        <p className="mt-2 text-sm text-zinc-400">
                          {decisionResult ? decisionResult.rootCause.replace(/_/g, ' ').toLowerCase() : selectedTicket.requestReason}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-white">Últimos eventos</h3>
                      <span className="text-xs text-zinc-500">{selectedTicket.timeline.length} eventos</span>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {selectedTicket.timeline.slice(-4).map(event => (
                        <div key={event.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                          <p className="text-xs font-mono text-zinc-500">{event.date} · {event.time}</p>
                          <p className="mt-1 text-sm font-semibold text-white">{event.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{event.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <DictamenPanel
                    result={decisionResult}
                    onEdit={() => setActiveTab('dictamen')}
                    onApprove={handleApproveDictamen}
                  />
                  <EvidencePanel
                    evidences={selectedTicket.evidences}
                    selectedEvidence={viewingEvidence}
                    onSelectEvidence={setViewingEvidence}
                    onViewAll={() => setActiveTab('evidences')}
                    onAttachEvidence={() => setShowAttachModal(true)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'call' && (
              <div className="space-y-4">
                <div className="sticky top-0 z-20">
                  <CallPlayer
                    currentTime={audioState.currentTime}
                    duration={audioState.duration || primaryCallDuration}
                    isPlaying={audioState.isPlaying}
                    playbackRate={audioState.playbackRate}
                    onPlay={() => setAudioState(prev => ({ ...prev, isPlaying: true }))}
                    onPause={() => setAudioState(prev => ({ ...prev, isPlaying: false }))}
                    onSeek={(time) => setAudioState(prev => ({ ...prev, currentTime: time }))}
                    onRateChange={(rate) => setAudioState(prev => ({ ...prev, playbackRate: rate }))}
                    onReplay={() => setAudioState(prev => ({ ...prev, currentTime: 0 }))}
                  />
                </div>
                <CallTranscript
                  calls={calls}
                  activeCallId={activeCallId}
                  onCallChange={(id) => {}}
                  onAddCall={handleAddCall}
                  onSeek={(time) => setAudioState(prev => ({ ...prev, currentTime: time }))}
                  currentPlayTime={audioState.currentTime}
                  isPlaying={audioState.isPlaying}
                  totalDuration={audioState.duration || primaryCallDuration}
                  playbackRate={audioState.playbackRate}
                />
              </div>
            )}

            {activeTab === 'evidences' && (
              <EvidenceFullView
                evidences={selectedTicket.evidences}
                currentCaseId={selectedTicket.id}
                onAttachEvidence={handleAttachEvidence}
                onRemoveEvidence={handleRemoveEvidence}
              />
            )}

            {activeTab === 'analysis' && (
              <AnalysisFullView
                result={decisionResult}
                onViewDecisionTree={() => setIsDecisionTreeOpen(true)}
              />
            )}

            {activeTab === 'dictamen' && (
              <DictamenFullView
                result={decisionResult}
                caseData={selectedTicket}
                onApprove={handleApproveDictamen}
                onSaveDraft={(text) => {}}
              />
            )}
          </div>
        </main>
      </div>

      <DecisionTreeModal
        isOpen={isDecisionTreeOpen}
        onClose={() => setIsDecisionTreeOpen(false)}
        result={decisionResult}
      />

      <EvidenceFirstAddCaseModal
        isOpen={isAddCaseOpen}
        onClose={() => setIsAddCaseOpen(false)}
        onAddCase={handleAddCase}
      />

      <ExternalLinksPanel
        onOpenLink={(url, label) => setViewingExternalLink({ url, label })}
      />

      <ExternalLinkViewer
        isOpen={!!viewingExternalLink}
        onClose={() => setViewingExternalLink(null)}
        url={viewingExternalLink?.url ?? ''}
        label={viewingExternalLink?.label ?? ''}
      />

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

      {showAttachModal && (
        <AttachEvidenceModal
          isOpen={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          onAddEvidence={handleAttachEvidence}
          currentCaseId={selectedTicket.id}
        />
      )}
    </div>
  );
}
