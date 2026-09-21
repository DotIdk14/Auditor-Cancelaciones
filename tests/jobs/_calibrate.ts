/**
 * Calibración empírica de pdf-parse@2.4.5 para clasificación PDF por página.
 * NO es un test de verificación: sirve para confirmar el comportamiento real de la librería instalada.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';
import { PDFParse } from 'pdf-parse';

async function makePng(width: number, height: number, color: [number, number, number], label: string): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.font = `${Math.min(20, height / 6)}px sans-serif`;
  ctx.fillText(label, 8, 24);
  return Buffer.from(await canvas.encode('png'));
}

async function buildPdfTextOnly(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 1; p <= 3; p++) {
    const page = doc.addPage([612, 792]);
    page.drawText(`PAGE ${p} - Texto real de la página ${p}`, { x: 50, y: 720, size: 18, font });
    const paragraph =
      `Este es el contenido textual de la página ${p}. Contiene información suficiente sobre el caso: fecha de la solicitud 20/09/2026, ` +
      `nombre del alumno Juan Pérez, matrícula 2024-00123, motivo "baja voluntaria", y retención académica pendiente. ` +
      `El advisor documentó la conversación y registró la intención de cancelación manifiesta. Se adjuntan datos del expediente. `.repeat(4);
    // Dividir en líneas aproximadas
    const words = paragraph.split(' ');
    let line = '';
    let y = 660;
    let x = 50;
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(candidate, 11);
      if (width > 500) {
        page.drawText(line, { x, y, size: 11, font });
        y -= 16;
        line = w;
      } else {
        line = candidate;
      }
      if (y < 60) break;
    }
    if (line) page.drawText(line, { x, y, size: 11, font });
  }
  return Buffer.from(await doc.save());
}

async function buildPdfTextWithLogo(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const logo = await doc.embedPng(await makePng(48, 48, [255, 0, 0], 'LOGO'));
  const page = doc.addPage([612, 792]);
  page.drawImage(logo, { x: 510, y: 720, width: 48, height: 48 });
  const paragraph =
    `Página con texto normal y un logo pequeño en el encabezado. La información sobre el caso es completa: fecha 21/09/2026, ` +
    `alumno María López, matrícula 2024-00456, motivo de cancelación por cambio de residencia. No hay capturas ni imágenes de conversaciones. `.repeat(4);
  const words = paragraph.split(' ');
  let line = '';
  let y = 640;
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, 11) > 500) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 16;
      line = w;
    } else {
      line = candidate;
    }
    if (y < 60) break;
  }
  if (line) page.drawText(line, { x: 50, y, size: 11, font });
  return Buffer.from(await doc.save());
}

async function buildPdfTextWithCapture(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const capture = await doc.embedPng(await makePng(600, 800, [0, 0, 200], 'CAPTURA WHATSAPP'));
  // page 1: texto normal
  const p1 = doc.addPage([612, 792]);
  p1.drawText('PAGE 1 - Texto normal', { x: 50, y: 720, size: 18, font });
  // page 2: texto + captura grande
  const p2 = doc.addPage([612, 792]);
  const paragraph =
    `Página con texto normal suficiente y una captura relevante de conversación. La imagen muestra el mensaje donde el alumno indica su intención de cancelación manifiesta. `.repeat(3);
  const words = paragraph.split(' ');
  let line = '';
  let y = 700;
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, 11) > 500) {
      p2.drawText(line, { x: 50, y, size: 11, font });
      y -= 16;
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) p2.drawText(line, { x: 50, y, size: 11, font });
  p2.drawImage(capture, { x: 150, y: 150, width: 300, height: 400 });
  // page 3: texto normal
  const p3 = doc.addPage([612, 792]);
  p3.drawText('PAGE 3 - Texto normal', { x: 50, y: 720, size: 18, font });
  return Buffer.from(await doc.save());
}

async function buildPdfScan(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const scan = await doc.embedPng(await makePng(1000, 1400, [120, 120, 120], 'SCAN'));
  const page = doc.addPage([612, 792]);
  page.drawImage(scan, { x: 0, y: 0, width: 612, height: 792 });
  return Buffer.from(await doc.save());
}

async function main() {
  const [txtPdf, logoPdf, capPdf, scanPdf] = await Promise.all([
    buildPdfTextOnly(), buildPdfTextWithLogo(), buildPdfTextWithCapture(), buildPdfScan(),
  ]);

  for (const [name, pdf] of [['text-only', txtPdf], ['text+logo', logoPdf], ['text+capture', capPdf], ['scan', scanPdf]] as const) {
    console.log(`\n===== ${name} =====`);
    const parser = new PDFParse({ data: pdf });
    try {
      const txt = await parser.getText({ pageJoiner: '\n' });
      console.log(`  getText: total=${txt.total} pages=[${txt.pages.map(p => `${p.num}:${p.text.length}chars`).join(', ')}]`);

      for (let i = 1; i <= txt.total; i++) {
        const single = await parser.getText({ partial: [i], pageJoiner: '\n' });
        const pageText = single.getPageText(i);
        console.log(`  page ${i} via partial: ${pageText.length} chars, head="${pageText.slice(0, 40).replace(/\s+/g, ' ')}"`);

        const img = await parser.getImage({ partial: [i], imageThreshold: 80, imageDataUrl: false, imageBuffer: false });
        const imgs = img.pages[0]?.images || [];
        console.log(`  page ${i} images: ${imgs.length} -> ${imgs.map((im: any) => `${im.name}[${im.width}x${im.height}]`).join(' ')}`);
      }

      const shot = await parser.getScreenshot({ partial: [2], desiredWidth: 200, imageDataUrl: false, imageBuffer: true });
      for (const p of shot.pages) {
        console.log(`  screenshot partial:[2] -> page ${p.pageNumber} bytes=${p.data ? (p.data as any).length : 'n/a'}`);
      }
    } finally {
      await parser.destroy();
    }
  }
}

main().catch(e => { console.error('CALIBRATION FAILED:', e); process.exit(1); });