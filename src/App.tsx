import React, { useState, useEffect } from 'react';
import { Sidebar, GlobalNavView } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { CaseHeader, CaseTabType } from './components/audit/CaseHeader';

// New IA v2 Case Views
import { CaseSummaryView } from './components/audit/case-views/CaseSummaryView';
import { CaseEvidencesView } from './components/audit/case-views/CaseEvidencesView';
import { CaseDecisionView } from './components/audit/case-views/CaseDecisionView';
import { CaseDictamenView } from './components/audit/case-views/CaseDictamenView';

// Global Navigation Views
import { CaseSearchList } from './components/audit/CaseSearchList';
import { AuditQueueView } from './components/global/AuditQueueView';
import { ReportsView } from './components/global/ReportsView';
import { PoliciesView } from './components/global/PoliciesView';
import { SettingsView } from './components/global/SettingsView';

// Modals
import { EvidenceViewer } from './components/audit/EvidenceViewer';
import { DecisionTreeModal } from './components/audit/DecisionTreeModal';
import { AddCaseModal } from './components/audit/AddCaseModal';
import { AttachEvidenceModal } from './components/audit/AttachEvidenceModal';

// Data & Engine
import { MOCK_CASES } from './mock/cases';
import { OFFICIAL_POLICY_PDF } from './mock/evidences';
import { analyzeCancellationCase } from './lib/decision-engine/decision-engine';
import { AuditCase, EvidenceItem, DictamenData, CallRecord } from './types/audit';
import { DecisionResult } from './lib/decision-engine/types';

