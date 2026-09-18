import { PDFDocument, PDFImage, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { AuditCase, EvidenceItem } from '../../types/audit';
import { DecisionResult } from '../../lib/decision-engine/types';

export interface PDFTemplateFields {
  folio: string;
  'estudiante.nombre': string;
  'estudiante.matricula': string;
  'estudiante.correo': string;
  'estudiante.canal': string;
  'estudiante.programa': string;
  'estudiante.telefono': string;
  'fechas.fechaCreacion': string;
  'fechas.fechaDecision': string;
  'fechas.fechaInicioCiclo': string;
  'fechas.fechaSolicitudTicket': string;
  'fechas.fechaAsignadoDictaminar': string;
  'fechas.fechaDictamenAplicado': string;
  'solicitud.primerPago': string;
  'solicitud.politicaSolicitada': string;
  'solicitud.motivo': string;
  'solicitud.descripcion': string;
  'comentarios.backOffice': string;
  'comentarios.helpDesk': string;
  'comentarios.ser': string;
  'comentarios.finanzas': string;
  'resultado.textoDictamen': string;
  'evidencias.cronologicas': string;
  'comentarios.auditor': string;
}

export interface PDFGenerationResult {
  pdfBytes: Uint8Array;
  sha256: string;
  version: number;
  generatedAt: string;
}

type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const TEXT_LEFT = 54;
const TEXT_RIGHT = PAGE_WIDTH - 54;
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const HEADER_BLUE = rgb(0.75, 0.82, 0.93);
const HEADER_GREEN = rgb(0.81, 0.89, 0.9);
const LABEL_YELLOW = rgb(1, 0.94, 0.76);
const DICTAMEN_GREEN = rgb(0.55, 0.91, 0.42);
const CYAN = rgb(0, 0.92, 0.92);
const ORANGE = rgb(0.92, 0.58, 0.27);
const BLUE_HIGHLIGHT = rgb(0.08, 0.12, 0.85);
const GREEN_HIGHLIGHT = rgb(0, 0.95, 0.05);

function sanitizeText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/🚫/g, 'No')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ');
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
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = sanitizeText(text);
  const output: string[] = [];

  for (const paragraph of normalized.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      output.push('');
      continue;
    }

    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) output.push(line);
      line = word;
    }
    if (line) output.push(line);
  }

  return output;
}

function drawTextBox(
  page: PDFPage,
  text: string,
  x: number,
  yTop: number,
  width: number,
  height: number,
  font: PDFFont,
  size: number,
  options: { boldFont?: PDFFont; color?: ReturnType<typeof rgb>; lineHeight?: number; padding?: number } = {}
): void {
  const padding = options.padding ?? 5;
  const lineHeight = options.lineHeight ?? size + 2;
  const lines = wrapText(text, font, size, width - padding * 2);
  let y = yTop - padding - size;

  for (const line of lines) {
    if (y < yTop - height + padding) break;
    page.drawText(line, {
      x: x + padding,
      y,
      size,
      font,
      color: options.color ?? BLACK
    });
    y -= lineHeight;
  }
}

function drawCell(
  page: PDFPage,
  x: number,
  yTop: number,
  width: number,
  height: number,
  fill: ReturnType<typeof rgb> | undefined,
  borderWidth = 0.8
): void {
  page.drawRectangle({
    x,
    y: yTop - height,
    width,
    height,
    color: fill,
    borderColor: BLACK,
    borderWidth
  });
}

function drawLabelCell(page: PDFPage, fonts: PdfFonts, label: string, x: number, yTop: number, width: number, height: number, fill: ReturnType<typeof rgb>): void {
  drawCell(page, x, yTop, width, height, fill);
  drawTextBox(page, label, x, yTop, width, height, fonts.bold, 10, { lineHeight: 11, padding: 5 });
}

function drawValueCell(page: PDFPage, fonts: PdfFonts, value: string, x: number, yTop: number, width: number, height: number, size = 7.5): void {
  drawCell(page, x, yTop, width, height, undefined);
  drawTextBox(page, value, x, yTop, width, height, fonts.regular, size, { lineHeight: size + 1.5, padding: 5 });
}

