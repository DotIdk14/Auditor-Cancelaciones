import { PDFDocument, PDFImage, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import type { AuditResult, AuditEvidenceItem } from '../audit/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditPDFOptions {
  /** Raw file buffers for evidence annexes */
  evidenceBuffers: Array<{
    evidenceId: string;
    nombreArchivo: string;
    mimeType: string;
    buffer: Buffer;
  }>;
}

export interface AuditPDFResult {
  pdfBytes: Uint8Array;
  sha256: string;
  version: number;
  generatedAt: string;
  sizeBytes: number;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const TEXT_LEFT = 54;
const TEXT_RIGHT = PAGE_WIDTH - 54;
const BLACK = rgb(0, 0, 0);
const SECTION_BG = rgb(0.75, 0.82, 0.93);
const LABEL_BG = rgb(1, 0.94, 0.76);
const GREEN_BG = rgb(0.81, 0.95, 0.81);
const RED_BG = rgb(1, 0.85, 0.85);
const YELLOW_BG = rgb(1, 0.95, 0.80);
const CYAN_BG = rgb(0.8, 0.95, 0.95);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitize(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function formatDate(value: unknown, fallback = ''): string {
  if (!value) return fallback;
  const raw = String(value);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(value: unknown, fallback = ''): string {
  if (!value) return fallback;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = sanitize(text);
  const output: string[] = [];
  for (const paragraph of normalized.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) { output.push(''); continue; }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) { line = candidate; continue; }
      if (line) output.push(line);
      line = word;
    }
    if (line) output.push(line);
  }
  return output;
}

function drawTextBlock(
  page: PDFPage, text: string, x: number, yTop: number, width: number,
  font: PDFFont, size: number, lineHeight = size + 2
): number {
  const lines = wrapText(text, font, size, width);
  let y = yTop;
  for (const line of lines) {
    if (y < MARGIN + size) break;
    page.drawText(line, { x, y: y - size, size, font, color: BLACK });
    y -= lineHeight;
  }
  return y;
}

function drawCell(page: PDFPage, x: number, y: number, w: number, h: number, fill?: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y: y - h, width: w, height: h, color: fill, borderColor: BLACK, borderWidth: 0.5 });
}

function drawLabelValue(
  page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont },
  label: string, value: string, x: number, y: number, labelW: number, valueW: number, h: number
) {
  drawCell(page, x, y, labelW, h, LABEL_BG);
  drawCell(page, x + labelW, y, valueW, h);
  const lines = wrapText(value, fonts.regular, 8, valueW - 8);
  let ty = y - 10;
  for (const line of lines.slice(0, Math.floor((h - 6) / 10))) {
    page.drawText(line, { x: x + labelW + 4, y: ty, size: 8, font: fonts.regular, color: BLACK });
    ty -= 10;
  }
  page.drawText(sanitize(label), { x: x + 4, y: y - 10, size: 8, font: fonts.bold, color: BLACK });
}

function statusColor(status: string): ReturnType<typeof rgb> {
  switch (status) {
    case 'CUMPLE': return GREEN_BG;
    case 'NO_CUMPLE': return RED_BG;
    case 'NO_ACREDITADO': return YELLOW_BG;
    case 'INCONGRUENCIA': return rgb(1, 0.8, 0.6);
    default: return undefined as any;
  }
}

function impactColor(impact: string): ReturnType<typeof rgb> {
  switch (impact) {
    case 'BLOQUEANTE': return RED_BG;
    case 'RELEVANTE': return YELLOW_BG;
    default: return CYAN_BG;
  }
}

