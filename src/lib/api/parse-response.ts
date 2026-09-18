export async function parseApiResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(`Respuesta vacia del servidor (${response.status} ${response.statusText || 'sin detalle'})`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`El servidor no devolvio JSON valido (${response.status}): ${text.slice(0, 200)}`);
  }
}