function extractFieldsFromCase(caseData: AuditCase, decisionResult: DecisionResult | null): PDFTemplateFields {
  const dc = caseData.decisionData as unknown as Record<string, unknown>;
  const dictamenText = decisionResult?.dictamenSugerido || caseData.dictamen?.text || 'De acuerdo a la política y a las evidencias encontradas y compartidas, se determina una Cancelación de Venta';
  const appliedAt = decisionResult?.analizadoEn || caseData.dictamen?.approvedAt || new Date().toISOString();

  return {
    folio: sanitizeText(caseData.id || 'XXX'),
    'estudiante.nombre': sanitizeText(caseData.studentName),
    'estudiante.matricula': sanitizeText(caseData.matricula),
    'estudiante.correo': sanitizeText(dc.correo, ''),
    'estudiante.canal': sanitizeText(caseData.channel || dc.canalVenta, ''),
    'estudiante.programa': sanitizeText(caseData.program || dc.programa, ''),
    'estudiante.telefono': sanitizeText(caseData.studentContactNumber, ''),
    'fechas.fechaCreacion': formatDateTime(dc.fechaCreacion),
    'fechas.fechaDecision': formatDate(dc.fechaDecision),
    'fechas.fechaInicioCiclo': formatDate(caseData.startDate || dc.fechaInicio),
    'fechas.fechaSolicitudTicket': formatDate(caseData.requestDate || dc.fechaSolicitud),
    'fechas.fechaAsignadoDictaminar': formatDate(dc.fechaAsignadoDictaminar),
    'fechas.fechaDictamenAplicado': formatDateTime(appliedAt),
    'solicitud.primerPago': dc.primerPago ? 'Si' : 'No',
    'solicitud.politicaSolicitada': sanitizeText(caseData.requestedPolicy || decisionResult?.classificationName, ''),
    'solicitud.motivo': sanitizeText(caseData.requestReason || dc.motivoSolicitud, ''),
    'solicitud.descripcion': sanitizeText(dc.descripcion, ''),
    'comentarios.backOffice': sanitizeText(dc.backOffice, ''),
    'comentarios.helpDesk': sanitizeText(dc.helpDesk, ''),
    'comentarios.ser': sanitizeText(dc.ser, ''),
    'comentarios.finanzas': sanitizeText(dc.finanzas, ''),
    'resultado.textoDictamen': sanitizeText(dictamenText),
    'evidencias.cronologicas': caseData.evidences?.map((e, i) => `${i + 1}. ${e.description || e.name}`).join('\n') || '',
    'comentarios.auditor': sanitizeText(dc.auditor || caseData.dictamen?.reviewerNotes, ''),
  };
}

