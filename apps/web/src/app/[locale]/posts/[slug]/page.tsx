import React from 'react';
import { notFound, redirect, RedirectType } from 'next/navigation';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { webApi } from '../../../../lib/api';
import { ViewBeacon } from '../../../../components/ViewBeacon';
import { PostCard } from '../../../../components/PostCard';
import { Link } from '../../../../i18n/routing';
import { Clock, Eye, Calendar, Tag, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { NewsletterForm } from '../../../../components/NewsletterForm';

interface PostPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await webApi.getPostBySlug(locale, slug);

  if (!post) {
    return { title: 'Yazı Bulunamadı' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const canonical = post.canonicalUrl || `${siteUrl}/${locale}/posts/${post.slug}`;

  // Reciprocal hreflang alternates
  const alternateLanguages: Record<string, string> = {
    [locale]: `${siteUrl}/${locale}/posts/${post.slug}`,
  };

  if (post.alternates) {
    for (const alt of post.alternates) {
      alternateLanguages[alt.locale] = `${siteUrl}/${alt.locale}/posts/${alt.slug}`;
    }
  }

  const coverUrl = post.coverMedia
    ? `http://localhost:9000/media/${post.coverMedia.storageKey}`
    : undefined;

  return {
    title: post.metaTitle || `${post.title} | TechBlog`,
    description: post.metaDescription || post.excerpt || undefined,
    alternates: {
      canonical,
      languages: alternateLanguages,
    },
    robots: {
      index: !post.noindex,
      follow: !post.noindex,
    },
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || undefined,
      url: canonical,
      siteName: 'TechBlog',
      type: 'article',
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      authors: [post.author.displayName || post.author.username],
      images: coverUrl ? [{ url: coverUrl, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function PostDetailPage({ params }: PostPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await webApi.getPostBySlug(locale, slug);

  // Yazı bulunamadıysa 301 yönlendirmesi var mı kontrol et
  if (!post) {
    const redirectInfo = await webApi.getRedirect(locale, `/posts/${slug}`);
    if (redirectInfo) {
      redirect(redirectInfo.toPath, RedirectType.replace);
    }
    notFound();
  }

  const relatedPosts = await webApi.getRelated(locale, slug, 3);

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(
        locale === 'tr' ? 'tr-TR' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' },
      )
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.metaDescription,
    image: post.coverMedia ? `http://localhost:9000/media/${post.coverMedia.storageKey}` : undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    author: {
      '@type': 'Person',
      name: post.author.displayName || post.author.username,
    },
    publisher: {
      '@type': 'Organization',
      name: 'TechBlog',
      url: siteUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/${locale}/posts/${post.slug}`,
    },
  };

  return (
    <>
      {/* JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Analytics View Beacon */}
      <ViewBeacon postId={post.postId} locale={locale} />

      <article className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-10">
        {/* Back Link & Alternates Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tüm Yazılara Dön</span>
          </Link>

          {/* Reciprocal Hreflang Language Switcher */}
          {post.alternates && post.alternates.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Diğer dilde oku:</span>
              {post.alternates.map((alt) => (
                <a
                  key={alt.locale}
                  href={`/${alt.locale}/posts/${alt.slug}`}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase text-[11px]"
                >
                  {alt.locale}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Header */}
        <header className="space-y-4">
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.categories.map((c) => (
                <span
                  key={c.id}
                  className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                >
                  {c.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {post.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 text-xs text-slate-400 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-bold text-xs">
                {post.author.displayName.slice(0, 1)}
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {post.author.displayName}
              </span>
            </div>

            <span>•</span>

            {publishedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{publishedDate}</span>
              </span>
            )}

            <span>•</span>

            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{post.readingTimeMin} dk okuma</span>
            </span>

            <span>•</span>

            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{post.viewsCount.toLocaleString()} okunma</span>
            </span>
          </div>
        </header>

        {/* Cover Image */}
        {post.coverMedia && (
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800 shadow-md">
            <Image
              src={`http://localhost:9000/media/${post.coverMedia.storageKey}`}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
              blurDataURL={post.coverMedia.blurhash || undefined}
              placeholder={post.coverMedia.blurhash ? 'blur' : 'empty'}
            />
          </div>
        )}

        {/* Main Article Content */}
        <div
          className="prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed sm:text-lg prose-headings:font-bold prose-headings:tracking-tight prose-a:text-indigo-600 prose-img:rounded-2xl"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400">Etiketler:</span>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                >
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span>#{t.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="pt-12 border-t border-slate-200 dark:border-slate-800 space-y-6">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              İlginizi Çekebilecek Diğer Yazılar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {relatedPosts.map((rp) => (
                <PostCard key={rp.id} post={rp} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* Newsletter Callout */}
        <div className="pt-10 border-t border-slate-200 dark:border-slate-800">
          <NewsletterForm />
        </div>
      </article>
    </>
  );
}
