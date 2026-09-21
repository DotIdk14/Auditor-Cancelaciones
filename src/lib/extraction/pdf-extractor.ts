export interface PdfTextExtractionResult {
  text: string;
  pages: number;
  pagesWithoutText: number;
  printableRatio: number;
  wordCount: number;
  hasUsefulText: boolean;
  reason: string;
}

export interface RenderedPdfPage {
  page: number;
  mimeType: 'image/png' | 'image/jpeg';
  data: Buffer;
}

function printableRatio(text: string): number {
  if (!text.length) return 0;
  const printable = Array.from(text).filter(ch => /[\p{L}\p{N}\p{P}\p{Zs}\r\n\t]/u.test(ch)).length;
  return printable / Array.from(text).length;
}

function countWords(text: string): number {
  return (text.match(/[\p{L}\p{N}]{2,}/gu) || []).length;
}

function countPagesWithoutText(text: string, pages: number): number {
  if (pages <= 1) return text.trim() ? 0 : 1;
  const approximateCharsPerPage = Math.floor(text.length / pages);
  if (approximateCharsPerPage < 30) return pages;
  return 0;
}

export function evaluatePdfTextQuality(text: string, pages: number): Omit<PdfTextExtractionResult, 'text' | 'pages'> {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const ratio = printableRatio(normalized);
  const wordCount = countWords(normalized);
  const pagesWithoutText = countPagesWithoutText(normalized, pages);
  const repeatedNoise = normalized.length > 0 && normalized.replace(/(.)\1{6,}/g, '').length < normalized.length * 0.7;

  // Heuristica documentada: se considera texto útil solo si hay volumen suficiente,
  // palabras reales, baja proporción de páginas vacías y caracteres mayormente imprimibles.
  const hasUsefulText = normalized.length >= 250
    && wordCount >= 40
    && ratio >= 0.85
    && pagesWithoutText < pages
    && !repeatedNoise;

  const reason = hasUsefulText
    ? 'PDF con texto embebido suficiente'
    : `Texto insuficiente/corrupto: chars=${normalized.length}, words=${wordCount}, printableRatio=${ratio.toFixed(2)}, pagesWithoutText=${pagesWithoutText}/${pages}`;

  return { pagesWithoutText, printableRatio: ratio, wordCount, hasUsefulText, reason };
}

async function loadPdfParse() {
  const mod = await import('pdf-parse');
  return mod.PDFParse;
}

export async function extractPdfTextLocally(buffer: Buffer): Promise<PdfTextExtractionResult> {
  const PDFParse = await loadPdfParse();
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText({ pageJoiner: '\n' });
    const text = (data.text || '').trim();
    const pages = data.total || data.pages.length || 1;
    return { text, pages, ...evaluatePdfTextQuality(text, pages) };
  } finally {
    await parser.destroy();
  }
}

export async function renderPdfPagesToImages(buffer: Buffer, maxPages = 3): Promise<RenderedPdfPage[]> {
  const PDFParse = await loadPdfParse();
  const parser = new PDFParse({ data: buffer });
  try {
    const screenshots = await parser.getScreenshot({ first: maxPages, desiredWidth: 1400, imageBuffer: true, imageDataUrl: false });
    return screenshots.pages.map(page => ({
      page: page.pageNumber,
      mimeType: 'image/png',
      data: Buffer.from(page.data),
    }));
  } finally {
    await parser.destroy();
  }
}

// ============================================================================
// API por página real (pdf-parse@2.4.5 + pdfjs-dist@5.4.296)
// ============================================================================

export interface PdfPageText {
  page: number;
  text: string;
}

export interface PdfPageImageInfo {
  name: string;
  width: number;
  height: number;
}

export interface PdfPageVisualAnalysis {
  hasRelevantVisualContent: boolean;
  imageCount: number;
  significantImageCount: number;
  reason: string;
  images: PdfPageImageInfo[];
}

/**
 * Umbrales documentados para la clasificación visual por página.
 * - El detector NO usa el tamaño del render como señal (señal prohibida por revisión).
 * - Usa imágenes embebidas reales reportadas por `getImage({ partial, imageThreshold })`:
 *   pdf-parse descarta automáticamente imágenes con width O height <= imageThreshold (logos, iconos, trackers).
 * - Una imagen es "significativa" si supera el área mínima y una dimensión mínima,
 *   lo que distingue un logo pequeño de una captura de conversación o un scan.
 */
