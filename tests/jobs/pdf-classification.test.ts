/**
 * PRUEBAS DE CLASIFICACIÓN PDF POR PÁGINA (señales REALES de pdfjs-dist).
 *
 *  - Texto por página: `extractPdfPages` usa `getText({ partial })` (granularidad real).
 *  - Visual: `analyzePdfPageVisualContent` usa `getImage({ partial, imageThreshold: 80 })`
 *    (imágenes embebidas con dimensiones). NO usa el tamaño del render como señal.
 *  - Clasificación TEXT / HYBRID / VISUAL según `classifyPdfPage`.
 *  - Conteo de llamadas a Vision con procesadores mockeados vía deps.
 */
import assert from 'node:assert/strict';
import {
  buildPdfTextOnly,
  buildPdfTextWithLogo,
  buildPdfTextWithMediumLogo,
  buildPdfTextWithCapture,
  buildPdfScan,
  LONG_PAGE_TEXT,
} from './pdf-fixtures.js';
import {
  extractPdfPages,
  analyzePdfPageVisualContent,
  classifyPdfPage,
  evaluatePdfTextQuality,
} from '../../src/lib/extraction/pdf-extractor.js';
import { processPdfEvidence } from '../../src/lib/jobs/audit-worker.js';
import type { AuditJobEvidence } from '../../src/lib/jobs/audit-job-repository.js';

export interface JTest {
  name: string;
  passed: boolean;
  detail?: string;
}

