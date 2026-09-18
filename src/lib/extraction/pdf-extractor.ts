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