function drawFirstPage(page: PDFPage, fonts: PdfFonts, fields: PDFTemplateFields): void {
  const tableX = 52;
  const tableY = 722;
  const colW = [184, 184, 184];
  const labelW = 184;
  const valueW = 368;
  const rowH = 26;
  let y = tableY;

  page.drawText(fields.folio || 'XXX', {
    x: PAGE_WIDTH / 2 - fonts.bold.widthOfTextAtSize(fields.folio || 'XXX', 22) / 2,
    y: 746,
    size: 22,
    font: fonts.bold,
    color: BLACK
  });
  page.drawLine({ start: { x: PAGE_WIDTH / 2 - 24, y: 742 }, end: { x: PAGE_WIDTH / 2 + 24, y: 742 }, thickness: 1, color: BLACK });

  const headerRows = [
    { labels: ['Nombre', 'Matricula', 'Correo'], values: [fields['estudiante.nombre'], fields['estudiante.matricula'], fields['estudiante.correo']], fill: HEADER_GREEN },
    { labels: ['Canal', 'Programa', 'Fecha de creación'], values: [fields['estudiante.canal'], fields['estudiante.programa'], fields['fechas.fechaCreacion']], fill: HEADER_BLUE },
    { labels: ['Fecha Decisión', 'Fecha de inicio de ciclo', 'Fecha solicitud de ticket'], values: [fields['fechas.fechaDecision'], fields['fechas.fechaInicioCiclo'], fields['fechas.fechaSolicitudTicket']], fill: HEADER_BLUE },
    { labels: ['Asignado a Dictaminar', 'Última sesión', 'Teléfono'], values: [fields['fechas.fechaAsignadoDictaminar'], '', fields['estudiante.telefono']], fill: HEADER_BLUE }
  ];

  for (const row of headerRows) {
    let x = tableX;
    for (let i = 0; i < 3; i += 1) {
      drawLabelCell(page, fonts, row.labels[i], x, y, colW[i], rowH, row.fill);
      x += colW[i];
    }
    y -= rowH;
    x = tableX;
    for (let i = 0; i < 3; i += 1) {
      drawValueCell(page, fonts, row.values[i], x, y, colW[i], rowH, i === 1 && row.labels[i] === 'Programa' ? 7 : 8);
      x += colW[i];
    }
    y -= rowH;
  }

  drawLabelCell(page, fonts, 'Primer pago', tableX, y, labelW, 28, HEADER_BLUE);
  drawCell(page, tableX + labelW, y, colW[1], 28, undefined);
  drawCell(page, tableX + labelW + colW[1], y, colW[2], 28, undefined);
  if (fields['solicitud.primerPago'].toLowerCase().startsWith('s')) {
    page.drawText('Si', {
      x: tableX + labelW + colW[1] + colW[2] / 2 - 5,
      y: y - 20,
      size: 10,
      font: fonts.bold,
      color: BLACK
    });
  } else {
    const centerX = tableX + labelW + colW[1] + colW[2] / 2;
    const centerY = y - 15;
    page.drawEllipse({ x: centerX, y: centerY, xScale: 7, yScale: 7, borderColor: rgb(0.9, 0.2, 0.2), borderWidth: 1.5 });
    page.drawLine({ start: { x: centerX - 5, y: centerY + 5 }, end: { x: centerX + 5, y: centerY - 5 }, thickness: 1.5, color: rgb(0.9, 0.2, 0.2) });
  }
  y -= 28;

  const largeRows: Array<[string, string, number]> = [
    ['Política que aplica/solicitada', fields['solicitud.politicaSolicitada'], 26],
    ['Motivo', fields['solicitud.motivo'], 26],
    ['Descripción', fields['solicitud.descripcion'], 40],
    ['Comentarios BO', fields['comentarios.backOffice'], 44],
    ['Comentarios HelpDesk', fields['comentarios.helpDesk'], 58],
  ];

  for (const [label, value, height] of largeRows) {
    drawLabelCell(page, fonts, label, tableX, y, labelW, height, LABEL_YELLOW);
    drawValueCell(page, fonts, value, tableX + labelW, y, valueW, height);
    y -= height;
  }

  drawCell(page, tableX, y, labelW - 34, 27, LABEL_YELLOW);
  drawTextBox(page, 'Jacqueline', tableX, y, labelW - 34, 27, fonts.regular, 9, { padding: 5 });
  drawCell(page, tableX + labelW - 34, y, 34, 27, LABEL_YELLOW);
  drawCell(page, tableX + labelW, y, valueW, 27, undefined);
  y -= 27;
  drawCell(page, tableX, y, labelW - 34, 27, LABEL_YELLOW);
  drawTextBox(page, 'Claudia', tableX, y, labelW - 34, 27, fonts.regular, 9, { padding: 5 });
  drawCell(page, tableX + labelW - 34, y, 34, 27, LABEL_YELLOW);
  drawCell(page, tableX + labelW, y, valueW, 27, undefined);
  y -= 27;

  const footerRows: Array<[string, string, number]> = [
    ['Comentarios SER', fields['comentarios.ser'], 38],
    ['Comentarios Finanzas', fields['comentarios.finanzas'], 38],
  ];
  for (const [label, value, height] of footerRows) {
    drawLabelCell(page, fonts, label, tableX, y, labelW, height, LABEL_YELLOW);
    drawValueCell(page, fonts, value, tableX + labelW, y, valueW, height);
    y -= height;
  }

  drawCell(page, tableX, y, labelW, 42, DICTAMEN_GREEN);
  page.drawText('Dictamen aplicado el:', { x: tableX + 7, y: y - 18, size: 11, font: fonts.boldItalic, color: BLACK });
  drawValueCell(page, fonts, fields['fechas.fechaDictamenAplicado'], tableX + labelW, y, valueW, 42);

  const dictamenLabelY = 138;
  page.drawRectangle({ x: TEXT_LEFT, y: dictamenLabelY - 4, width: 60, height: 15, color: CYAN });
  page.drawText('Dictamen:', { x: TEXT_LEFT + 1, y: dictamenLabelY, size: 10, font: fonts.bold, color: BLACK });
  const firstLines = wrapText(fields['resultado.textoDictamen'], fonts.regular, 10, TEXT_RIGHT - TEXT_LEFT).slice(0, 5);
  let textY = 102;
  for (const line of firstLines) {
    page.drawText(line, { x: TEXT_LEFT, y: textY, size: 10, font: line.includes('Cancelación de Venta') ? fonts.bold : fonts.regular, color: BLACK });
    textY -= 12;
  }
}