async function computeSHA256(data: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  let hash = 0;
  for (let i = 0; i < data.length; i += 1) {
    hash = ((hash << 5) - hash) + data[i];
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

// ---------------------------------------------------------------------------
// PDF Page builders
// ---------------------------------------------------------------------------

function addCoverPage(
  pdfDoc: PDFDocument, fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont },
  resultado: AuditResult
): void {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 720;

  // Title
  page.drawText('DICTAMEN DE AUDITORÍA', {
    x: TEXT_LEFT, y, size: 18, font: fonts.bold, color: BLACK,
  });
  y -= 30;
  page.drawLine({ start: { x: TEXT_LEFT, y: y + 5 }, end: { x: TEXT_RIGHT, y: y + 5 }, thickness: 2, color: BLACK });
  y -= 20;

  // Policy info
  page.drawText(`Política: ${resultado.politica.codigo} v${resultado.politica.version} (${formatDate(resultado.politica.fecha)})`, {
    x: TEXT_LEFT, y, size: 10, font: fonts.italic, color: BLACK,
  });
  y -= 20;

  // Student data
  const exp = resultado.expediente;
  const fields: Array<[string, string]> = [
    ['Folio', exp.folio || '—'],
    ['Matrícula', exp.matricula || '—'],
    ['Nombre', exp.nombre || '—'],
    ['Nivel', exp.nivel || '—'],
    ['Programa', exp.programa || '—'],
    ['Canal', exp.canal || '—'],
    ['Fecha inicio', formatDate(exp.fechaInicio)],
    ['Fecha solicitud', formatDate(exp.fechaSolicitud)],
    ['Motivo', exp.motivo || '—'],
  ];

  const colW = [120, 400];
  for (const [label, value] of fields) {
    drawLabelValue(page, fonts, label, value, TEXT_LEFT, y, colW[0], colW[1], 20);
    y -= 20;
  }
  y -= 10;

  // Classification
  const classColors: Record<string, ReturnType<typeof rgb>> = {
    CANCELACION_VENTA: RED_BG,
    CANCELACION_VENTA_ILOCALIZABLE: RED_BG,
    CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE: GREEN_BG,
    CANCELACION_VENTA_OPERATIVA: YELLOW_BG,
    CANCELACION_VENTA_PROMESA_NO_CUMPLIDA: YELLOW_BG,
    CANCELACION_DE_MATRICULA: rgb(1, 0.7, 0.7),
    BAJA: RED_BG,
    REQUIERE_REVISION: YELLOW_BG,
  };
  const bgColor = classColors[resultado.resultado.clasificacion] || YELLOW_BG;
  drawCell(page, TEXT_LEFT, y, TEXT_RIGHT - TEXT_LEFT, 30, bgColor);
  page.drawText(`CLASIFICACIÓN: ${resultado.resultado.clasificacion}`, {
    x: TEXT_LEFT + 8, y: y - 12, size: 12, font: fonts.bold, color: BLACK,
  });
  y -= 35;

  drawLabelValue(page, fonts, 'Causa raíz', resultado.resultado.causaRaiz, TEXT_LEFT, y, colW[0], colW[1], 20);
  y -= 20;
  drawLabelValue(page, fonts, 'Confianza', `${(resultado.resultado.confianza * 100).toFixed(0)}%`, TEXT_LEFT, y, colW[0], colW[1], 20);
  y -= 30;

  // Dictamen
  page.drawText('DICTAMEN:', { x: TEXT_LEFT, y, size: 11, font: fonts.bold, color: BLACK });
  y -= 15;
  y = drawTextBlock(page, resultado.resultado.dictamen, TEXT_LEFT, y, TEXT_RIGHT - TEXT_LEFT, fonts.regular, 9, 11);
  y -= 15;

  // Actions
  if (resultado.resultado.accionesPrevistas.length > 0) {
    page.drawText('ACCIONES PREVISTAS:', { x: TEXT_LEFT, y, size: 10, font: fonts.bold, color: BLACK });
    y -= 12;
    for (const accion of resultado.resultado.accionesPrevistas) {
      if (y < MARGIN + 10) break;
      page.drawText(`• ${accion}`, { x: TEXT_LEFT + 8, y, size: 9, font: fonts.regular, color: BLACK });
      y -= 11;
    }
  }
}

function addRulesPages(
  pdfDoc: PDFDocument, fonts: { regular: PDFFont; bold: PDFFont },
  resultado: AuditResult
): void {
  if (resultado.reglasEvaluadas.length === 0) return;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 735;

  page.drawText('EVALUACIÓN DE NORMAS', { x: TEXT_LEFT, y, size: 14, font: fonts.bold, color: BLACK });
  y -= 25;

  const colW = [60, 120, 280];
  // Header
  drawCell(page, TEXT_LEFT, y, colW[0], 16, SECTION_BG);
  drawCell(page, TEXT_LEFT + colW[0], y, colW[1], 16, SECTION_BG);
  drawCell(page, TEXT_LEFT + colW[0] + colW[1], y, colW[2], 16, SECTION_BG);
  page.drawText('Num.', { x: TEXT_LEFT + 4, y: y - 11, size: 8, font: fonts.bold, color: BLACK });
  page.drawText('Estado', { x: TEXT_LEFT + colW[0] + 4, y: y - 11, size: 8, font: fonts.bold, color: BLACK });
  page.drawText('Fundamentación', { x: TEXT_LEFT + colW[0] + colW[1] + 4, y: y - 11, size: 8, font: fonts.bold, color: BLACK });
  y -= 16;

  for (const rule of resultado.reglasEvaluadas) {
    const fundLines = wrapText(rule.fundamentacion, fonts.regular, 7, colW[2] - 8);
    const rowH = Math.max(20, fundLines.length * 9 + 10);

    if (y - rowH < MARGIN + 20) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = 735;
    }

    const bgColor = statusColor(rule.status);
    drawCell(page, TEXT_LEFT, y, colW[0], rowH, bgColor);
    drawCell(page, TEXT_LEFT + colW[0], y, colW[1], rowH, bgColor);
    drawCell(page, TEXT_LEFT + colW[0] + colW[1], y, colW[2], rowH);

    page.drawText(rule.numeral, { x: TEXT_LEFT + 4, y: y - 11, size: 8, font: fonts.bold, color: BLACK });
    page.drawText(rule.status, { x: TEXT_LEFT + colW[0] + 4, y: y - 11, size: 7, font: fonts.regular, color: BLACK });

    let ty = y - 10;
    for (const line of fundLines.slice(0, Math.floor((rowH - 6) / 9))) {
      page.drawText(line, { x: TEXT_LEFT + colW[0] + colW[1] + 4, y: ty, size: 7, font: fonts.regular, color: BLACK });
      ty -= 9;
    }

    y -= rowH;
  }
}

