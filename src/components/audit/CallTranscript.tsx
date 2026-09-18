import { useState, useCallback, useRef, useEffect, type DragEvent } from 'react';
import { Mic, Upload, X } from 'lucide-react';
import { TranscriptSegment, CallRecord } from '../../types/domain';
import { parseApiResponse } from '../../lib/api/parse-response';
const API_BASE = '/api';

interface CallTranscriptProps {
  calls: CallRecord[];
  activeCallId: string;
  onCallChange: (id: string) => void;
  onAddCall: (call: CallRecord) => void;
  onSeek: (seconds: number) => void;
  currentPlayTime: number;
  isPlaying: boolean;
  totalDuration: number;
  playbackRate: number;
}

const speakerColors = {
  advisor: 'text-sky-400',
  customer: 'text-amber-400'
};

const speakerLabels = {
  advisor: 'Asesor',
  customer: 'Estudiante'
};

const sentimentColors = {
  positive: 'text-emerald-400',
  neutral: 'text-zinc-400',
  negative: 'text-amber-400',
  frustrated: 'text-rose-400'
};

export function CallTranscript({
  calls,
  activeCallId,
  onCallChange,
  onAddCall,
  onSeek,
  currentPlayTime,
  isPlaying,
  totalDuration,
  playbackRate
}: CallTranscriptProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ file: File; progress: number; status: 'uploading' | 'transcribing' | 'completed' | 'error'; transcript?: TranscriptSegment[] } | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const segmentsRef = useRef<HTMLDivElement[]>([]);

  const activeCall = calls.find(c => c.id === activeCallId) ?? calls[0];

  const handleFileUpload = useCallback(async (file: File) => {
    setShowUpload(false);
    setUploadProgress({ file, progress: 0, status: 'uploading' });

    try {
      setUploadProgress(prev => prev ? { ...prev, progress: 30, status: 'transcribing' } : null);

      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch(`${API_BASE}/cases/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const result = await parseApiResponse(response);

      if (!result.success) throw new Error(result.message || 'Error en transcripción');

      const transcript = result.data.draft.evidencias[0]?.extraccion?.hechos?.[0]?.textoCitado
        ? [{ ...result.data.draft.evidencias[0].extraccion.hechos[0], text: result.data.draft.evidencias[0].extraccion.hechos[0].textoCitado || '' }]
        : [];

      setUploadProgress(prev => prev ? { ...prev, progress: 95, status: 'completed', transcript } : null);

      const newCall: CallRecord = {
        id: `call-${Date.now()}`,
        title: file.name,
        date: new Date().toLocaleDateString('es-MX'),
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        duration: formatDuration(transcript[transcript.length - 1]?.endSeconds || 0),
        durationSeconds: transcript[transcript.length - 1]?.endSeconds || 0,
        status: 'TRANSCRIPCION_COMPLETADA',
        campaign: 'UPLOAD',
        phoneNumber: 'Desconocido',
        intentsRatio: 'N/A',
        sentiment: 'Neutro',
        detectedIntentions: [],
        keyMoments: [],
        effectiveContact: {
          efectivo: false,
          criterios: []
        },
        transcript
      };

      onAddCall(newCall);
      onCallChange(newCall.id);

      setTimeout(() => setUploadProgress(null), 3000);
    } catch (error) {
      setUploadProgress(prev => prev ? { ...prev, status: 'error', progress: 100 } : null);
      console.error('Transcription error:', error);
    }
  }, [onAddCall, onCallChange]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const scrollToActiveSegment = useCallback(() => {
    if (transcriptRef.current && segmentsRef.current.length > 0) {
      const activeIndex = activeCall.transcript.findIndex(
        seg => seg.startSeconds <= currentPlayTime && seg.endSeconds >= currentPlayTime
      );
      if (activeIndex >= 0 && segmentsRef.current[activeIndex]) {
        segmentsRef.current[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeCall, currentPlayTime]);

  useEffect(() => {
    if (isPlaying) {
      scrollToActiveSegment();
    }
  }, [currentPlayTime, isPlaying, scrollToActiveSegment]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2">
          <select
            value={activeCallId}
            onChange={e => onCallChange(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            aria-label="Seleccionar llamada"
          >
            {calls.map(call => (
              <option key={call.id} value={call.id}>
                {call.title} ({formatDuration(call.durationSeconds)})
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Subir Audio</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="font-mono text-zinc-200">{formatTime(currentPlayTime)} / {formatTime(totalDuration)}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800">{playbackRate}x</span>
        </div>
      </div>

      {uploadProgress && (
        <div className="mt-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">{uploadProgress.file.name}</span>
            <button onClick={() => setUploadProgress(null)} className="text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                uploadProgress.status === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {uploadProgress.status === 'uploading' && 'Subiendo archivo...'}
            {uploadProgress.status === 'transcribing' && 'Transcribiendo con AssemblyAI...'}
            {uploadProgress.status === 'completed' && 'Transcripción completada'}
            {uploadProgress.status === 'error' && 'Error en la transcripción'}
          </p>
        </div>
      )}

      <div
        ref={transcriptRef}
        className="flex-1 overflow-y-auto space-y-2 p-3"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {activeCall.transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-zinc-500">
            <Mic className="h-16 w-16 text-zinc-700 mb-4" />
            <p className="text-lg font-medium text-zinc-400">Sin transcripción disponible</p>
            <p className="text-sm mt-1">Arrastra un archivo de audio o haz clic en "Subir Audio"</p>
          </div>
        ) : (
          activeCall.transcript.map((segment, index) => {
            const isActive = segment.startSeconds <= currentPlayTime && segment.endSeconds >= currentPlayTime;
            const refCallback = (el: HTMLDivElement | null) => { segmentsRef.current[index] = el!; };
            
            return (
              <div
                key={segment.id}
                ref={refCallback}
                onClick={() => onSeek(segment.startSeconds)}
                className={`rounded-xl p-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-950/30 border border-emerald-800/50 ring-1 ring-emerald-800/30'
                    : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700'
                }`}
                data-start={segment.startSeconds}
                data-end={segment.endSeconds}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-20 text-right text-xs text-zinc-500 font-mono">
                    {formatTime(segment.startSeconds)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${speakerColors[segment.speaker]}`}>
                        {speakerLabels[segment.speaker]}: {segment.speakerName}
                      </span>
                      {segment.sentiment && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${sentimentColors[segment.sentiment]}`}>
                          {segment.sentiment}
                        </span>
                      )}
                      {segment.keyMoment && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/50 text-sky-400">
                          {segment.keyMoment.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed">{segment.text}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
