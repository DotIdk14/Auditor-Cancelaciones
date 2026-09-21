import { readFileSync, writeFileSync } from 'fs';

const extractedText = readFileSync('docs/policies/extracted_text.txt', 'utf8');

// Clean up the extracted text: remove page markers and normalize whitespace
const cleanedText = extractedText
  .replace(/--- Página \d+ ---\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const hash = '773BECABE81E6FE8812167F9316EFEFEC5CAB5ABBA5C142FC9E1C170510B0C6F';

const policyIndex = `export const POLICY_INDEX: Array<{ numeral: string; titulo: string; pagina: number }> = [
  { numeral: '1', titulo: 'Objetivo', pagina: 1 },
  { numeral: '2', titulo: 'Alcance', pagina: 1 },
  { numeral: '3', titulo: 'Glosario', pagina: 1 },
  { numeral: '4', titulo: 'Dueño de Proceso', pagina: 2 },
  { numeral: '5', titulo: 'Políticas de Negocio', pagina: 2 },
  { numeral: '5.1', titulo: 'Notificaciones de cancelaciones de venta', pagina: 2 },
  { numeral: '5.2', titulo: 'Intentos de contacto mínimos al estudiante', pagina: 3 },
  { numeral: '5.3', titulo: 'A solicitud del Estudiante', pagina: 3 },
  { numeral: '5.4', titulo: 'Cambios de ciclo', pagina: 5 },
  { numeral: '5.5', titulo: 'Error de Inscripción', pagina: 6 },
  { numeral: '5.6', titulo: 'Promesa de venta NO cumplida', pagina: 6 },
  { numeral: '5.7', titulo: 'Entrega de Documentos', pagina: 8 },
  { numeral: '5.8', titulo: 'Estudiantes Ilocalizables', pagina: 9 },
  { numeral: '5.9', titulo: 'Cancelaciones operativas', pagina: 12 },
  { numeral: '5.10', titulo: 'Mystery Shopper', pagina: 13 },
  { numeral: '5.11', titulo: 'Indicador de Cancelación de Venta y Bajas', pagina: 13 },
  { numeral: '5.12', titulo: 'Soporte de Evidencias para solicitudes en Flokzu', pagina: 13 },
  { numeral: '5.13', titulo: 'Solicitud de evidencias al área de calidad o ventas', pagina: 14 },
  { numeral: '5.14', titulo: 'Atención de solicitudes', pagina: 15 },
  { numeral: '6', titulo: 'Descripción de Actividades', pagina: 16 },
  { numeral: '7', titulo: 'Diagrama de Flujo', pagina: 16 },
  { numeral: '8', titulo: 'Indicadores', pagina: 16 },
  { numeral: '9', titulo: 'Anexos', pagina: 17 },
  { numeral: '10', titulo: 'Documentos de Referencia', pagina: 17 },
  { numeral: '11', titulo: 'Control de Cambios', pagina: 17 },
];`;

const fileContent = `/**
 * GDM_GAM_PRD_MLG_003 — Procedimiento Deserción De Estudiantes
 * Versión: 2 | Fecha: 19/02/2025 | Extensión: 19 páginas
 *
 * Texto íntegro extraído del PDF original via pdfjs-dist.
 * Hash SHA-256: ${hash}
 */

export const POLICY_META = {
  codigo: 'GDM_GAM_PRD_MLG_003',
  nombre: 'Procedimiento Deserción De Estudiantes',
  version: 2,
  fecha: '19/02/2025',
  paginas: 19,
  sha256: '${hash}',
} as const;

${policyIndex}

/**
 * Texto íntegro de la política extraído del PDF v2 (19 páginas).
 * SHA-256: ${hash}
 */
export const POLICY_FULL_TEXT = \`
${cleanedText}
\`.trim();

/**
 * Genera el texto de la política para enviar al modelo.
 * Si el usuario proporciona el PDF, extrae el texto real.
 * Si no, usa el texto embebido.
 */
export function getPolicyTextForModel(userPdfText?: string): string {
  if (userPdfText && userPdfText.trim().length > 500) {
    return userPdfText;
  }
  if (POLICY_FULL_TEXT.includes('[IMPORTANTE:')) {
    throw new Error('La política GDM_GAM_PRD_MLG_003 no está cargada. Inserta el texto íntegro del PDF en POLICY_FULL_TEXT o envía policyText al endpoint.');
  }
  return POLICY_FULL_TEXT;
}

/**
 * Valida que una cita normativa sea consistente con el índice de la política.
 */
export function validateNormativeRef(ref: string): { valid: boolean; suggestion?: string } {
  const numeralMatch = ref.match(/(\\d+(?:\\.\\d+)?)/);
  if (!numeralMatch) return { valid: false, suggestion: 'Formato de numeral no reconocido' };

  const numeral = numeralMatch[1];
  const found = POLICY_INDEX.find(entry => entry.numeral === numeral);
  if (!found) return { valid: false, suggestion: \`El numeral \${numeral} no existe en la política\` };

  return { valid: true };
}

/**
 * Obtiene información de un numeral específico de la política.
 */
export function getPolicySection(numeral: string) {
  return POLICY_INDEX.find(entry => entry.numeral === numeral);
}
`;

writeFileSync('src/lib/audit/policy.ts', fileContent, 'utf8');
console.log('Written policy.ts with', fileContent.length, 'chars');
