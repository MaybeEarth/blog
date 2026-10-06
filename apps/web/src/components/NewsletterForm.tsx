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
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
        {isTr ? 'Bültenimize Abone Olun' : 'Subscribe to Newsletter'}
      </h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {isTr
          ? 'En son teknik makaleler ve güncellemeler doğrudan gelen kutunuzda.'
          : 'Latest technical articles and insights delivered directly to your inbox.'}
      </p>

      {status === 'success' ? (
        <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          ✅ {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isTr ? 'ornek@eposta.com' : 'you@example.com'}
            required
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
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
