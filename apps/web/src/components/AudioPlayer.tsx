'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, Square, Gauge } from 'lucide-react';

export interface AudioPlayerProps {
  title: string;
  locale: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ title, locale }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  const handlePlay = () => {
    if (!supported) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    // Extract text from the article prose
    const article = document.querySelector('article .prose');
    const textContent = article ? article.textContent || '' : '';
    const cleanText = `${title}. ${textContent}`.replace(/\s+/g, ' ').slice(0, 5000); // Read up to first 5000 chars

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = locale === 'tr' ? 'tr-TR' : 'en-US';
    utterance.rate = rate;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const toggleRate = () => {
    const nextRate = rate === 1.0 ? 1.25 : rate === 1.25 ? 1.5 : 1.0;
    setRate(nextRate);
    if (isPlaying) {
      handleStop();
    }
  };

  if (!supported) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/[0.08] dark:bg-[#121215] shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <Volume2 className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-[#f4f4f5]">
            {locale === 'tr' ? 'Makaleyi Dinle' : 'Listen to Article'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-zinc-500">
            {isPlaying
              ? locale === 'tr'
                ? 'Seslendiriliyor...'
                : 'Playing...'
              : locale === 'tr'
              ? 'Yapay zeka ses motoru'
              : 'Web Speech Audio Engine'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {isPlaying ? (
          <button
            onClick={handlePause}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            title="Duraklat"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handlePlay}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            title="Oynat"
          >
            <Play className="w-3.5 h-3.5 ml-0.5" />
          </button>
        )}

        {(isPlaying || isPaused) && (
          <button
            onClick={handleStop}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:bg-[#18181b]"
            title="Durdur"
          >
            <Square className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={toggleRate}
          title="Oynatma Hızı"
          className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:bg-[#18181b]"
        >
          <Gauge className="w-3 h-3" />
          <span>{rate}x</span>
        </button>
      </div>
    </div>
  );
};
