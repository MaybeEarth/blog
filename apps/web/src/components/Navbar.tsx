'use client';

import React, { useState } from 'react';
import { Link, usePathname, useRouter } from '../i18n/routing';
import { useTranslations } from 'next-intl';
import { Search, Globe, Menu, X } from 'lucide-react';
import { SearchDialog } from './SearchDialog';
import { ThemeToggle } from './ThemeToggle';

export interface NavbarProps {
  locale: string;
}

export const Navbar: React.FC<NavbarProps> = ({ locale }) => {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const nextLocale = locale === 'tr' ? 'en' : 'tr';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#09090b]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 dark:text-[#f4f4f5]">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm font-extrabold text-white shadow-xs border border-white/10">
              B
            </span>
            <span className="text-lg tracking-tight">TechBlog</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-zinc-400">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-[#f4f4f5] transition-colors">
              {t('home')}
            </Link>
            <Link href="/#categories" className="hover:text-indigo-600 dark:hover:text-[#f4f4f5] transition-colors">
              {t('categories')}
            </Link>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            {/* Search trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:bg-[#121215] dark:border dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-[#18181b] transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ara...</span>
              <kbd className="hidden sm:inline rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-200 dark:border-white/[0.08] dark:bg-[#18181b] dark:text-zinc-400">
                ⌘K
              </kbd>
            </button>

            {/* Language toggle button */}
            <button
              onClick={toggleLanguage}
              title={locale === 'tr' ? 'Switch to English' : 'Türkçe diline geç'}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#121215] dark:text-zinc-300 dark:hover:bg-[#18181b] dark:hover:text-[#f4f4f5] transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span className="uppercase">{locale}</span>
            </button>

            {/* Dark mode toggle */}
            <ThemeToggle />

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-[#18181b] dark:hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#09090b] space-y-3">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-700 dark:text-zinc-200 py-1"
            >
              {t('home')}
            </Link>
            <Link
              href="/#categories"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-700 dark:text-zinc-200 py-1"
            >
              {t('categories')}
            </Link>
          </div>
        )}
      </header>

      {/* Global Search Dialog */}
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        locale={locale}
      />
    </>
  );
};