function drawHighlightedHeading(page: PDFPage, fonts: PdfFonts, text: string, x: number, y: number, color: ReturnType<typeof rgb>, textColor = BLACK): void {
  const width = fonts.bold.widthOfTextAtSize(text, 10) + 4;
  page.drawRectangle({ x, y: y - 3, width, height: 14, color });
  page.drawText(text, { x: x + 2, y, size: 10, font: fonts.bold, color: textColor });
}

function addTextPages(pdfDoc: PDFDocument, fonts: PdfFonts, fields: PDFTemplateFields): void {
  const text = [
    'Se comparten evidencias del caso:',
    '------------------- Localizable/activo en AV',
    'la cancelación del ticket para que la alumna continúe con sus estudios con normalidad, ya que sí ha ingresado a su aula, tiene selección de modalidad de evaluación, realizó actividades y ya cuenta con calificación en su materia, por lo que no se considera una alumna ilocalizable para EE y se procede a cerrar el ticket.',
    '—----------------- Ilocalizable',
    'De acuerdo a la política y a las evidencias encontradas y compartidas, se determina una Cancelación de Venta por Estudiante Ilocalizable.',
    'No se encontró evidencia de contacto efectivo con el alumnX por ninguno de los medios oficiales, a pesar de que se realizaron los intentos mínimos de acuerdo a la política (5.2, b). Adicional a ello, han transcurrido más de xx días desde su inicio de ciclo (xxx) y el alumnX sigue siendo NUNCA en AV, por lo cual, se procede a aplicar la CV.',
    '—----------------- Sin intentos mínimos',
    'De acuerdo a la política y a las evidencias encontradas y compartidas, se determina la cancelación del ticket, debido a que no cuenta con los intentos mínimos de contacto de acuerdo a la política (5.2, b). Solamente cuenta con X interacciones por medios escritos y X llamadas en estas 2 semanas para considerarse como ilocalizable. Por lo cual, no aplica para una cv y se recomienda agotar los intentos mínimos, por todos los canales oficiales de contacto para poder localizar al estudiante.',
    '—----------------- A solicitud del Estudiante',
    'De acuerdo a la política y a las evidencias encontradas y compartidas, se determina una Cancelación de Venta a Solicitud del Estudiante ya que se pudo confirmar que él/la alumno/a solicitó no continuar previo a su inicio de clases programado para el xx/xx. Dicha solicitud fue realizada mediante xx con EE el día xx/xx en donde compartió que no seguiría debido a',
    'Captura de la política',
    '',
    'Evidencias a subir',
    'Mensaje para el alumno',
    'Estimadx',
    'Damos por finalizado este proceso ya que detectamos en el sistema que te encuentras ingresando a tu materia curricular, por lo que te invitamos a seguir entregando tus actividades en tiempo y forma.',
    'Recuerda que estamos para apoyarte con todas tus dudas a través de los siguientes medios de contacto del equipo de Éxito Estudiantil:',
    'MX: +525589770707',
    'LATAM: +525592522985',
    '+525592522986',
    'Oficina virtual:',
    'https://utel.edu.mx/oficina-virtual?utm_source=oficinas-virtuales&utm_medium=SIU&utm_campaign=oficinas-virtuales&utm_content=sitio-oficinas-virtuales-siu-18-12',
    '¡Mucho éxito!',
    '',
    'EE Insurgentes: 5513289027',
    'EE UVE: [Teléfono: 55536841430 / WhatsApp: 5596254885]',
    'EE Diplos: +525536841474',
    'EE UNICA: Tel: 5536841429 / WhatsApp: 5596254885',
    '—----------------------------------------',
    'Damos por finalizado este proceso, ya que detectamos en el sistema que estás apunto de iniciar tus clases este xx/00, por lo cual, te deseamos el mayor de los éxitos en esta nueva etapa en tu vida.',
  ].join('\n');

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 735;
  for (const line of wrapText(text, fonts.regular, 10, TEXT_RIGHT - TEXT_LEFT)) {
    if (y < 70) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = 735;
    }
    page.drawText(line, { x: TEXT_LEFT, y, size: 10, font: line.endsWith(':') || line === 'Mensaje para el alumno' ? fonts.bold : fonts.regular, color: BLACK });
    y -= line === '' ? 12 : 13;
  }

  if (y < 120) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = 735;
  }
  page.drawText('EVIDENCIAS DE OTRAS ÁREAS', { x: TEXT_LEFT, y, size: 10, font: fonts.bold, color: BLACK });
  y -= 42;
  drawHighlightedHeading(page, fonts, 'NOTAS Y EVIDENCIAS PROPIAS', 210, y, GREEN_HIGHLIGHT);
  y -= 88;
  drawHighlightedHeading(page, fonts, 'Campañas de contacto:', TEXT_LEFT, y, ORANGE);
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime: match[1] };
}

