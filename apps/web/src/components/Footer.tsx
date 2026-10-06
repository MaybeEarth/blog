import React from 'react';
import { Link } from '../i18n/routing';

export interface FooterProps {
  locale?: string;
}

export const Footer: React.FC<FooterProps> = ({ locale = 'tr' }) => {
  const isTr = locale === 'tr';

  return (
    <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              B
            </span>
            <span className="font-bold text-slate-900 dark:text-white">TechBlog</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <Link
              href={isTr ? '/pages/hakkimizda' : '/pages/about'}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {isTr ? 'Hakkımızda' : 'About Us'}
            </Link>
            <Link
              href={isTr ? '/pages/gizlilik-politikasi' : '/pages/privacy-policy'}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
            </Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center md:text-right">
            © {new Date().getFullYear()} TechBlog. Bağımsız ve yüksek performanslı mimari ile geliştirilmiştir.
          </p>
        </div>
      </div>
    </footer>
  );
};

