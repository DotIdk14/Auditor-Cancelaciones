import { OpenAI } from 'openai';
import { requireOpenRouterConfig } from './models.js';

let openRouterClient: OpenAI | null = null;

export function getOpenRouterClient(): OpenAI {
  requireOpenRouterConfig();

  if (!openRouterClient) {
    openRouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  return openRouterClient;
}

export function isJsonParseError(err: unknown): boolean {
  return err instanceof Error && /Unexpected token|is not valid JSON|JSON\.parse/i.test(err.message);
}

interface OpenRouterHttpError {
  status?: number;
  message?: string;
  error?: { message?: string; code?: number | string };
}

export function wrapOpenRouterError(err: unknown, context: string): Error {
  if (isJsonParseError(err)) {
    return new Error(`OpenRouter devolvió una respuesta no válida (posible rate-limit o modelo no disponible). Contexto: ${context}`);
  }

  const http = err as OpenRouterHttpError;
  if (http && typeof http.status === 'number') {
    const detail = http.error?.message || http.message || '';
    const suffix = detail ? ` ${detail}` : '';
    switch (http.status) {
      case 400:
        return new Error(`OpenRouter rechazó la solicitud (400). Modelo o parámetros inválidos. Contexto: ${context}${suffix}`);
      case 401:
        return new Error(`Autenticación fallida con OpenRouter (401). Verifica OPENROUTER_API_KEY. Contexto: ${context}${suffix}`);
      case 402:
        return new Error(`OpenRouter sin crédito disponible (402). Recarga créditos. Contexto: ${context}${suffix}`);
      case 404:
        return new Error(`Modelo no encontrado en OpenRouter (404). Verifica el nombre del modelo. Contexto: ${context}${suffix}`);
      case 429:
        return new Error(`OpenRouter: demasiadas solicitudes o límite de uso (429). Intenta más tarde. Contexto: ${context}${suffix}`);
      default:
        if (http.status >= 500) {
          return new Error(`OpenRouter error de servidor (${http.status}). Contexto: ${context}${suffix}`);
        }
        return new Error(`OpenRouter error HTTP ${http.status}. Contexto: ${context}${suffix}`);
    }
  }

  return err instanceof Error ? err : new Error(`Error desconocido en ${context}`);
}
