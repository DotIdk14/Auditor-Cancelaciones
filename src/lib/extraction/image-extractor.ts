import { getOpenRouterClient } from '../ai/client';
import { getAiModels } from '../ai/models';
import { buildExtractionPrompt } from '../ai/prompts';
import { parseExtractionJson } from '../ai/schemas';
import { UsageCollector } from '../ai/usage';
import { StructuredExtractionOutput } from './structured-extractor';

function extractJsonContent(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : trimmed;
}

async function callVision(model: string, task: string, evidenceId: string, imageUrl: string, usage: UsageCollector, fallbackUsed: boolean): Promise<string> {
  const client = getOpenRouterClient();
  const started = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: buildExtractionPrompt() },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Extrae hechos observables exclusivamente visibles en la imagen. evidencia_id=${evidenceId}` },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 4000,
  });

  usage.record({
    provider: 'openrouter',
    model,
    task,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
    latencyMs: Date.now() - started,
    fallbackUsed,
  });

  return response.choices[0]?.message?.content || '';
}

export async function extractFromImage(buffer: Buffer, mimeType: string, evidenceId: string, usage: UsageCollector): Promise<StructuredExtractionOutput> {
  const models = getAiModels();
  const imageUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
  const raw = await callVision(models.vision, 'image_vision_extraction', evidenceId, imageUrl, usage, false);
  const parsed = parseExtractionJson(extractJsonContent(raw));
  if (parsed.success) return { result: parsed.data, fallbackUsed: false };

  const fallbackRaw = await callVision(models.fallback, 'image_vision_extraction_fallback', evidenceId, imageUrl, usage, true);
  const fallbackParsed = parseExtractionJson(extractJsonContent(fallbackRaw));
  if (!fallbackParsed.success) {
    const error = (fallbackParsed as { success: false; error: string }).error;
    throw new Error(`Extracción de imagen inválida tras fallback: ${error}`);
  }
  return { result: fallbackParsed.data, fallbackUsed: true };
}
