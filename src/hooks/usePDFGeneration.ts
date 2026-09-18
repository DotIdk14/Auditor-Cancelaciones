import { useState, useCallback } from 'react';
import { generateCanonicalPDF, canGeneratePDF, type PDFGenerationResult } from '../lib/pdf';
import { AuditCase, ManualOverrides } from '../types/audit';
import { DecisionResult } from '../lib/decision-engine/types';

export interface GeneratePDFOptions {
  dictamenText?: string;
  manualOverrides?: ManualOverrides;
}

interface UsePDFGenerationReturn {
  generatePDF: (caseData: AuditCase, decisionResult: DecisionResult | null, options?: GeneratePDFOptions) => Promise<PDFGenerationResult | null>;
  isGenerating: boolean;
  error: Error | null;
  lastResult: PDFGenerationResult | null;
  canGenerate: (caseData: AuditCase) => boolean;
}

export function usePDFGeneration(): UsePDFGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<PDFGenerationResult | null>(null);

  const generatePDF = useCallback(
    async (
      caseData: AuditCase,
      decisionResult: DecisionResult | null,
      options: GeneratePDFOptions = {}
    ): Promise<PDFGenerationResult | null> => {
      if (!caseData || !caseData.id) {
        const err = new Error('El caso no está listo para generar PDF');
        setError(err);
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const result = await generateCanonicalPDF(caseData, decisionResult, options);
        setLastResult(result);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Error desconocido al generar PDF');
        setError(e);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    generatePDF,
    isGenerating,
    error,
    lastResult,
    canGenerate: canGeneratePDF,
  };
}