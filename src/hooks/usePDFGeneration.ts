import { useState, useCallback } from 'react';
import { generateCanonicalPDF, canGeneratePDF, type PDFGenerationResult } from '../lib/pdf';

interface UsePDFGenerationReturn {
  generatePDF: (caseData: any, decisionResult: any) => Promise<PDFGenerationResult | null>;
  isGenerating: boolean;
  error: Error | null;
  lastResult: PDFGenerationResult | null;
  canGenerate: (caseData: any) => boolean;
}

export function usePDFGeneration(): UsePDFGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<PDFGenerationResult | null>(null);

  const generatePDF = useCallback(async (caseData: any, decisionResult: any): Promise<PDFGenerationResult | null> => {
    if (!canGeneratePDF(caseData)) {
      const err = new Error('El ticket no está en estado válido para generar PDF (requiere DICTAMEN_PROPUESTO o superior)');
      setError(err);
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateCanonicalPDF(caseData, decisionResult);
      setLastResult(result);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Error desconocido al generar PDF');
      setError(e);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generatePDF,
    isGenerating,
    error,
    lastResult,
    canGenerate: canGeneratePDF,
  };
}