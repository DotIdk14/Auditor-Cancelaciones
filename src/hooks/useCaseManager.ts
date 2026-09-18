import { useState, useCallback, useMemo } from 'react';
import { AuditCase, CaseStatus } from '../types/audit';
import { Ticket, MVP_TICKETS } from '../mock/tickets';
import { analyzeCancellationCase } from '../lib/decision-engine/decision-engine';
import { DecisionResult } from '../lib/decision-engine/types';

interface UseCaseManagerReturn {
  casesList: Ticket[];
  selectedCase: Ticket | null;
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string) => void;
  addCase: (newCase: Ticket) => void;
  updateCase: (id: string, updates: Partial<Ticket>) => void;
  decisionResult: DecisionResult | null;
  isAnalyzing: boolean;
  reEvaluate: () => void;
  updateDecisionData: (data: Record<string, any>) => void;
}

export function useCaseManager(initialCases: Ticket[] = MVP_TICKETS): UseCaseManagerReturn {
  const [casesList, setCasesList] = useState<Ticket[]>(initialCases);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCases[0]?.id ?? '');
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedCase = useMemo(() => 
    casesList.find(c => c.id === selectedCaseId) ?? null, 
    [casesList, selectedCaseId]
  );

  const reEvaluate = useCallback(() => {
    if (!selectedCase) return;
    setIsAnalyzing(true);
    try {
      const result = analyzeCancellationCase(selectedCase.decisionData);
      setDecisionResult(result);
    } catch (error) {
      console.error('Error evaluating case:', error);
      setDecisionResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedCase]);

  const addCase = useCallback((newCase: Ticket) => {
    setCasesList(prev => [newCase, ...prev]);
    setSelectedCaseId(newCase.id);
  }, []);

  const updateCase = useCallback((id: string, updates: Partial<Ticket>) => {
    setCasesList(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const updateDecisionData = useCallback((data: Record<string, any>) => {
    if (!selectedCase) return;
    const updatedData = { ...selectedCase.decisionData, ...data };
    updateCase(selectedCase.id, { decisionData: updatedData });
    setTimeout(() => reEvaluate(), 0);
  }, [selectedCase, updateCase, reEvaluate]);

  return {
    casesList,
    selectedCase,
    selectedCaseId,
    setSelectedCaseId,
    addCase,
    updateCase,
    decisionResult,
    isAnalyzing,
    reEvaluate,
    updateDecisionData
  };
}