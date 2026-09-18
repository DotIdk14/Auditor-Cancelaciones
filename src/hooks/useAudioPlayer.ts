import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentPlayTime: number;
  totalDuration: number;
  playbackRate: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setTotalDuration: (duration: number) => void;
}

export function useAudioPlayer(initialDuration = 0): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayTime, setCurrentPlayTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const intervalRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    setCurrentPlayTime(prev => {
      const next = prev + playbackRate;
      if (next >= totalDuration) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsPlaying(false);
        return totalDuration;
      }
      return next;
    });
  }, [playbackRate, totalDuration]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(tick, 1000 / playbackRate);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, tick, playbackRate]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying(prev => !prev), []);
  const seek = useCallback((seconds: number) => {
    setCurrentPlayTime(Math.max(0, Math.min(seconds, totalDuration)));
  }, [totalDuration]);

  return {
    isPlaying,
    currentPlayTime,
    totalDuration,
    playbackRate,
    play,
    pause,
    toggle,
    seek,
    setPlaybackRate,
    setTotalDuration
  };
}