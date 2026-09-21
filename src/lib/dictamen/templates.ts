/**
 * Fase 6 — Dictamen automático contextual.
 *
 * Genera el texto del dictamen tipo CaVe a partir de la clasificación del motor
 * de decisiones y de los hechos cotejados. El auditor puede editar el texto
 * final (Fase 10): este es el punto de partida automático.
 */

export interface DictamenEvidenceContext {
  tipo: string;
  descripcion?: string;
}

export interface DictamenContext {
  folio: string;
  estudiante: string;
  matricula: string;
  clasificacion: string;
  causaRaiz: string;
  fechaInicio?: string;
  fechaSolicitud?: string;
  confianza?: number;
  motivo?: string;
  evidencias?: DictamenEvidenceContext[];
}

const NUMBER_OF_EVIDENCES_SUSTANTIVE = 3;

function formatFecha(fecha?: string): string {
  if (!fecha) return '';
  const match = fecha.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return fecha;
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

function evidenciaResumen(ctx: DictamenContext): string {
  const evidencias = ctx.evidencias || [];
  const detalle = evidencias
    .filter(e => e.tipo)
    .slice(0, NUMBER_OF_EVIDENCES_SUSTANTIVE)
    .map(e => {
      const tipo = e.tipo.replace(/_/g, ' ').toLowerCase();
      return e.descripcion ? `${tipo} (${e.descripcion})` : tipo;
    });
  if (detalle.length === 0) return 'las evidencias aportadas al expediente';
  return detalle.join(', ');
}

const SEGMENTS: Record<string, string> = {
  CANCELACION_VENTA: 'CANCELACIÓN DE VENTA',
  CANCELACION_VENTA_OPERATIVA: 'CANCELACIÓN DE VENTA OPERATIVA',
  CANCELACION_VENTA_ILOCALIZABLE: 'CANCELACIÓN DE VENTA POR ESTUDIANTE ILOCALIZABLE',
  CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE: 'CANCELACIÓN DE VENTA A SOLICITUD DEL ESTUDIANTE',
  CANCELACION_VENTA_PROMESA_NO_CUMPLIDA: 'CANCELACIÓN DE VENTA POR PROMESA NO CUMPLIDA',
  CANCELACION_DE_MATRICULA: 'CANCELACIÓN DE MATRÍCULA (CANAL MYSTERY SHOPPER)',
  BAJA: 'TRÁMITE DE BAJA DEFINITIVA',
  REQUIERE_REVISION: 'REQUIERE REVISIÓN POR AUDITOR DE CALIDAD',
};

export function buildDictamenText(ctx: DictamenContext): string {
  const seg = SEGMENTS[ctx.clasificacion] || ctx.clasificacion.replace(/_/g, ' ');
  const estado = ctx.clasificacion === 'REQUIERE_REVISION'
    ? 'no es posible emitir una resolución de cancelación de venta en este momento'
    : `procede ${seg}`;
  const causa = ctx.causaRaiz?.replace(/_/g, ' ').toLowerCase() || 'causa no determinada';

  const encabezado =
    `Dictamen de Auditoría de Cancelaciones\nFolio: ${ctx.folio}\n` +
    `Estudiante: ${ctx.estudiante} (Matrícula: ${ctx.matricula})`;

  const cuerpoBase =
    `De acuerdo con el procedimiento institucional de deserción estudiantil (GDM_GAM_PRD_MLG_003) y en virtud ` +
    `de los hechos cotejados y documentados con ${evidenciaResumen(ctx)}, se determina que ${estado}, ` +
    `atendiendo la causal "${causa}".`;

  const temporalidad = ctx.fechaSolicitud ? ` La solicitud se registró el ${formatFecha(ctx.fechaSolicitud)}` : '';
  const inicio = ctx.fechaInicio ? `, con inicio de clases el ${formatFecha(ctx.fechaInicio)}` : '';
  const detalleMotivo = ctx.motivo ? ` Motivo manifestado: "${ctx.motivo.trim()}".` : '';

  const pie = ctx.clasificacion === 'REQUIERE_REVISION'
    ? 'Se deberán subsanar las evidencias faltantes señaladas en el expediente antes de emitir resolución.'
    : 'Se instruye notificar la resolución al área correspondiente para efecto de la baja de la matrícula y, en su caso, la cancelación de la venta.';

  return [
    encabezado,
    cuerpoBase + temporalidad + inicio + detalleMotivo,
    pie,
  ].join('\n\n');
}

export function filenameForDictamen(ctx: Pick<DictamenContext, 'folio' | 'estudiante'>): string {
  const nombre = (ctx.estudiante || 'expediente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `CAVE_${ctx.folio}_${nombre}.pdf`;
}