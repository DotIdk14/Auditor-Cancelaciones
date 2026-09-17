import React, { useState } from 'react';
import {
  PhoneCall,
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  FastForward,
  CheckCircle2,
  Info
} from 'lucide-react';
import { CallRecord } from '../../types/audit';

interface CallPlayerProps {
  call: CallRecord;
  currentPlayTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onOpenDetailsModal?: () => void;
}

export const CallPlayer: React.FC<CallPlayerProps> = ({
  call,
  currentPlayTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  onOpenDetailsModal
}) => {
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const totalSeconds = call.durationSeconds || 525; // 08:45

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  // 48 waveform bars for visual feedback in compact header
  const waveformBars = [
    25, 38, 55, 40, 20, 65, 80, 45, 30, 70, 95, 60, 40, 75, 85, 50, 35, 60, 90, 100,
    70, 45, 65, 80, 55, 30, 45, 75, 60, 40, 85, 90, 65, 45, 30, 50, 70, 60, 40, 25,
    35, 65, 85, 75, 40, 30, 55, 70
  ];

  const [downloadNotice, setDownloadNotice] = useState(false);

  const handleDownload = () => {
    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 2500);
  };

  return (
    <div
      id="call-player-card"
      className="bg-zinc-950/90 rounded-xl border border-zinc-800/80 p-2.5 shadow-xs w-full transition-all"
    >
      {/* Top row: Call Info, badges and quick actions */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-sky-950/80 border border-sky-600/40 flex items-center justify-center text-sky-400 flex-shrink-0">
            <PhoneCall className="w-3 h-3" />
          </div>
          <span className="text-xs font-bold text-zinc-100 truncate" title={call.title}>
            {call.title}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            Audio procesado
          </span>
          <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">
            I6 • {call.phoneNumber} • {call.campaign}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            id="btn-ver-detalles-llamada"
            onClick={onOpenDetailsModal}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
            title="Ver detalles técnicos y metadata de la llamada"
          >
            <Info className="w-3 h-3" />
            <span className="hidden sm:inline">Detalles</span>
          </button>

          <button
            id="btn-download-audio"
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
            title="Descargar archivo de audio de la llamada"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">{downloadNotice ? 'Descargando...' : 'Audio'}</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Play button, Waveform scrubber, time, and quick controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause toggle */}
        <button
          id="btn-toggle-audio-play"
          onClick={onTogglePlay}
          className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all shadow-xs ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-500/30'
              : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
          title={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Current playback time */}
        <span className="font-mono text-[11px] font-semibold text-sky-400 flex-shrink-0 w-9 text-right">
          {formatSeconds(currentPlayTime)}
        </span>

        {/* Waveform Scrubber */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            onSeek(Math.floor(clickPos * totalSeconds));
          }}
          className="flex-1 h-7 bg-zinc-900/90 rounded-lg px-1.5 border border-zinc-800 flex items-center gap-0.5 cursor-pointer relative overflow-hidden group min-w-[120px]"
          title="Haga clic para saltar a cualquier momento del audio"
        >
          {/* Progress fill highlight */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-sky-500/20 pointer-events-none transition-all"
            style={{ width: `${(currentPlayTime / totalSeconds) * 100}%` }}
          />

          {waveformBars.map((heightPercent, index) => {
            const barProgress = index / waveformBars.length;
            const currentProgress = currentPlayTime / totalSeconds;
            const isPassed = barProgress <= currentProgress;

            return (
              <div
                key={index}
                className="flex-1 flex items-center justify-center h-full pointer-events-none"
              >
                <div
                  className={`w-full rounded-full transition-all duration-100 ${
                    isPassed
                      ? 'bg-sky-400 group-hover:bg-sky-300'
                      : 'bg-zinc-700 group-hover:bg-zinc-600'
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    transform: isPlaying && isPassed ? 'scaleY(1.15)' : 'scaleY(1)'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Total duration */}
        <span className="font-mono text-[11px] text-zinc-500 flex-shrink-0 w-9">
          {formatSeconds(totalSeconds)}
        </span>

        {/* Secondary controls: -10s, +10s, speed, volume */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onSeek(Math.max(0, currentPlayTime - 10))}
            className="text-[10px] font-medium text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 transition-colors"
            title="Retroceder 10 segundos"
          >
            -10s
          </button>
          <button
            onClick={() => onSeek(Math.min(totalSeconds, currentPlayTime + 10))}
            className="text-[10px] font-medium text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 transition-colors"
            title="Adelantar 10 segundos"
          >
            +10s
          </button>
          <button
            onClick={cycleSpeed}
            className="flex items-center gap-0.5 text-[10px] font-semibold text-sky-400 hover:bg-sky-950/70 px-1.5 py-0.5 rounded bg-zinc-800/80 border border-sky-800/50 transition-colors"
            title="Cambiar velocidad de reproducción"
          >
            <FastForward className="w-2.5 h-2.5" />
            <span>{playbackSpeed}x</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 pl-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-12 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              title="Volumen del audio"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

