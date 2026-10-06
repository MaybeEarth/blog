'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../i18n/routing';
import { webApi } from '../lib/api';
import { Search, X, Loader2, ArrowRight, Sparkles } from 'lucide-react';

export interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

export const SearchDialog: React.FC<SearchDialogProps> = ({
  isOpen,
  onClose,
  locale,
}) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ title: string; slug: string }>>([]);
  const [results, setResults] = useState<
    Array<{ id: string; title: string; slug: string; snippet?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSuggestions([]);
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search & suggest
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [suggestRes, searchRes] = await Promise.all([
          webApi.suggest(locale, query),
          webApi.search(locale, query, 5),
        ]);
        setSuggestions(suggestRes);
        setResults(searchRes);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, locale]);

  if (!isOpen) return null;

  const handleSelectPost = (slug: string) => {
    onClose();
    router.push(`/posts/${slug}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative mx-auto max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-[#121215] border border-slate-200 dark:border-white/[0.1]">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-slate-200 px-4 dark:border-white/[0.08]">
          <Search className="w-5 h-5 text-slate-400 dark:text-zinc-500 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Makale, konu veya anahtar kelime arayın..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-[#f4f4f5] dark:placeholder-zinc-500"
          />
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500 shrink-0 ml-2" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Content Area */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {/* Trigram Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Önerilen Başlıklar</span>
              </div>
              <div className="space-y-1">
                {suggestions.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => handleSelectPost(s.slug)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-300 dark:hover:bg-white/[0.05] dark:hover:text-[#f4f4f5] transition-colors"
                  >
                    <span className="truncate">{s.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full-Text Search Matches with Snippets */}
          {results.length > 0 && (
            <div className="border-t border-slate-100 pt-3 dark:border-white/[0.08]">
              <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                Arama Sonuçları ({results.length})
              </div>
              <div className="space-y-2">
                {results.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleSelectPost(r.slug)}
                    className="group rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-[#18181b] cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/[0.08]"
                  >
                    <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-[#f4f4f5] dark:group-hover:text-indigo-400">
                      {r.title}
                    </h4>
                    {r.snippet && (
                      <p
                        className="mt-1 text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 [&>b]:text-indigo-600 [&>b]:font-semibold dark:[&>b]:text-indigo-400"
                        dangerouslySetInnerHTML={{ __html: r.snippet }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {query.length >= 2 && !isLoading && suggestions.length === 0 && results.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500">
              "{query}" ile eşleşen bir içerik bulunamadı.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-400 dark:border-white/[0.08] dark:bg-[#09090b] dark:text-zinc-500">
          <span>PostgreSQL Trigram + Full-Text Search</span>
          <span>Seçmek için tıklayın • Kapatmak için ESC</span>
        </div>
      </div>
    </div>
  );
};
