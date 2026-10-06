import React from 'react';
import { Link } from '../i18n/routing';

export interface FooterProps {
  locale?: string;
}

export const Footer: React.FC<FooterProps> = ({ locale = 'tr' }) => {
  const isTr = locale === 'tr';

  return (
    <footer className="border-t border-slate-200 bg-white py-12 dark:border-white/[0.08] dark:bg-[#09090b]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs border border-white/10">
              B
            </span>
            <span className="font-bold text-slate-900 dark:text-[#f4f4f5] tracking-tight">TechBlog</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-zinc-400">
            <Link
              href={isTr ? '/pages/hakkimizda' : '/pages/about'}
              className="hover:text-indigo-600 dark:hover:text-[#f4f4f5] transition-colors"
            >
              {isTr ? 'Hakkımızda' : 'About Us'}
            </Link>
            <Link
              href={isTr ? '/pages/gizlilik-politikasi' : '/pages/privacy-policy'}
              className="hover:text-indigo-600 dark:hover:text-[#f4f4f5] transition-colors"
            >
              {isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
            </Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-500 text-center md:text-right">
            © {new Date().getFullYear()} TechBlog. Bağımsız ve yüksek performanslı mimari ile geliştirilmiştir.
          </p>
        </div>
      </div>
    </footer>
  );
};

