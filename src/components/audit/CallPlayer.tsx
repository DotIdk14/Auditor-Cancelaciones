import { ReactNode } from 'react';
import { Volume2, VolumeX, FastForward, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

interface CallPlayerProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onRateChange: (rate: number) => void;
  onReplay: () => void;
  waveformData?: number[];
}

export function CallPlayer({
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onRateChange,
  onReplay,
  waveformData
}: CallPlayerProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Reproductor</p>
          <p className="mt-1 font-mono text-lg font-bold text-white">{formatTime(currentTime)} <span className="text-zinc-600">/</span> {formatTime(duration)}</p>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">{playbackRate.toFixed(2)}x</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onReplay}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            aria-label="Reiniciar"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            aria-label="Retroceder 10s"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <span className="text-xl">⏸</span> : <span className="text-xl">▶</span>}
          </button>
          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 10))}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            aria-label="Adelantar 10s"
          >
            <SkipForward className="h-5 w-5" />
          </button>
          <button
            onClick={() => onRateChange(playbackRate >= 2 ? 0.5 : playbackRate + 0.25)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            aria-label={`Velocidad: ${playbackRate}x`}
          >
            <FastForward className="h-5 w-5" />
            <span className="text-xs font-mono ml-1">{playbackRate.toFixed(2)}x</span>
          </button>
        </div>

        <div className="h-8 relative cursor-pointer" onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          onSeek(percent * duration);
        }}>
          {waveformData && waveformData.length > 0 && (
            <div className="absolute inset-0 flex items-end h-full" style={{ opacity: 0.3 }}>
              {waveformData.map((value, index) => (
                <div
                  key={index}
                  className="flex-1 mx-0.5 bg-zinc-600 rounded-t"
                  style={{ height: `${value * 100}%` }}
                />
              ))}
            </div>
          )}
          
          <div className="absolute inset-0 h-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-emerald-500 pointer-events-none"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            aria-label="Silenciar"
          >
            <Volume2 className="h-5 w-5" />
          </button>
          <div className="w-24 h-2 bg-zinc-800 rounded-full relative">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '80%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