export default function App() {
  const [casesList, setCasesList] = useState<AuditCase[]>(MOCK_CASES || []);
  const [selectedCase, setSelectedCase] = useState<AuditCase>(MOCK_CASES?.[0]);
  
  // Global Navigation: 'cases' | 'queue' | 'reports' | 'policies' | 'settings' | 'case_detail'
  const [activeGlobalView, setActiveGlobalView] = useState<GlobalNavView>('case_detail');

  // Case Internal Navigation: 'summary' | 'evidences' | 'decision' | 'dictamen'
  const [activeCaseTab, setActiveCaseTab] = useState<CaseTabType>('summary');

  // Multiple calls management for active case
  const allCalls: CallRecord[] = [
    selectedCase?.primaryCall || (selectedCase as any)?.callRecord,
    ...(selectedCase?.secondaryCalls || [])
  ].filter(Boolean);

  const [activeCallId, setActiveCallId] = useState<string>(() => 
    selectedCase?.primaryCall?.id || (selectedCase as any)?.callRecord?.id || ''
  );

  // Audio Playback Simulation State
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCase) return;
    const primaryId = selectedCase.primaryCall?.id || (selectedCase as any).callRecord?.id || '';
    setActiveCallId(primaryId);
    setCurrentPlayTime(0);
    setIsPlaying(false);
  }, [selectedCase?.id]);

  const activeCall: CallRecord | undefined = 
    allCalls.find(c => c.id === activeCallId) || allCalls[0];

  // Decision Engine State
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(() => 
    selectedCase?.decisionData ? analyzeCancellationCase(selectedCase.decisionData) : null
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Modals
  const [viewingEvidence, setViewingEvidence] = useState<EvidenceItem | null>(null);
  const [isDecisionTreeOpen, setIsDecisionTreeOpen] = useState<boolean>(false);
  const [isAddCaseOpen, setIsAddCaseOpen] = useState<boolean>(false);
  const [isAttachEvidenceOpen, setIsAttachEvidenceOpen] = useState<boolean>(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddEvidence = (newEvidence: EvidenceItem) => {
    if (!selectedCase) return;
    const updatedEvidences = [newEvidence, ...(selectedCase.evidences || [])];
    const updatedCase: AuditCase = {
      ...selectedCase,
      evidences: updatedEvidences
    };
    setSelectedCase(updatedCase);
    setCasesList(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
    setViewingEvidence(newEvidence);
    showToast(`Evidencia "${newEvidence.name}" incorporada al expediente.`);
  };

  // Audio timer simulation
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentPlayTime(prev => {
          const maxDuration = activeCall?.durationSeconds || 525;
          if (prev >= maxDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeCall]);

  // Recalculate decision when case or its decisionData changes
  useEffect(() => {
    if (!selectedCase || !selectedCase.decisionData) return;
    const res = analyzeCancellationCase(selectedCase.decisionData);
    setDecisionResult(res);
  }, [selectedCase?.id, selectedCase?.decisionData]);

  // Handler: Select a case from anywhere (Search, Queue, Dropdown)
  const handleSelectCase = (caseItem: AuditCase) => {
    setSelectedCase(caseItem);
    setActiveGlobalView('case_detail');
    setActiveCaseTab('summary');
    setCurrentPlayTime(0);
    setIsPlaying(false);
  };

  // Handler: Add a brand new case to the auditor
  const handleAddCase = (newCase: AuditCase) => {
    setCasesList(prev => [newCase, ...prev]);
    setSelectedCase(newCase);
    setActiveGlobalView('case_detail');
    setActiveCaseTab('summary');
    setCurrentPlayTime(0);
    setIsPlaying(false);
    const res = analyzeCancellationCase(newCase.decisionData);
    setDecisionResult(res);
    showToast(`Expediente ${newCase.id} registrado exitosamente.`);
  };

  // Handler: Add call (via Drag-and-Drop or file picker) to current case
  const handleAddCall = (newCall: CallRecord) => {
    if (!selectedCase) return;
    const updatedSecondary = [...(selectedCase.secondaryCalls || []), newCall];
    const updatedLlamadas = (selectedCase.decisionData.llamadas || 1) + 1;
    const updatedContactoEfectivo = selectedCase.decisionData.contactoEfectivo || (newCall.effectiveContact?.efectivo ?? false);

    // Also add an audio evidence item to the evidence list
    const newCallEvidence: EvidenceItem = {
      id: `ev-${newCall.id}`,
      code: `I6-${newCall.id}`,
      name: `Grabación - ${newCall.title}`,
      source: 'I6',
      type: 'audio',
      status: 'DISPONIBLE',
      statusLabel: 'Cargado',
      date: `${newCall.date} ${newCall.time}`,
      description: `Grabación incorporada al expediente mediante diarización. Duración: ${newCall.duration}.`,
      previewType: 'i6_log',
      previewData: {
        callId: newCall.id,
        duracion: newCall.duration,
        sentimiento: newCall.sentiment,
        criteriosContacto: newCall.effectiveContact?.criterios
      }
    };

    const updatedCase: AuditCase = {
      ...selectedCase,
      secondaryCalls: updatedSecondary,
      evidences: [...(selectedCase.evidences || []), newCallEvidence],
      decisionData: {
        ...selectedCase.decisionData,
        llamadas: updatedLlamadas,
        contactoEfectivo: updatedContactoEfectivo
      }
    };

    setSelectedCase(updatedCase);
    setCasesList(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
    setActiveCallId(newCall.id);
    setCurrentPlayTime(0);
    setIsPlaying(false);

    showToast(`Audio ${newCall.id} incorporado al expediente.`);
  };

  // Handler: Run analysis on demand
  const handleRunAnalysis = () => {
    if (!selectedCase) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const res = analyzeCancellationCase(selectedCase.decisionData);
      setDecisionResult(res);
      setIsAnalyzing(false);
      showToast('Motor normativo re-evaluado con éxito.');
    }, 350);
  };

  // Handler: Modify decision data in sandbox
  const handleModifyDecisionData = (key: string, value: any) => {
    if (!selectedCase) return;
    const updatedCase: AuditCase = {
      ...selectedCase,
      decisionData: {
        ...selectedCase.decisionData,
        [key]: value
      }
    };
    setSelectedCase(updatedCase);
    const res = analyzeCancellationCase(updatedCase.decisionData);
    setDecisionResult(res);
  };

  // Handler: Update dictamen text
  const handleUpdateDictamen = (updated: DictamenData) => {
    if (!selectedCase) return;
    const updatedCase: AuditCase = {
      ...selectedCase,
      dictamen: updated
    };
    setSelectedCase(updatedCase);
    setCasesList(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
    showToast('Dictamen actualizado.');
  };

  // Handler: Approve dictamen (Simulated approval)
  const handleApproveDictamen = () => {
    if (!selectedCase) return;
    const now = new Date().toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const approvedDictamen: DictamenData = {
      ...selectedCase.dictamen,
      status: 'APROBADO',
      approvedBy: 'Ian Jarquín (Auditor de Calidad)',
      approvedAt: now
    };

    const updatedCase: AuditCase = {
      ...selectedCase,
      status: 'APROBADO',
      statusLabel: 'Dictaminado / Aprobado',
      dictamen: approvedDictamen
    };

    setSelectedCase(updatedCase);
    setCasesList(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
    showToast('¡Dictamen aprobado y certificado con éxito!');
  };

  if (!selectedCase) {
    return <div className="flex h-screen bg-zinc-950 items-center justify-center text-zinc-400">Cargando aplicación...</div>;
  }

  return (
    <div className="flex h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* 1. Global Sidebar Navigation */}
      <Sidebar
        activeView={activeGlobalView}
        onSelectView={(view) => {
          setActiveGlobalView(view);
        }}
        currentCase={selectedCase}
      />

      {/* 2. Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Navbar */}
        <TopNavbar
          currentCase={selectedCase}
          allCases={casesList}
          onSelectCase={handleSelectCase}
          onOpenPolicyDoc={() => setViewingEvidence(OFFICIAL_POLICY_PDF)}
          onOpenAddCaseModal={() => setIsAddCaseOpen(true)}
          activeGlobalView={activeGlobalView}
          activeCaseTab={activeCaseTab}
          onNavigateGlobal={(view) => setActiveGlobalView(view)}
        />

        {/* Dynamic Main View */}
        <div className="flex-1 overflow-y-auto">
          {/* A. Global: Lista General de Casos */}
          {activeGlobalView === 'cases' && (
            <div className="p-6 max-w-7xl mx-auto">
              <CaseSearchList
                cases={casesList}
                selectedCaseId={selectedCase.id}
                onSelectCase={handleSelectCase}
                onOpenAddCaseModal={() => setIsAddCaseOpen(true)}
              />
            </div>
          )}

          {/* B. Global: Cola de Auditoría */}
          {activeGlobalView === 'queue' && (
            <AuditQueueView
              cases={casesList}
              onSelectCase={handleSelectCase}
            />
          )}

          {/* C. Global: Reportes */}
          {activeGlobalView === 'reports' && (
            <ReportsView cases={casesList} />
          )}

          {/* D. Global: Políticas */}
          {activeGlobalView === 'policies' && (
            <PoliciesView />
          )}

          {/* E. Global: Configuración */}
          {activeGlobalView === 'settings' && (
            <SettingsView />
          )}

          {/* F. Case Detail: 4 Focused Views */}
          {activeGlobalView === 'case_detail' && (
            <div className="flex flex-col min-h-full">
              {/* Case Header with 4 tabs: Resumen, Evidencias, Decisión, Dictamen */}
              <CaseHeader
                caseData={selectedCase}
                activeTab={activeCaseTab}
                onSelectTab={setActiveCaseTab}
                onBackToCases={() => setActiveGlobalView('cases')}
              />

              {/* View Content based on activeTab */}
              <main className="p-4 md:p-6 max-w-[1700px] w-full mx-auto flex-1">
                {activeCaseTab === 'summary' && (
                  <CaseSummaryView
                    currentCase={selectedCase}
                    caseData={selectedCase}
                    decisionResult={decisionResult}
                    onNavigateToTab={(tab) => setActiveCaseTab(tab)}
                    onNavigateToEvidences={() => setActiveCaseTab('evidences')}
                    onNavigateToDecision={() => setActiveCaseTab('decision')}
                  />
                )}

                {activeCaseTab === 'evidences' && (
                  <CaseEvidencesView
                    currentCase={selectedCase}
                    caseData={selectedCase}
                    activeCall={activeCall}
                    allCalls={allCalls}
                    activeCallId={activeCallId}
                    currentPlayTime={currentPlayTime}
                    isPlaying={isPlaying}
                    onSelectCall={(callId) => {
                      setActiveCallId(callId);
                      setCurrentPlayTime(0);
                      setIsPlaying(false);
                    }}
                    onAddCall={handleAddCall}
                    onTogglePlay={() => setIsPlaying(!isPlaying)}
                    onSeek={(sec) => setCurrentPlayTime(sec)}
                    onSelectEvidence={(ev) => setViewingEvidence(ev)}
                    onAddNewEvidence={() => setIsAttachEvidenceOpen(true)}
                    onNavigateToDecision={() => setActiveCaseTab('decision')}
                  />
                )}

                {activeCaseTab === 'decision' && (
                  <CaseDecisionView
                    decisionResult={decisionResult}
                    caseData={selectedCase}
                    isAnalyzing={isAnalyzing}
                    onRunAnalysis={handleRunAnalysis}
                    onOpenDecisionTree={() => setIsDecisionTreeOpen(true)}
                    onModifyDecisionData={handleModifyDecisionData}
                    onNavigateToDictamen={() => setActiveCaseTab('dictamen')}
                  />
                )}

                {activeCaseTab === 'dictamen' && (
                  <CaseDictamenView
                    dictamen={selectedCase.dictamen}
                    caseData={selectedCase}
                    decisionResult={decisionResult ?? undefined}
                    onUpdateDictamen={handleUpdateDictamen}
                    onApproveDictamen={handleApproveDictamen}
                    onNavigateToDecision={() => setActiveCaseTab('decision')}
                  />
                )}
              </main>
            </div>
          )}
        </div>
      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-800 text-zinc-100 text-xs px-4 py-2.5 rounded-xl border border-zinc-700 shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Evidence Viewer Drawer/Modal */}
      <EvidenceViewer
        evidence={viewingEvidence}
        onClose={() => setViewingEvidence(null)}
      />

      {/* 2. Full Decision Tree & Reasoning Modal */}
      {isDecisionTreeOpen && (
        <DecisionTreeModal
          decisionResult={decisionResult}
          decisionData={selectedCase.decisionData}
          onClose={() => setIsDecisionTreeOpen(false)}
        />
      )}

      {/* 3. Add New Case Modal */}
      <AddCaseModal
        isOpen={isAddCaseOpen}
        onClose={() => setIsAddCaseOpen(false)}
        onAddCase={handleAddCase}
      />

      {/* 4. Attach Evidence Modal */}
      <AttachEvidenceModal
        isOpen={isAttachEvidenceOpen}
        onClose={() => setIsAttachEvidenceOpen(false)}
        onAddEvidence={handleAddEvidence}
        currentCaseId={selectedCase?.id || 'CAVE-30274'}
      />
    </div>
  );
}
