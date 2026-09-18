export interface AssemblyAITranscriptSegment {
  id: string;
  speaker: 'advisor' | 'customer';
  speakerName: string;
  start: string;
  end: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated';
  highlightTags?: string[];
  keyMoment?: {
    type: 'contact_criteria' | 'cancellation_intent' | 'operational_complaint' | 'sales_promise';
    label: string;
  };
}

export class AssemblyAIService {
  private apiKey: string;
  private baseUrl = 'https://api.assemblyai.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeAudio(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<AssemblyAITranscriptSegment[]> {
    const uploadUrl = await this.uploadFile(file, onProgress);
    const transcriptId = await this.requestTranscription(uploadUrl);
    const result = await this.pollForCompletion(transcriptId, onProgress);
    return this.convertToSegments(result);
  }

  private async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.setRequestHeader('Authorization', this.apiKey);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(event.loaded / event.total);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.upload_url);
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(file);
    });
  }

  private async requestTranscription(audioUrl: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        language_code: 'es'
      })
    });

    if (!response.ok) {
      throw new Error(`Transcription request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async pollForCompletion(
    transcriptId: string,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    let attempts = 0;
    const maxAttempts = 120;

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
        headers: { 'Authorization': this.apiKey }
      });

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (onProgress) {
        onProgress(Math.min(0.9, attempts / maxAttempts));
      }

      if (data.status === 'completed') {
        return data;
      }

      if (data.status === 'error') {
        throw new Error(`Transcription failed: ${data.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;
    }

    throw new Error('Transcription timeout');
  }

  private convertToSegments(result: any): AssemblyAITranscriptSegment[] {
    if (!result.utterances || result.utterances.length === 0) {
      return [];
    }

    return result.utterances.map((utterance: any, index: number) => {
      const speaker = utterance.speaker === 'A' ? 'advisor' : 'customer';
      const sentiment = this.mapSentiment(utterance.sentiment);
      
      return {
        id: `seg-${index + 1}`,
        speaker,
        speakerName: speaker === 'advisor' ? 'Asesor' : 'Estudiante',
        start: this.formatTime(utterance.start),
        end: this.formatTime(utterance.end),
        startSeconds: Math.floor(utterance.start / 1000),
        endSeconds: Math.floor(utterance.end / 1000),
        text: utterance.text,
        sentiment,
        highlightTags: this.detectHighlightTags(utterance.text),
        keyMoment: this.detectKeyMoment(utterance.text)
      };
    });
  }

  private mapSentiment(sentiment?: string): 'positive' | 'neutral' | 'negative' | 'frustrated' | undefined {
    switch (sentiment) {
      case 'POSITIVE': return 'positive';
      case 'NEGATIVE': return 'negative';
      case 'NEUTRAL': return 'neutral';
      default: return undefined;
    }
  }

  private detectHighlightTags(text: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('cancelar') || lowerText.includes('baja') || lowerText.includes('deserción')) {
      tags.push('solicitud_cancelacion');
    }
    if (lowerText.includes('promesa') || lowerText.includes('garantía') || lowerText.includes('aseguró')) {
      tags.push('posible_promesa_venta');
    }
    if (lowerText.includes('error') || lowerText.includes('fallo') || lowerText.includes('problema') || lowerText.includes('no funciona')) {
      tags.push('queja_operativa');
    }
    if (lowerText.includes('identidad') || lowerText.includes('titular') || lowerText.includes('confirmar')) {
      tags.push('validacion_identidad');
    }
    
    return tags;
  }

  private detectKeyMoment(text: string): AssemblyAITranscriptSegment['keyMoment'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('cancelar') || lowerText.includes('no quiero continuar') || lowerText.includes('dar de baja')) {
      return { type: 'cancellation_intent', label: 'Intención de cancelación' };
    }
    if (lowerText.includes('prometió') || lowerText.includes('me dijeron que') || lowerText.includes('aseguraron')) {
      return { type: 'sales_promise', label: 'Posible promesa de venta' };
    }
    if (lowerText.includes('error') || lowerText.includes('fallo') || lowerText.includes('no cargaron') || lowerText.includes('problema con')) {
      return { type: 'operational_complaint', label: 'Queja operativa' };
    }
    if (lowerText.includes('titular') || lowerText.includes('identidad') || lowerText.includes('confirmar')) {
      return { type: 'contact_criteria', label: 'Criterio de contacto' };
    }
    
    return undefined;
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