function addInconsistenciesPages(
  pdfDoc: PDFDocument, fonts: { regular: PDFFont; bold: PDFFont },
  resultado: AuditResult
): void {
  if (resultado.incidencias.length === 0) return;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 735;

  page.drawText('INCONGRUENCIAS Y PUNTOS POR REVISAR', { x: TEXT_LEFT, y, size: 14, font: fonts.bold, color: BLACK });
  y -= 25;

  for (const inc of resultado.incidencias) {
    const descLines = wrapText(inc.descripcion, fonts.regular, 8, TEXT_RIGHT - TEXT_LEFT - 10);
    const resLines = inc.resolucionRequerida ? wrapText(inc.resolucionRequerida, fonts.regular, 8, TEXT_RIGHT - TEXT_LEFT - 10) : [];
    const rowH = 30 + descLines.length * 10 + resLines.length * 10;

    if (y - rowH < MARGIN + 20) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = 735;
    }

    const bgColor = impactColor(inc.impacto);
    drawCell(page, TEXT_LEFT, y, TEXT_RIGHT - TEXT_LEFT, rowH, bgColor);

    page.drawText(`[${inc.impacto}] ${inc.titulo}`, { x: TEXT_LEFT + 6, y: y - 12, size: 9, font: fonts.bold, color: BLACK });
    let ty = y - 25;
    for (const line of descLines) {
      page.drawText(line, { x: TEXT_LEFT + 10, y: ty, size: 8, font: fonts.regular, color: BLACK });
      ty -= 10;
    }
    if (resLines.length > 0) {
      page.drawText('Resolución:', { x: TEXT_LEFT + 10, y: ty, size: 8, font: fonts.bold, color: BLACK });
      ty -= 10;
      for (const line of resLines) {
        page.drawText(line, { x: TEXT_LEFT + 14, y: ty, size: 8, font: fonts.regular, color: BLACK });
        ty -= 10;
      }
    }

    y -= rowH + 8;
  }
}

