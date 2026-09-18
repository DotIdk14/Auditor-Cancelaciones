import { AssemblyAI } from 'assemblyai';

export interface TranscriptSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export function requireAssemblyAIConfig(): void {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY no configurada. La transcripción de audio requiere AssemblyAI.');
  }
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTranscriptSegments(segments: TranscriptSegment[]): string {
  return segments.map(segment => `[${formatTimestamp(segment.start)}] ${segment.speaker}: ${segment.text}`).join('\n');
}

export async function transcribeAudio(buffer: Buffer): Promise<TranscriptSegment[]> {
  requireAssemblyAIConfig();
  const assemblyai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
  const transcript = await assemblyai.sync.transcribe(buffer, {
    language_codes: ['es'],
    speaker_labels: true,
  } as any);

  const utterances = (transcript as any).utterances || [];
  if (utterances.length > 0) {
    return utterances.map((utterance: any) => ({
      speaker: utterance.speaker ? `SPEAKER_${utterance.speaker}` : 'SPEAKER_UNKNOWN',
      start: utterance.start ?? 0,
      end: utterance.end ?? utterance.start ?? 0,
      text: utterance.text || '',
    })).filter((segment: TranscriptSegment) => segment.text.trim().length > 0);
  }

  if (!transcript.text) throw new Error('No se obtuvo transcripción');
  return [{ speaker: 'SPEAKER_UNKNOWN', start: 0, end: 0, text: transcript.text }];
}
