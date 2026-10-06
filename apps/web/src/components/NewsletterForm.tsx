'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';

export function NewsletterForm() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isTr = locale === 'tr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${apiUrl}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (isTr ? 'Bir hata oluştu' : 'An error occurred'));
      }

      setStatus('success');
      setMessage(
        data.message ||
          (isTr
            ? 'Abonelik talebiniz alındı! Lütfen e-postanızı onaylayın.'
            : 'Subscription request received! Please verify your email.')
      );
      setEmail('');
    } catch (err: unknown) {
      setStatus('error');
      const error = err as Error;
      setMessage(error.message || (isTr ? 'Bağlantı hatası' : 'Connection error'));
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-white/[0.08] dark:bg-[#121215]">
      <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-[#f4f4f5]">
        {isTr ? 'Bültenimize Abone Olun' : 'Subscribe to Newsletter'}
      </h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {isTr
          ? 'En son teknik makaleler ve güncellemeler doğrudan gelen kutunuzda.'
          : 'Latest technical articles and insights delivered directly to your inbox.'}
      </p>

      {status === 'success' ? (
        <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          ✅ {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isTr ? 'ornek@eposta.com' : 'you@example.com'}
            required
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-[#18181b] dark:text-[#f4f4f5] dark:placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-500 hover:shadow-[0_0_20px_-3px_rgba(79,70,229,0.35)] focus:outline-none disabled:opacity-60"
          >
            {status === 'loading'
              ? isTr
                ? 'Kaydediliyor...'
                : 'Subscribing...'
              : isTr
              ? 'Abone Ol'
              : 'Subscribe'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
          ⚠️ {message}
        </p>
      )}
    </div>
  );
}
