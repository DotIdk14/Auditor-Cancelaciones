import { useState, useCallback, useMemo } from 'react';
import { CancellationCase, CaseDecisionData } from '../lib/decision-engine/types';
import { analyzeCancellationCase } from '../lib/decision-engine/decision-engine';
import { DecisionResult } from '../lib/decision-engine/types';

interface UseDecisionEvaluationReturn {
  result: DecisionResult | null;
  loading: boolean;
  error: Error | null;
  evaluate: (caseData: CancellationCase | CaseDecisionData) => Promise<DecisionResult>;
  evaluateSync: (caseData: CancellationCase | CaseDecisionData) => DecisionResult;
}

export function useDecisionEvaluation(): UseDecisionEvaluationReturn {
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const evaluate = useCallback(async (caseData: CancellationCase | CaseDecisionData): Promise<DecisionResult> => {
    setLoading(true);
    setError(null);
    try {
      const decisionResult = analyzeCancellationCase(caseData);
      setResult(decisionResult);
      return decisionResult;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error');
      setError(e);
      setResult(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const evaluateSync = useCallback((caseData: CancellationCase | CaseDecisionData): DecisionResult => {
    try {
      const decisionResult = analyzeCancellationCase(caseData);
      setResult(decisionResult);
      return decisionResult;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error');
      setError(e);
      setResult(null);
      throw e;
    }
  }, []);

  return useMemo(() => ({
    result,
    loading,
    error,
    evaluate,
    evaluateSync
  }), [result, loading, error, evaluate, evaluateSync]);
}