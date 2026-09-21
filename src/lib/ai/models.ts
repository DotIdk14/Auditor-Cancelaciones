export interface AiModels {
  extraction: string;
  vision: string;
  fallback: string;
}

const DEFAULT_EXTRACTION_MODEL = 'openai/gpt-5-nano';
const DEFAULT_VISION_MODEL = 'qwen/qwen3-vl-8b-instruct';
const DEFAULT_FALLBACK_MODEL = 'google/gemini-2.5-flash-lite';

export function getAiModels(): AiModels {
  return {
    extraction: process.env.AI_EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL,
    vision: process.env.AI_VISION_MODEL || DEFAULT_VISION_MODEL,
    fallback: process.env.AI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL,
  };
}

export function requireOpenRouterConfig(): void {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY no configurada. La extracción IA requiere OpenRouter.');
  }
}

export function getExtractionConcurrency(): number {
  const parsed = Number(process.env.AI_EXTRACTION_CONCURRENCY || '3');
  if (!Number.isFinite(parsed) || parsed < 1) return 3;
  return Math.min(Math.floor(parsed), 4);
}
