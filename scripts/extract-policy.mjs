import { readFileSync, writeFileSync } from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = 'docs/policies/GDM_GAM_PRD_MLG_003_Procedimiento_Desercion_De_Estudiantes.pdf';
const outPath = 'docs/policies/extracted_text.txt';

const data = new Uint8Array(readFileSync(pdfPath));
const doc = await pdfjsLib.getDocument({ data }).promise;

let fullText = '';
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  const pageText = content.items.map(item => item.str).join(' ');
  fullText += `\n--- Página ${i} ---\n${pageText}\n`;
}

writeFileSync(outPath, fullText.trim(), 'utf8');
console.log('Extracted', fullText.length, 'chars from', doc.numPages, 'pages to', outPath);
