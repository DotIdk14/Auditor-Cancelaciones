import { OpenAI } from 'openai';
import { requireOpenRouterConfig } from './models';

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
