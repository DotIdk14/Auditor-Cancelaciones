import { useState, useCallback, useEffect, useMemo, type FormEvent, type ReactNode } from 'react';
import { ShieldCheck, Plus, AlertTriangle, CheckCircle2, FileText, FolderOpen, Gavel, Headphones, Menu, Scale, X } from 'lucide-react';
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
import { MissingDataView } from './components/audit/MissingDataView';
import { DetectedFactsPanel } from './components/audit/DetectedFactsPanel';
import { ManualOverrides } from './types/audit';
import { runPDFPreflight } from './lib/audit/pdf-preflight';
import { useInsforgeBackend } from './hooks/useInsforgeBackend';

const statusLabels: Record<AuditCase['status'], string> = {
  EN_ANALISIS: 'En análisis',
  PENDIENTE_REVISION: 'Revisión pendiente',
  DICTAMINADO: 'Dictaminado',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado'
};

type AuditTab = 'summary' | 'call' | 'evidences' | 'analysis' | 'dictamen' | 'missing-data' | 'facts';

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

function toInputDate(value: string) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
}

function toDisplayDate(value: string) {
  return value ? value.split('-').reverse().join('/') : 'Sin fecha';
}

function getDaysBetween(startDate: string, requestDate: string) {
  if (!startDate || !requestDate) return 0;
  const start = new Date(startDate);
  const request = new Date(requestDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(request.getTime())) return 0;
  return Math.ceil((request.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function CaseDetailsEditModal({
  caseData,
  onClose,
  onSave,
}: {
  caseData: AuditCase;
  onClose: () => void;
  onSave: (updates: Partial<AuditCase>) => void;
}) {
  const [studentName, setStudentName] = useState(caseData.studentName || '');
  const [matricula, setMatricula] = useState(caseData.matricula || '');
  const [program, setProgram] = useState(caseData.program || '');
  const [channel, setChannel] = useState(caseData.channel || '');
  const [phone, setPhone] = useState(caseData.studentContactNumber || '');
  const [startDate, setStartDate] = useState(toInputDate(caseData.decisionData?.fechaInicio || caseData.startDate));
  const [requestDate, setRequestDate] = useState(toInputDate(caseData.decisionData?.fechaSolicitud || caseData.requestDate));
  const [reason, setReason] = useState(caseData.requestReason || '');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const daysFromStart = getDaysBetween(startDate, requestDate);

    onSave({
      studentName: studentName || 'Alumno sin nombre',
      matricula: matricula || 'Sin matricula',
      program: program || 'Programa no especificado',
      channel: channel || 'DIGITAL_FACEBOOK_ADS',
      studentContactNumber: phone,
      startDate: toDisplayDate(startDate),
      requestDate: toDisplayDate(requestDate),
      daysFromStart,
      workingDaysFromStart: Math.max(0, Math.min(daysFromStart, 10)),
      requestReason: reason || 'Motivo pendiente de documentar',
      decisionData: {
        ...caseData.decisionData,
        fechaInicio: startDate,
        fechaSolicitud: requestDate,
        programa: program || '',
        canalVenta: channel || 'DIGITAL_FACEBOOK_ADS',
        motivoSolicitud: reason || '',
        diasHabilesDesdeInicio: Math.max(0, Math.min(daysFromStart, 10)),
        semanasDesdeInicio: Math.max(0, Math.ceil(daysFromStart / 7)),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 p-4">
            <div>
              <h2 className="font-bold text-white">Editar datos del caso</h2>
              <p className="text-xs text-zinc-500">Estos campos dan contexto y se pueden ajustar después de crear el expediente.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Cerrar edición">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-zinc-400">
              Nombre
              <input value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-zinc-400">
              Matrícula
              <input value={matricula} onChange={e => setMatricula(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-zinc-400 sm:col-span-2">
              Programa
              <input value={program} onChange={e => setProgram(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-zinc-400">
              Canal
              <input value={channel} onChange={e => setChannel(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-zinc-400">
              Teléfono
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-zinc-400">
              Inicio de clases
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-zinc-400">
              Fecha de solicitud
              <input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-zinc-400 sm:col-span-2">
              Motivo
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-800 p-4">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white">Cancelar</button>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const backend = useInsforgeBackend();
  const tickets = backend.cases;
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [activeTab, setActiveTab] = useState<AuditTab>('summary');
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDecisionTreeOpen, setIsDecisionTreeOpen] = useState(false);
  const [isAddCaseOpen, setIsAddCaseOpen] = useState(false);
  const [viewingEvidence, setViewingEvidence] = useState<any>(null);
  const [viewingExternalLink, setViewingExternalLink] = useState<{ url: string; label: string } | null>(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [isEditCaseOpen, setIsEditCaseOpen] = useState(false);
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1
  });
  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);

  useEffect(() => {
    if (tickets.length === 0) return;
    if (!selectedTicketId || !tickets.some(t => t.id === selectedTicketId)) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) ?? tickets[0];
  const calls = selectedTicket
    ? [selectedTicket.primaryCall, ...(selectedTicket.secondaryCalls || [])].filter(Boolean)
    : [];
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
        evidences: (selectedTicket.evidences || []).map(e => ({
          id: e.id,
          type: e.type,
          title: e.name,
          source: e.source,
          date: e.date,
          description: e.description,
          url: e.fileUrl,
        })),
      };
      const result = analyzeCancellationCase(decisionDataWithEvidence);
      setDecisionResult(result);
      backend.persistEvaluation(selectedTicket.id, decisionDataWithEvidence);
    } catch (error) {
      console.error('Error analyzing case:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedTicket, backend]);

  useEffect(() => {
    if (tickets.length > 0 && !tickets.some(t => t.id === selectedTicketId)) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  useEffect(() => {
    runAnalysis();
  }, [selectedTicketId, runAnalysis]);

  const handleAddCall = useCallback((newCall: any) => {
    const secondaryCalls = [...(selectedTicket.secondaryCalls || []), newCall];
    backend.updateCase(selectedTicketId, { secondaryCalls }).catch(error => {
      console.error('Error guardando llamada:', error);
    });
  }, [backend, selectedTicketId, selectedTicket]);

const handleAddCase = useCallback(async (newCase: AuditCase, files?: File[]) => {
    try {
      await backend.addCase(newCase, files);
      setSelectedTicketId(newCase.id);
      setIsAddCaseOpen(false);
    } catch (error) {
      console.error('Error creando expediente en backend:', error);
      setIsAddCaseOpen(false);
    }
  }, [backend]);

const handleAttachEvidence = useCallback(async (newEvidence: EvidenceItem, file?: File | null) => {
    try {
      await backend.attachEvidence(selectedTicketId, newEvidence, file);
    } catch (error) {
      console.error('Error adjuntando evidencia al backend:', error);
    } finally {
      setShowAttachModal(false);
    }
  }, [backend, selectedTicketId]);

const handleRemoveEvidence = useCallback((id: string) => {
    backend.removeEvidence(selectedTicketId, id).catch(error => {
      console.error('Error eliminando evidencia:', error);
    });
  }, [backend, selectedTicketId]);

const handleUpdateCaseDetails = useCallback((updates: Partial<AuditCase>) => {
    if (!selectedTicketId) return;
    backend.updateCase(selectedTicketId, updates).catch(error => {
      console.error('Error actualizando expediente:', error);
    });
    setIsEditCaseOpen(false);
  }, [backend, selectedTicketId]);

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

  const handleApproveDictamen = useCallback((text?: string) => {
    if (!selectedTicket) return;
    backend.approveDictamen(selectedTicket.id, text).catch(error => {
      console.error('Error aprobando dictamen:', error);
    });
  }, [backend, selectedTicket]);

const handleSaveDictamenDraft = useCallback((text: string) => {
    if (!selectedTicket) return;
    backend.saveDictamen(selectedTicket.id, { text, status: 'PENDIENTE_REVISION' }).catch(error => {
      console.error('Error guardando dictamen:', error);
    });
  }, [backend, selectedTicket]);

  const stats = useMemo(() => ({
    total: tickets.length,
    automaticos: tickets.filter(t => t.dictamen.status === 'APROBADO').length,
    revision: tickets.filter(t => t.status === 'PENDIENTE_REVISION').length
  }), [tickets]);

  const preflight = useMemo(
    () => selectedTicket ? runPDFPreflight(selectedTicket, decisionResult) : undefined,
    [selectedTicket, decisionResult]
  );

  const handleSaveOverrides = useCallback((updates: Partial<ManualOverrides>) => {
    if (!selectedTicket) return;
    const current = selectedTicket.manualOverrides || {};
    const next = { ...current };
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null || value === '') {
        delete (next as Record<string, unknown>)[key];
      } else {
        (next as Record<string, unknown>)[key] = value;
      }
    }
    backend.updateCase(selectedTicketId, { manualOverrides: next }).catch(error => {
      console.error('Error guardando datos faltantes:', error);
    });
  }, [backend, selectedTicketId, selectedTicket]);

  const primaryCallDuration = selectedTicket?.primaryCall?.durationSeconds || 0;

  if (backend.loading && tickets.length === 0) {
    return <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex items-center justify-center text-zinc-400">Cargando expedientes del backend...</main>;
  }

  if (!selectedTicket) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex items-center justify-center">
        <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900/70 p-8 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-white">Aún no hay expedientes</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            El backend no tiene tickets guardados todavía. Crea el primer expediente subiendo capturas, PDFs o audios; el sistema extraerá los datos y abrirá el flujo de dictaminación.
          </p>
          <button
            onClick={() => setIsAddCaseOpen(true)}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Crear caso desde evidencias
          </button>
        </div>

        <EvidenceFirstAddCaseModal
          isOpen={isAddCaseOpen}
          onClose={() => {
            setIsAddCaseOpen(false);
          }}
          onAddCase={handleAddCase}
        />
      </main>
    );
  }

  const tabs: { id: AuditTab; label: string }[] = [
    { id: 'summary', label: 'Resumen' },
    { id: 'call', label: 'Transcriptor' },
    { id: 'evidences', label: 'Evidencias' },
    { id: 'analysis', label: 'Análisis' },
    { id: 'dictamen', label: 'Dictamen' },
    { id: 'missing-data', label: 'Datos faltantes' },
    { id: 'facts', label: 'Hechos visuales' }
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setIsEditCaseOpen(true)}
                          className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
                        >
                          Editar datos
                        </button>
                        <button
                          onClick={() => setActiveTab('analysis')}
                          className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                        >
                          Ver análisis
                        </button>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          {(decisionResult?.missingEvidence || []).length ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          Validación de evidencias
                        </div>
                        <p className="mt-2 text-sm text-zinc-400">
                          {(decisionResult?.missingEvidence || []).length
                            ? `${(decisionResult?.missingEvidence || []).length} evidencia(s) faltante(s) para cerrar con trazabilidad completa.`
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
                onSaveDraft={handleSaveDictamenDraft}
                preflight={preflight}
                onOpenMissingData={() => setActiveTab('missing-data')}
                onPdfEmitted={(updatedCase) =>
                  backend.updateCase(selectedTicket.id, { pdfsEmitidos: updatedCase.pdfsEmitidos }).catch(console.error)
                }
              />
            )}

            {activeTab === 'missing-data' && (
              <MissingDataView
                caseData={selectedTicket}
                result={decisionResult}
                preflight={preflight}
                onSaveOverrides={handleSaveOverrides}
                onGoToDictamen={() => setActiveTab('dictamen')}
              />
            )}

            {activeTab === 'facts' && (
              <DetectedFactsPanel caseData={selectedTicket} />
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

      {isEditCaseOpen && (
        <CaseDetailsEditModal
          caseData={selectedTicket}
          onClose={() => setIsEditCaseOpen(false)}
          onSave={handleUpdateCaseDetails}
        />
      )}
    </div>
  );
}
