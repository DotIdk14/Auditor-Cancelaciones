function statusMessage(status: number, body: any): string {
  switch (status) {
    case 0:
      return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    case 401:
      return 'Error de autenticación con el proveedor de IA (401). Revisa la clave.';
    case 402:
      return 'El proveedor de IA no tiene crédito disponible (402).';
    case 413:
      return 'El archivo supera el límite permitido (413). Reduce el tamaño o la cantidad de archivos.';
    case 422:
      return `El servidor rechazó la solicitud (422): ${body?.message || body?.error || 'datos inválidos'}`;
    case 429:
      return 'Demasiadas solicitudes (429). Intenta de nuevo en unos segundos.';
    case 500:
      return `Error interno del servidor (500): ${body?.message || body?.error || 'error desconocido'}`;
    case 502:
      return 'El servicio temporalmente no disponible (502). Intenta de nuevo.';
    case 503:
      return 'El servicio está en mantenimiento (503). Intenta de nuevo.';
    case 504:
      return 'El servidor tardó demasiado en responder (504). Reduce el número de evidencias o reintenta.';
    default:
      return `Error de servidor (${status})${body?.message ? `: ${body.message}` : ''}`;
  }
}

/**
 * Reads a fetch response defensively: always returns the parsed body when it is
 * valid JSON, throws a readable Error otherwise. On HTTP errors (including
 * Vercel's 504 gateway page which is NOT JSON) it throws a message that explains
 * the status code instead of a cryptic "Unexpected token ... is not valid JSON".
 */
export async function parseApiResponse(response: Response): Promise<any> {
  const status = response.status;
  const raw = await response.text();

  let body: any = null;
  if (raw.trim()) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    throw new Error(statusMessage(status, body));
  }

  return body;
}