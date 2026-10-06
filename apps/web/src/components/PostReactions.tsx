'use client';

import React, { useEffect, useState } from 'react';
import { webApi } from '../lib/api';

export interface PostReactionsProps {
  locale: string;
  slug: string;
}

export const PostReactions: React.FC<PostReactionsProps> = ({ locale, slug }) => {
  const [counts, setCounts] = useState<{ CLAP: number; HEART: number; ROCKET: number; BULB: number }>({
    CLAP: 0,
    HEART: 0,
    ROCKET: 0,
    BULB: 0,
  });
  const [userCounts, setUserCounts] = useState<{ [key: string]: number }>({});
  const [sessionId, setSessionId] = useState<string>('');
  const [activeBubble, setActiveBubble] = useState<string | null>(null);

  // Initialize or get anonymous sessionId
  useEffect(() => {
    let sid = localStorage.getItem('blog_anon_session_id');
    if (!sid) {
      sid = 'sid_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem('blog_anon_session_id', sid);
    }
    setSessionId(sid);

    webApi.getReactions(locale, slug, sid).then((res) => {
      if (res?.counts) {
        setCounts(res.counts);
      }
      if (res?.userCounts) {
        setUserCounts(res.userCounts);
      }
    });
  }, [locale, slug]);

  const handleClap = async () => {
    const currentClaps = userCounts['CLAP'] || 0;
    if (currentClaps >= 50) return;

    // Optimistic update
    setCounts((prev) => ({ ...prev, CLAP: prev.CLAP + 1 }));
    setUserCounts((prev) => ({ ...prev, CLAP: currentClaps + 1 }));
    setActiveBubble('CLAP');
    setTimeout(() => setActiveBubble(null), 800);

    await webApi.addReaction(locale, slug, 'CLAP', 1, sessionId);
  };

  const handleEmoji = async (type: 'HEART' | 'ROCKET' | 'BULB') => {
    const currentUserCount = userCounts[type] || 0;
    if (currentUserCount >= 1) return; // one per session for emoji

    // Optimistic update
    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    setUserCounts((prev) => ({ ...prev, [type]: 1 }));
    setActiveBubble(type);
    setTimeout(() => setActiveBubble(null), 800);

    await webApi.addReaction(locale, slug, type, 1, sessionId);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 border-y border-slate-200 dark:border-white/[0.08]">
      <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mr-1">
        Bu makaleyi beğendiniz mi?
      </span>

      {/* Claps Button */}
      <div className="relative">
        <button
          onClick={handleClap}
          title="Alkışla (Maksimum 50)"
          className={`group flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-200 border ${
            (userCounts['CLAP'] || 0) > 0
              ? 'border-indigo-500/40 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-300 dark:hover:bg-[#18181b]'
          }`}
        >
          <span className="text-base group-hover:scale-125 transition-transform">👏</span>
          <span className="font-semibold">{counts.CLAP}</span>
          {(userCounts['CLAP'] || 0) > 0 && (
            <span className="text-[10px] text-indigo-500 font-mono">({userCounts['CLAP']})</span>
          )}
        </button>

        {activeBubble === 'CLAP' && (
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
            +1
          </span>
        )}
      </div>

      {/* Heart */}
      <div className="relative">
        <button
          onClick={() => handleEmoji('HEART')}
          title="Kalp Bırak"
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all border ${
            (userCounts['HEART'] || 0) > 0
              ? 'border-rose-500/40 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-300 dark:hover:bg-[#18181b]'
          }`}
        >
          <span className="text-sm">❤️</span>
          <span>{counts.HEART}</span>
        </button>
      </div>

      {/* Rocket */}
      <div className="relative">
        <button
          onClick={() => handleEmoji('ROCKET')}
          title="Roket Bırak"
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all border ${
            (userCounts['ROCKET'] || 0) > 0
              ? 'border-amber-500/40 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-300 dark:hover:bg-[#18181b]'
          }`}
        >
          <span className="text-sm">🚀</span>
          <span>{counts.ROCKET}</span>
        </button>
      </div>

      {/* Idea Bulb */}
      <div className="relative">
        <button
          onClick={() => handleEmoji('BULB')}
          title="Faydalı Buldum"
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all border ${
            (userCounts['BULB'] || 0) > 0
              ? 'border-yellow-500/40 bg-yellow-50 text-yellow-600 dark:border-yellow-500/30 dark:bg-yellow-950/40 dark:text-yellow-400'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-300 dark:hover:bg-[#18181b]'
          }`}
        >
          <span className="text-sm">💡</span>
          <span>{counts.BULB}</span>
        </button>
      </div>
    </div>
  );
};
