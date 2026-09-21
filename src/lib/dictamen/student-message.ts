/**
 * Fase 7 — Mensaje automático al estudiante.
 *
 * Texto de notificación (WhatsApp / correo) que comunica la resolución del
 * expediente. El canal se elige según el medio registrado en los hechos de
 * contacto; el auditor puede copiarlo o ajustarlo antes de enviarlo.
 */

export interface StudentMessageContext {
  estudiante: string;
  folio: string;
  clasificacion: string;
  fechaSolicitud?: string;
  medio?: 'WHATSAPP' | 'EMAIL' | 'OTRO';
}

const SALIDOS: Record<string, string> = {
  CANCELACION_VENTA: 'he procedido la cancelación de su venta',
  CANCELACION_VENTA_OPERATIVA: 'he procedido la cancelación de su venta por causas operativas',
  CANCELACION_VENTA_ILOCALIZABLE: 'no fue posible contactarle durante el periodo de gestión, por lo que se procedió la cancelación de su venta',
  CANCELACION_VENTA_A_SOLICITUD_ESTUDIANTE: 'atendiendo su solicitud se procede la cancelación de su venta',
  CANCELACION_VENTA_PROMESA_NO_CUMPLIDA: 'se procede la cancelación de su venta al haberse identificado una diferencia en la información de su inscripción',
  CANCELACION_DE_MATRICULA: 'se tramita la liberación de su matrícula conforme al canal evaluador correspondiente',
  BAJA: 'se procede de acuerdo con su baja del programa',
  REQUIERE_REVISION: 'su expediente se encuentra en revisión y recibirá una actualización en breve',
};

const SALUDO: Record<string, string> = {
  WHATSAPP: 'Hola {nombre}, buenas tardes. Este es un mensaje de la Dirección de Auditoría de Cancelaciones.',
  EMAIL: 'Estimado(a) {nombre}:',
  OTRO: 'Estimado(a) {nombre}:',
};

export function buildStudentMessage(ctx: StudentMessageContext): string {
  const salida = SALIDOS[ctx.clasificacion] || 'se ha registrado la resolución de su expediente';
  const saludo = (SALUDO[ctx.medio || 'OTRO'] || SALUDO.OTRO).replace('{nombre}', ctx.estudiante);
  const folioRef = ctx.folio ? ` En relación con su expediente ${ctx.folio}` : '';

  const cuerpo =
    `${saludo}${folioRef ? `\n${folioRef}.` : ''}\n\n` +
    `Informamos que ${salida}, conforme al procedimiento institucional. ` +
    `Si requiere mayor información, puede responder este mensaje o comunicarse a su asesor académico.`;

  const despedida = ctx.medio === 'WHATSAPP'
    ? '\n\nGracias por su atención.\nDepartamento de Auditoría de Cancelaciones.'
    : '\n\nAtentamente,\nDepartamento de Auditoría de Cancelaciones.';

  return cuerpo + despedida;
}