export const PDF_IMAGE_MIN_DIMENSION_FILTER = 80;       // imageThreshold de pdf-parse
export const PDF_VISUAL_MIN_IMAGE_DIMENSION = 120;      // dimensión mínima (uno de los dos lados)
export const PDF_VISUAL_MIN_IMAGE_AREA = 96_000;        // ~ 240×400 px => capturas y scans

export function isSignificantPdfImage(width: number, height: number): { significant: boolean; reason: string } {
  if (width < PDF_VISUAL_MIN_IMAGE_DIMENSION && height < PDF_VISUAL_MIN_IMAGE_DIMENSION) {
    return { significant: false, reason: `imagen pequeña ${width}x${height}` };
  }
  const area = width * height;
  if (area < PDF_VISUAL_MIN_IMAGE_AREA) {
    return { significant: false, reason: `área ${area}px² < ${PDF_VISUAL_MIN_IMAGE_AREA}` };
  }
  return { significant: true, reason: `imagen significativa ${width}x${height} (área ${area}px²)` };
}

/**
 * Extrae el texto REAL de cada página (granularidad real, no split por caracteres).
 * `getText({ partial })` devuelve textContent de esa página a través de pdfjs-dist.
 */
export async function extractPdfPages(buffer: Buffer): Promise<PdfPageText[]> {
  const PDFParse = await loadPdfParse();
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText({ pageJoiner: '\n' });
    return data.pages.map(p => ({ page: p.num, text: (p.text || '').trim() }));
  } finally {
    await parser.destroy();
  }
}

/**
 * Analiza el contenido visual de UNA página usando imágenes embebidas reales
 * (con dimensiones), no el tamaño del render. Devuelve señales explícitas y testeables.
 */
export async function analyzePdfPageVisualContent(buffer: Buffer, pageNum: number): Promise<PdfPageVisualAnalysis> {
  const PDFParse = await loadPdfParse();
  const parser = new PDFParse({ data: buffer });
  try {
    const img = await parser.getImage({
      partial: [pageNum],
      imageThreshold: PDF_IMAGE_MIN_DIMENSION_FILTER,
      imageDataUrl: false,
      imageBuffer: false,
    });

    const images = (img.pages[0]?.images || []).map(im => ({
      name: im.name,
      width: im.width,
      height: im.height,
    }));

    let significant = 0;
    const details: string[] = [];
    for (const im of images) {
      const s = isSignificantPdfImage(im.width, im.height);
      if (s.significant) significant++;
      details.push(`${im.name}[${im.width}x${im.height}] (${s.reason})`);
    }

    const hasRelevantVisualContent = significant > 0;
    const reason = images.length === 0
      ? `Sin imágenes embebidas >= ${PDF_IMAGE_MIN_DIMENSION_FILTER}px en página ${pageNum}`
      : `${images.length} imagen(es); ${significant} significativa(s): ${details.join('; ')}`;

    return { hasRelevantVisualContent, imageCount: images.length, significantImageCount: significant, reason, images };
  } finally {
    await parser.destroy();
  }
}

/**
 * Renderiza SOLO la página indicada (sin renderizar el documento completo).
 */
export async function renderPdfPageToImage(buffer: Buffer, pageNum: number, desiredWidth = 1400): Promise<Buffer> {
  const PDFParse = await loadPdfParse();
  const parser = new PDFParse({ data: buffer });
  try {
    const shots = await parser.getScreenshot({
      partial: [pageNum],
      desiredWidth,
      imageDataUrl: false,
      imageBuffer: true,
    });
    const page = shots.pages.find(p => p.pageNumber === pageNum) || shots.pages[0];
    if (!page || !page.data) {
      throw new Error(`No se pudo renderizar la página ${pageNum}`);
    }
    return Buffer.from(page.data);
  } finally {
    await parser.destroy();
  }
}

/**
 * Clasificación explícita por página (heurística documentada):
 *   HYBRID = texto útil Y contenido visual relevante
 *   TEXT   = texto útil sin contenido visual relevante
 *   VISUAL = sin texto útil con contenido visual relevante (scan)
 *   EMPTY  = página sin señales aprovechables
 */
export function classifyPdfPage(input: {
  hasUsefulText: boolean;
  hasRelevantVisualContent: boolean;
}): 'TEXT' | 'VISUAL' | 'HYBRID' | 'EMPTY' {
  if (input.hasUsefulText && input.hasRelevantVisualContent) return 'HYBRID';
  if (input.hasUsefulText) return 'TEXT';
  if (input.hasRelevantVisualContent) return 'VISUAL';
  return 'EMPTY';
}