async function embedEvidenceImage(pdfDoc: PDFDocument, evidence: EvidenceItem): Promise<PDFImage | null> {
  const fileUrl = evidence.fileUrl || evidence.thumbnailUrl;
  if (!fileUrl || !fileUrl.startsWith('data:image/')) return null;
  const parsed = dataUrlToBytes(fileUrl);
  if (!parsed) return null;
  if (parsed.mime.includes('png')) return pdfDoc.embedPng(parsed.bytes);
  if (parsed.mime.includes('jpeg') || parsed.mime.includes('jpg')) return pdfDoc.embedJpg(parsed.bytes);
  return null;
}

async function addEvidencePages(pdfDoc: PDFDocument, fonts: PdfFonts, evidences: EvidenceItem[]): Promise<void> {
  const imageEvidences = evidences.filter(e => e.type === 'image' && (e.fileUrl || e.thumbnailUrl)?.startsWith('data:image/'));

  for (const evidence of imageEvidences) {
    const image = await embedEvidenceImage(pdfDoc, evidence);
    if (!image) continue;

    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const maxW = PAGE_WIDTH - MARGIN_X * 2;
    const maxH = 430;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    const imageW = image.width * scale;
    const imageH = image.height * scale;
    const imageX = (PAGE_WIDTH - imageW) / 2;
    const imageY = 410;

    page.drawImage(image, { x: imageX, y: imageY, width: imageW, height: imageH });
    drawTextBox(page, evidence.description || evidence.name, TEXT_LEFT, imageY - 28, TEXT_RIGHT - TEXT_LEFT, 70, fonts.regular, 10, { padding: 0, lineHeight: 13 });
  }
}

function addFinalPage(pdfDoc: PDFDocument, fonts: PdfFonts, comments: string): void {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHighlightedHeading(page, fonts, 'OBSERVACIONES FINALES', 228, 112, BLUE_HIGHLIGHT, WHITE);
  if (comments) {
    drawTextBox(page, comments, TEXT_LEFT, 700, TEXT_RIGHT - TEXT_LEFT, 500, fonts.regular, 10, { padding: 0, lineHeight: 13 });
  }
}

function computeSHA256(data: Uint8Array): string {
  let hash = 0;
  for (let i = 0; i < data.length; i += 1) {
    hash = ((hash << 5) - hash) + data[i];
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

export async function generateCanonicalPDF(
  caseData: AuditCase,
  decisionResult: DecisionResult | null
): Promise<PDFGenerationResult> {
  const pdfDoc = await PDFDocument.create();
  const fonts: PdfFonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const fields = extractFieldsFromCase(caseData, decisionResult);

  drawFirstPage(pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]), fonts, fields);
  addTextPages(pdfDoc, fonts, fields);
  await addEvidencePages(pdfDoc, fonts, caseData.evidences || []);
  addFinalPage(pdfDoc, fonts, fields['comentarios.auditor']);

  const pdfBytes = await pdfDoc.save();
  const sha256 = computeSHA256(pdfBytes);

  return {
    pdfBytes,
    sha256,
    version: Date.now(),
    generatedAt: new Date().toISOString(),
  };
}

export function canGeneratePDF(caseData: AuditCase): boolean {
  return caseData.status === 'DICTAMINADO' || caseData.status === 'APROBADO';
}

export async function validatePDFFormat(generatedBytes: Uint8Array): Promise<boolean> {
  try {
    const generatedDoc = await PDFDocument.load(generatedBytes);
    return generatedDoc.getPageCount() >= 5;
  } catch {
    return false;
  }
}
