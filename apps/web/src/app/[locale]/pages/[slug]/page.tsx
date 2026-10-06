import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { webApi } from '../../../../lib/api';
import { Link } from '../../../../i18n/routing';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await webApi.getPageBySlug(locale, slug);

  if (!page) {
    return { title: 'Sayfa Bulunamadı' };
  }

  const alternatesRecord: Record<string, string> = {};
  if (page.alternates) {
    for (const alt of page.alternates) {
      alternatesRecord[alt.locale] = `/${alt.locale}/pages/${alt.slug}`;
    }
  }

  return {
    title: page.metaTitle || `${page.title} | TechBlog`,
    description: page.metaDescription || `${page.title} sayfası.`,
    alternates: {
      canonical: `/${locale}/pages/${page.slug}`,
      languages: alternatesRecord,
    },
  };
}

export default async function InstitutionalPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const page = await webApi.getPageBySlug(locale, slug);
  if (!page) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Back button */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-[#f4f4f5] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{locale === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}</span>
        </Link>
      </div>

      <header className="mb-10 space-y-4 border-b border-slate-200 pb-8 dark:border-white/[0.08]">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-[#f4f4f5] sm:text-4xl">
          {page.title}
        </h1>
      </header>

      <div
        className="prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed sm:text-lg prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-[#f4f4f5] prose-p:text-slate-700 dark:prose-p:text-zinc-300 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 dark:prose-strong:text-white dark:prose-code:text-zinc-200"
        dangerouslySetInnerHTML={{ __html: page.contentHtml }}
      />
    </div>
  );
}
