'use client';

import { useEffect } from 'react';

export const CodeBlockEnhancer = () => {
  useEffect(() => {
    const preBlocks = document.querySelectorAll('article .prose pre');

    preBlocks.forEach((pre) => {
      // Avoid duplicate enhancement
      if (pre.querySelector('.code-copy-btn')) return;

      const code = pre.querySelector('code');
      const text = code ? code.innerText : pre.textContent || '';

      // Make pre relative
      pre.classList.add('relative', 'group');

      // Create copy button
      const copyBtn = document.createElement('button');
      copyBtn.className =
        'code-copy-btn absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg px-2.5 py-1 text-[11px] font-mono font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80 shadow-xs cursor-pointer select-none';
      copyBtn.innerText = 'Kopyala';

      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.innerText = 'Kopyalandı!';
          copyBtn.classList.add('text-emerald-400');
          setTimeout(() => {
            copyBtn.innerText = 'Kopyala';
            copyBtn.classList.remove('text-emerald-400');
          }, 2000);
        } catch {
          // ignore
        }
      });

      pre.appendChild(copyBtn);
    });
  }, []);

  return null;
};