function addEvidenceIndexPage(
  pdfDoc: PDFDocument, fonts: { regular: PDFFont; bold: PDFFont },
  evidencias: AuditEvidenceItem[], annexStartPage: number
): void {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 735;

  page.drawText('ÍNDICE DE EVIDENCIAS', { x: TEXT_LEFT, y, size: 14, font: fonts.bold, color: BLACK });
  y -= 25;

  const colW = [60, 200, 80, 80, 70];
  drawCell(page, TEXT_LEFT, y, colW[0], 16, SECTION_BG);
  drawCell(page, TEXT_LEFT + colW[0], y, colW[1], 16, SECTION_BG);
  drawCell(page, TEXT_LEFT + colW[0] + colW[1], y, colW[2], 16, SECTION_BG);
  drawCell(page, TEXT_LEFT + colW[0] + colW[1] + colW[2], y, colW[3], 16, SECTION_BG);
  drawCell(page, TEXT_LEFT + colW[0] + colW[1] + colW[2] + colW[3], y, colW[4], 16, SECTION_BG);

  page.drawText('#', { x: TEXT_LEFT + 4, y: y - 11, size: 8, font: fonts.bold, color: BLACK });
  page.drawText('Archivo', { x: TEXT_LEFT + colW[0] + 4, y: y - 11, size: 8, font: fonts.bold, color: BLACK });
  page.drawText('Tipo', { x: TEXT_LEFT + colW[0] + colW[1] + 4, y: y - 11, size: 8, font: fonts.bold, color: BLACK });
  page.drawText('Pág. PDF', { x: TEXT_LEFT + colW[0] + colW[1] + colW[2] + 4, y: y - 11, size: 8, font: fonts.bold, color: BLACK });
  page.drawText('Anexo', { x: TEXT_LEFT + colW[0] + colW[1] + colW[2] + colW[3] + 4, y: y - 11, size: 8, font: fonts.bold, color: BLACK });
  y -= 16;

  evidencias.forEach((ev, idx) => {
    if (y < MARGIN + 20) return;
    const rowH = 18;
    drawCell(page, TEXT_LEFT, y, TEXT_RIGHT - TEXT_LEFT, rowH, idx % 2 === 0 ? undefined : rgb(0.96, 0.96, 0.96));

    page.drawText(String(idx + 1), { x: TEXT_LEFT + 4, y: y - 12, size: 8, font: fonts.regular, color: BLACK });
    page.drawText(sanitize(ev.nombreArchivo).slice(0, 35), { x: TEXT_LEFT + colW[0] + 4, y: y - 12, size: 7, font: fonts.regular, color: BLACK });
    page.drawText(ev.tipo, { x: TEXT_LEFT + colW[0] + colW[1] + 4, y: y - 12, size: 8, font: fonts.regular, color: BLACK });
    page.drawText(String(ev.pages || '—'), { x: TEXT_LEFT + colW[0] + colW[1] + colW[2] + 4, y: y - 12, size: 8, font: fonts.regular, color: BLACK });
    page.drawText(String(annexStartPage + idx), { x: TEXT_LEFT + colW[0] + colW[1] + colW[2] + colW[3] + 4, y: y - 12, size: 8, font: fonts.regular, color: BLACK });

    y -= rowH;
  });
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generateAuditPDF(
  resultado: AuditResult,
  evidencias: AuditEvidenceItem[],
  options: AuditPDFOptions
): Promise<AuditPDFResult> {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };

  // 1. Cover page with dictamen
  addCoverPage(pdfDoc, fonts, resultado);

  // 2. Rules evaluation
  addRulesPages(pdfDoc, fonts, resultado);

  // 3. Inconsistencies
  addInconsistenciesPages(pdfDoc, fonts, resultado);

  // 4. Evidence index
  const annexStartPage = pdfDoc.getPageCount() + 1;
  addEvidenceIndexPage(pdfDoc, fonts, evidencias, annexStartPage);

  // 5. Evidence annexes
  for (const ev of options.evidenceBuffers) {
    try {
      if (ev.mimeType === 'application/pdf') {
        // Embed all pages from the PDF
        const srcDoc = await PDFDocument.load(ev.buffer);
        const pages = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        for (const page of pages) {
          pdfDoc.addPage(page);
        }
      } else if (ev.mimeType.startsWith('image/')) {
        // Embed image
        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        let image: PDFImage;
        if (ev.mimeType.includes('png')) {
          image = await pdfDoc.embedPng(ev.buffer);
        } else {
          image = await pdfDoc.embedJpg(ev.buffer);
        }
        const maxW = PAGE_WIDTH - MARGIN * 2;
        const maxH = PAGE_HEIGHT - MARGIN * 2 - 40;
        const scale = Math.min(maxW / image.width, maxH / image.height, 1);
        const imageW = image.width * scale;
        const imageH = image.height * scale;
        const imageX = (PAGE_WIDTH - imageW) / 2;
        const imageY = (PAGE_HEIGHT - imageH) / 2;

        page.drawImage(image, { x: imageX, y: imageY, width: imageW, height: imageH });
        page.drawText(ev.nombreArchivo, {
          x: TEXT_LEFT, y: MARGIN + 10, size: 8, font: fonts.italic, color: BLACK,
        });
      } else if (ev.mimeType.startsWith('audio/')) {
        // Audio: add transcript page
        const transcript = resultado.cobertura.find(c => c.evidenceId === ev.evidenceId);
        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        page.drawText(`AUDIO: ${ev.nombreArchivo}`, { x: TEXT_LEFT, y: 735, size: 12, font: fonts.bold, color: BLACK });
        if (transcript) {
          page.drawText(`Estado: ${transcript.estado}`, { x: TEXT_LEFT, y: 710, size: 9, font: fonts.italic, color: BLACK });
        }
        page.drawText('La transcripción completa se encuentra en el archivo de audio original.', {
          x: TEXT_LEFT, y: 680, size: 9, font: fonts.regular, color: BLACK,
        });
      }
    } catch (error) {
      // Error embedding evidence: add error page
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawText(`ERROR: No se pudo insertar ${ev.nombreArchivo}`, {
        x: TEXT_LEFT, y: 735, size: 12, font: fonts.bold, color: BLACK,
      });
      page.drawText(error instanceof Error ? error.message : 'Error desconocido', {
        x: TEXT_LEFT, y: 710, size: 9, font: fonts.regular, color: BLACK,
      });
    }
  }

  // Save
  const pdfBytes = await pdfDoc.save();
  const sha256 = await computeSHA256(pdfBytes);

  return {
    pdfBytes,
    sha256,
    version: 1,
    generatedAt: new Date().toISOString(),
    sizeBytes: pdfBytes.length,
    pageCount: pdfDoc.getPageCount(),
  };
}
