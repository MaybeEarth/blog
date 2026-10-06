'use client';

import React, { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';

export interface ShareButtonsProps {
  title: string;
  url: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ title, url }) => {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== 'undefined' ? (url.startsWith('http') ? url : window.location.origin + url) : url;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          url: fullUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mr-1">Paylaş:</span>

      {/* Native / Mobile Share */}
      <button
        onClick={handleNativeShare}
        title="Paylaş"
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-400 dark:hover:bg-[#18181b] dark:hover:text-[#f4f4f5] transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopy}
        title={copied ? 'Kopyalandı!' : 'Bağlantıyı Kopyala'}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-400 dark:hover:bg-[#18181b] dark:hover:text-[#f4f4f5] transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500 font-semibold">Kopyalandı</span>
          </>
        ) : (
          <>
            <Link2 className="w-3.5 h-3.5" />
            <span>Kopyala</span>
          </>
        )}
      </button>

      {/* Twitter / X */}
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        title="X (Twitter)'da Paylaş"
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-400 dark:hover:bg-[#18181b] dark:hover:text-white transition-colors"
      >
        <span className="text-xs font-bold">𝕏</span>
      </a>

      {/* LinkedIn */}
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        title="LinkedIn'de Paylaş"
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-400 dark:hover:bg-[#18181b] dark:hover:text-blue-400 transition-colors"
      >
        <span className="text-[11px] font-bold">in</span>
      </a>

      {/* WhatsApp */}
      <a
        href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp'ta Paylaş"
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-400 dark:hover:bg-[#18181b] dark:hover:text-emerald-400 transition-colors"
      >
        <span className="text-[11px] font-bold">WA</span>
      </a>
    </div>
  );
};
