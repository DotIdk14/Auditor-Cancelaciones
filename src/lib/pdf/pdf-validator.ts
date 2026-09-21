import { PDFDocument } from 'pdf-lib';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  pageCountMatch: boolean;
  dimensionsMatch: boolean;
}

export async function validatePDFFormat(
  generatedBytes: Uint8Array,
  templateBytes: Uint8Array
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const generatedDoc = await PDFDocument.load(generatedBytes);
    const templateDoc = await PDFDocument.load(templateBytes);

    const pageCountMatch = generatedDoc.getPageCount() === templateDoc.getPageCount();
    if (!pageCountMatch) {
      errors.push(`Número de páginas difiere: generado=${generatedDoc.getPageCount()}, plantilla=${templateDoc.getPageCount()}`);
    }

    let dimensionsMatch = true;
    for (let i = 0; i < Math.min(generatedDoc.getPageCount(), templateDoc.getPageCount()); i++) {
      const genPage = generatedDoc.getPage(i);
      const tmplPage = templateDoc.getPage(i);

      if (genPage.getWidth() !== tmplPage.getWidth() ||
        genPage.getHeight() !== tmplPage.getHeight()) {
        dimensionsMatch = false;
        errors.push(`Página ${i + 1}: dimensiones difieren (generado: ${genPage.getWidth()}x${genPage.getHeight()}, plantilla: ${tmplPage.getWidth()}x${tmplPage.getHeight()})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      pageCountMatch,
      dimensionsMatch,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Error al validar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`],
      warnings: [],
      pageCountMatch: false,
      dimensionsMatch: false,
    };
  }
}