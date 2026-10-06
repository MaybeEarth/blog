import React from 'react';

export interface FooterProps {
  locale?: string;
}

export const Footer: React.FC<FooterProps> = () => {
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

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center md:text-right">
            © {new Date().getFullYear()} TechBlog. Bağımsız ve yüksek performanslı mimari ile geliştirilmiştir.
          </p>
        </div>
      </div>
    </footer>
  );
};
