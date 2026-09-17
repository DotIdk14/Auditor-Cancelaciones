import { EvidenceItem } from './types';

export function getEvidenceTranscript(evidence: EvidenceItem): TranscriptSegment[] {
  if (!evidence.transcript) return [];
  return evidence.transcript;
}