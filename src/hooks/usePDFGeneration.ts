import { useState, useCallback } from 'react';
import { generateCanonicalPDF, canGeneratePDF, generateAuditPDF, type PDFGenerationResult, type AuditPDFOptions, type AuditPDFResult } from '../lib/pdf';
import { AuditCase, ManualOverrides } from '../types/audit';
import { DecisionResult } from '../lib/decision-engine/types';
import type { AuditResult, AuditEvidenceItem } from '../lib/audit/types';

export interface GeneratePDFOptions {
  dictamenText?: string;
  manualOverrides?: ManualOverrides;
}

interface UsePDFGenerationReturn {
  generatePDF: (caseData: AuditCase, decisionResult: DecisionResult | null, options?: GeneratePDFOptions) => Promise<PDFGenerationResult | null>;
  generateAuditPDFFromResult: (resultado: AuditResult, evidencias: AuditEvidenceItem[], evidenceBuffers: AuditPDFOptions['evidenceBuffers']) => Promise<AuditPDFResult | null>;
  isGenerating: boolean;
  error: Error | null;
  lastResult: PDFGenerationResult | null;
  lastAuditResult: AuditPDFResult | null;
  canGenerate: (caseData: AuditCase) => boolean;
}

export function usePDFGeneration(): UsePDFGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<PDFGenerationResult | null>(null);
  const [lastAuditResult, setLastAuditResult] = useState<AuditPDFResult | null>(null);

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

  const generateAuditPDFFromResult = useCallback(
    async (
      resultado: AuditResult,
      evidencias: AuditEvidenceItem[],
      evidenceBuffers: AuditPDFOptions['evidenceBuffers']
    ): Promise<AuditPDFResult | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const result = await generateAuditPDF(resultado, evidencias, { evidenceBuffers });
        setLastAuditResult(result);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Error generando PDF de auditoría');
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
    generateAuditPDFFromResult,
    isGenerating,
    error,
    lastResult,
    lastAuditResult,
    canGenerate: canGeneratePDF,
  };
}
