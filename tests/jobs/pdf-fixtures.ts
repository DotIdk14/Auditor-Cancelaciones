/**
 * Fixtures REALES generados con pdf-lib + @napi-rs/canvas.
 * Se generan en memoria (no dependen de red ni de archivos previos).
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';

export async function makePng(width: number, height: number, color: [number, number, number], label: string): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.font = `${Math.min(20, Math.floor(height / 8))}px sans-serif`;
  ctx.fillText(label, 8, Math.min(24, height - 8));
  return Buffer.from(await canvas.encode('png'));
}

export function wrapText(draw: (line: string, y: number) => void, font: { widthOfTextAtSize: (t: string, s: number) => number }, text: string, size: number, maxWidth: number, startY: number): number {
  const words = text.split(' ');
  let line = '';
  let y = startY;
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
      draw(line, y);
      y -= 16;
      line = w;
    } else {
      line = candidate;
    }
    if (y < 60) break;
  }
  if (line) draw(line, y);
  return y;
}

export const LONG_PAGE_TEXT = (p: number) =>
  `Este es el contenido textual de la página ${p}. Contiene información suficiente sobre el caso: fecha de la solicitud 20/09/2026, ` +
  `nombre del alumno Juan Pérez, matrícula 2024-00123, motivo "baja voluntaria", y retención académica pendiente. ` +
  `El advisor documentó la conversación y registró la intención de cancelación manifiesta. Se adjuntan datos del expediente. `.repeat(4);

// 1) PDF solo texto (3 páginas, texto REAL distinto por página)
export async function buildPdfTextOnly(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 1; p <= 3; p++) {
    const page = doc.addPage([612, 792]);
    page.drawText(`PAGE ${p} - Texto real de la página ${p}`, { x: 50, y: 720, size: 18, font });
    wrapText((line, y) => page.drawText(line, { x: 50, y, size: 11, font }), font, LONG_PAGE_TEXT(p), 11, 500, 660);
  }
  return Buffer.from(await doc.save());
}

// 2) PDF texto + logo PEQUEÑO (48×48, filtrado por imageThreshold=80 => NO dispara Vision)
export async function buildPdfTextWithLogo(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const logo = await doc.embedPng(await makePng(48, 48, [255, 0, 0], 'LOGO'));
  const page = doc.addPage([612, 792]);
  page.drawImage(logo, { x: 510, y: 720, width: 48, height: 48 });
  const paragraph =
    `Página con texto normal y un logo pequeño en el encabezado. La información sobre el caso es completa: fecha 21/09/2026, ` +
    `alumno María López, matrícula 2024-00456, motivo de cancelación por cambio de residencia. No hay capturas ni imágenes de conversaciones. `.repeat(4);
  wrapText((line, y) => page.drawText(line, { x: 50, y, size: 11, font }), font, paragraph, 11, 500, 640);
  return Buffer.from(await doc.save());
}

// 3) PDF texto + logo MEDIANO (200×100: supera 80px pero área 20k < 96k => NO significativo => TEXT)
export async function buildPdfTextWithMediumLogo(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const logo = await doc.embedPng(await makePng(200, 100, [0, 200, 0], 'LOGO-MEDIO'));
  const page = doc.addPage([612, 792]);
  page.drawImage(logo, { x: 300, y: 700, width: 200, height: 100 });
  const paragraph = LONG_PAGE_TEXT(1);
  wrapText((line, y) => page.drawText(line, { x: 50, y, size: 11, font }), font, paragraph, 11, 500, 640);
  return Buffer.from(await doc.save());
}

// 4) PDF texto + CAPTURA GRANDE en página 2 (600×800 => significativa => HYBRID)
export async function buildPdfTextWithCapture(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const capture = await doc.embedPng(await makePng(600, 800, [0, 0, 200], 'CAPTURA'));

  const p1 = doc.addPage([612, 792]);
  p1.drawText('PAGE 1 - Texto normal sin imágenes', { x: 50, y: 720, size: 18, font });
  wrapText((line, y) => p1.drawText(line, { x: 50, y, size: 11, font }), font, LONG_PAGE_TEXT(1), 11, 500, 660);

  const p2 = doc.addPage([612, 792]);
  const paragraph =
    `Página con texto normal suficiente y una captura relevante de conversación. La imagen muestra el mensaje donde el alumno indica su intención de cancelación manifiesta. `.repeat(3);
  wrapText((line, y) => p2.drawText(line, { x: 50, y, size: 11, font }), font, paragraph, 11, 500, 700);
  p2.drawImage(capture, { x: 150, y: 150, width: 300, height: 400 });

  const p3 = doc.addPage([612, 792]);
  p3.drawText('PAGE 3 - Texto normal sin imágenes', { x: 50, y: 720, size: 18, font });

  return Buffer.from(await doc.save());
}

// 5) PDF SCAN: página completa a imagen, sin texto (TEXT inútil + visual => VISUAL)
export async function buildPdfScan(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const scan = await doc.embedPng(await makePng(1000, 1400, [120, 120, 120], 'SCAN'));
  const page = doc.addPage([612, 792]);
  page.drawImage(scan, { x: 0, y: 0, width: 612, height: 792 });
  return Buffer.from(await doc.save());
}

// 6) Imagen PNG grande (evidencia IMAGE)
export async function buildImageEvidence(): Promise<Buffer> {
  return makePng(600, 800, [10, 140, 90], 'EVIDENCIA-IMAGEN');
}

// 7) Audio simulado (bytes válidos cualquiera; el test mockea la transcripción)
export async function buildAudioEvidence(): Promise<Buffer> {
  const sampleRate = 8000;
  const seconds = 2;
  const bytes = new Uint8Array(sampleRate * seconds * 2);
  for (let i = 0; i < bytes.length; i += 2) {
    bytes[i] = 0x24;
    bytes[i + 1] = 0x17;
  }
  return Buffer.from(bytes);
}