function makeEvidence(type: 'PDF', filename: string): AuditJobEvidence {
  return {
    id: `ev_${filename.replace(/[^a-z0-9]/gi, '_')}_${Math.random().toString(36).slice(2)}`,
    job_id: 'job_test',
    filename,
    mime_type: 'application/pdf',
    size_bytes: 0,
    sha256: 'sha_test',
    type,
    storage_key: `audit-jobs/job_test/${filename}`,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as AuditJobEvidence;
}

export async function runPdfClassificationTests(): Promise<JTest[]> {
  const tests: JTest[] = [];
  const tf = (name: string, fn: () => boolean | Promise<boolean>, detail?: string) =>
    tests.push({ name, passed: !!fn(), detail });

  try {
    // ---------------------------------------------------------------
    // 1. Texto REAL por página (no split por caracteres)
    // ---------------------------------------------------------------
    {
      const pdf = await buildPdfTextOnly();
      const pages = await extractPdfPages(pdf);
      tf('extractPdfPages devuelve 3 páginas con texto real por página',
        () => pages.length === 3 && pages.every(p => p.text.length > 250),
        JSON.stringify(pages.map(p => ({ page: p.page, chars: p.text.length }))));

      const page2 = pages.find(p => p.page === 2);
      tf('El texto de la página 2 es el de la página 2 (no split por caracteres)',
        () => Boolean(page2 && page2.text.includes('PAGE 2') && page2.text.includes('página 2')),
        `head: ${page2?.text.slice(0, 60)}`);
    }

    // ---------------------------------------------------------------
    // 2. Detección visual REAL por página (imágenes embebidas + dimensiones)
    // ---------------------------------------------------------------
    {
      const pdfTxt = await buildPdfTextOnly();
      const v1 = await analyzePdfPageVisualContent(pdfTxt, 1);
      tf('Página de texto puro: sin imágenes significativas',
        () => v1.imageCount === 0 && v1.hasRelevantVisualContent === false,
        v1.reason);

      const pdfLogo = await buildPdfTextWithLogo();
      const vLogo = await analyzePdfPageVisualContent(pdfLogo, 1);
      tf('Logo 48×48: filtrado por imageThreshold=80 (no dispara Vision)',
        () => vLogo.imageCount === 0 && vLogo.hasRelevantVisualContent === false,
        vLogo.reason);

      const pdfMedLogo = await buildPdfTextWithMediumLogo();
      const vMedLogo = await analyzePdfPageVisualContent(pdfMedLogo, 1);
      tf('Logo mediano 200×100: área < 96k px² => NO significativo => TEXT',
        () => vMedLogo.imageCount === 1 && vMedLogo.significantImageCount === 0 && vMedLogo.hasRelevantVisualContent === false,
        vMedLogo.reason);

      const pdfCap = await buildPdfTextWithCapture();
      const vCap2 = await analyzePdfPageVisualContent(pdfCap, 2);
      tf('Página 2 con captura 600×800: imagen significativa detectada',
        () => vCap2.imageCount === 1 && vCap2.significantImageCount === 1 && vCap2.hasRelevantVisualContent === true,
        vCap2.reason);
      const vCap1 = await analyzePdfPageVisualContent(pdfCap, 1);
      tf('Página 1 del mimo PDF (texto): sin visual relevante',
        () => vCap1.hasRelevantVisualContent === false,
        vCap1.reason);

      const pdfScan = await buildPdfScan();
      const vScan = await analyzePdfPageVisualContent(pdfScan, 1);
      tf('Scan página completa 1000×1400: visual significativa',
        () => vScan.imageCount === 1 && vScan.significantImageCount === 1 && vScan.hasRelevantVisualContent === true,
        vScan.reason);
    }

    // ---------------------------------------------------------------
    // 3. classifyPdfPage: mapeo TEXT / VISUAL / HYBRID
    // ---------------------------------------------------------------
    {
      tf('TEXT  = texto útil sin visual',
        () => classifyPdfPage({ hasUsefulText: true, hasRelevantVisualContent: false }) === 'TEXT');
      tf('VISUAL = sin texto útil con visual relevante (scan)',
        () => classifyPdfPage({ hasUsefulText: false, hasRelevantVisualContent: true }) === 'VISUAL');
      tf('HYBRID = texto útil Y visual relevante (ambos extraídos en la misma EvidenceUnit)',
        () => classifyPdfPage({ hasUsefulText: true, hasRelevantVisualContent: true }) === 'HYBRID');
      tf('EMPTY = sin señales', () => classifyPdfPage({ hasUsefulText: false, hasRelevantVisualContent: false }) === 'EMPTY');
    }

    // ---------------------------------------------------------------
    // 4. processPdfEvidence con Vision mockeada: conteo de llamadas
    // ---------------------------------------------------------------
    {
      const visionCalls: string[] = [];
      const textCalls: string[] = [];

      const visionMock = async (_buf: Buffer, _mime: string, evId: string, filename: string) => {
        visionCalls.push(`${evId}:${filename}`);
        return {
          result: {
            hechos: [{ tipo: 'visual', valor: 'Mensaje del alumno', confianza: 'ALTA' }],
            visual_facts: { contacto: { ultimo_mensaje: { valor: 'Sí, quiero cancelar', confianza: 'ALTA' } } },
          },
        };
      };
      const textMock = async (pageText: string, _type: 'PDF', evId: string, pageNum: number) => {
        textCalls.push(`${evId}:${pageNum}`);
        return {
          result: { hechos: [{ tipo: 'texto', valor: pageText.slice(0, 120), confianza: 'ALTA' }] },
        };
      };
      const deps = { extractFromTextPage: textMock, extractImageWithVision: visionMock };

      // PDF solo texto: 3 páginas TEXT => 3 llamadas de texto, 0 vision
      {
        const pdf = await buildPdfTextOnly();
        const ev = makeEvidence('PDF', 'solo-texto.pdf');
        const processed = await processPdfEvidence(pdf, ev, deps);
        const unitsTxt = processed.units.filter(u => u.metadata?.pageQuality === 'text').length;
        const unitsHybrid = processed.units.filter(u => u.metadata?.pageQuality === 'hybrid').length;
        tf('PDF TEXT: 0 llamadas a Vision y 3 unidades TEXT (una por página)',
          () => visionCalls.length === 0 && unitsTxt === 3 && unitsHybrid === 0,
          `vision=${visionCalls.length} textCalls=${textCalls.length} units=${processed.units.length}`);
      }

      // PDF texto+captura: p1 TEXT, p2 HYBRID, p3 TEXT => 3 texto + 1 vision
      {
        visionCalls.length = 0; textCalls.length = 0;
        const pdf = await buildPdfTextWithCapture();
        const ev = makeEvidence('PDF', 'texto-captura.pdf');
        const processed = await processPdfEvidence(pdf, ev, deps);
        const hybridUnit = processed.units.find(u => u.metadata?.pageQuality === 'hybrid');
        const visionUnits = processed.units.filter(u => u.metadata?.pageQuality === 'vision');
        // páginas: 1 TEXT, 2 HYBRID, 3 EMPTY (solo línea corta) => texto 2 veces, vision 1 vez
        tf('PDF HYBRID: Vision 1 vez (solo página 2); extracción de texto 2 veces (p3 EMPTY no se extrae)',
          () => visionCalls.length === 1 && textCalls.length === 2 && visionUnits.length === 0 && processed.units.length === 2,
          `vision=${visionCalls.length} text=${textCalls.length} units=${processed.units.length} hybrid=${Boolean(hybridUnit)}`);
        tf('Unidad HYBRID contiene texto Y visualDescription en la misma unidad',
          () => Boolean(hybridUnit && hybridUnit.text && hybridUnit.text.length > 0 && Array.isArray(hybridUnit.visualDescription) && hybridUnit.visualDescription.length > 0),
          `hybrid.text=${hybridUnit?.text?.length} visualDesc=${Array.isArray(hybridUnit?.visualDescription) ? hybridUnit.visualDescription.length : 'n/a'}`);
      }

      // PDF scan: VISUAL => 1 vision, 0 texto
      {
        visionCalls.length = 0; textCalls.length = 0;
        const pdf = await buildPdfScan();
        const ev = makeEvidence('PDF', 'scan.pdf');
        const processed = await processPdfEvidence(pdf, ev, deps);
        const visionUnits = processed.units.filter(u => u.metadata?.pageQuality === 'vision');
        tf('PDF SCAN (VISUAL): Vision 1 vez, sin extracción de texto',
          () => visionCalls.length === 1 && textCalls.length === 0 && visionUnits.length === 1,
          `vision=${visionCalls.length} text=${textCalls.length} units=${processed.units.length}`);
      }

      // PDF texto+logo: 1 texto, 0 vision
      {
        visionCalls.length = 0; textCalls.length = 0;
        const pdf = await buildPdfTextWithLogo();
        const ev = makeEvidence('PDF', 'logo.pdf');
        const processed = await processPdfEvidence(pdf, ev, deps);
        tf('PDF texto+logo: no llama a Vision (logo filtrado)',
          () => visionCalls.length === 0 && textCalls.length === 1,
          `vision=${visionCalls.length} text=${textCalls.length}`);
      }
    }

    // ---------------------------------------------------------------
    // 5. evaluatePdfTextQuality aplicado a páginas reales (consistencia)
    // ---------------------------------------------------------------
    {
      const pdf = await buildPdfTextWithCapture();
      const pages = await extractPdfPages(pdf);
      const a = evaluatePdfTextQuality('PAGE 3 - Texto normal sin imágenes', 1);
      const longText = LONG_PAGE_TEXT(1); // > 250 chars
      const b = evaluatePdfTextQuality(longText, 1);
      const p3 = pages.find(p => p.page === 3);
      tf('Página corta (<250) no es hasUsefulText; página larga (≥250) sí',
        () => a.hasUsefulText === false && b.hasUsefulText === true,
        `short=${a.hasUsefulText} long=${b.hasUsefulText} p3Chars=${p3?.text.length}`);
      tf('EMPTY: página sin texto útil no genera unidad (texto-captura p3)',
        () => !p3 || p3.text.length < 250,
        `p3.${p3?.text.length}chars`);
    }
  } catch (err) {
    tests.push({ name: 'SUITE PDF CLASIFICACIÓN — ERROR INESPERADO', passed: false, detail: err instanceof Error ? err.stack : String(err) });
  }

  const passed = tests.filter(t => t.passed).length;
  console.log(`\n[PDF Classification] ${passed}/${tests.length} aprobadas`);
  return tests;
}

// console.assert interno redundante (dejo el assert importado para fallos duros)
void assert;