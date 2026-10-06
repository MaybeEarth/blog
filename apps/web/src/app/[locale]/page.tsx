import React from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { webApi } from '../../lib/api';
import { PostCard } from '../../components/PostCard';
import { Link } from '../../i18n/routing';
import { Sparkles, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { NewsletterForm } from '../../components/NewsletterForm';

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cursor?: string; category?: string }>;
}) {
  const { locale } = await params;
  const { cursor, category } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('common');

  // API'den içerikleri ve kategorileri eşzamanlı çek
  const [postsResponse, categories] = await Promise.all([
    webApi.getPosts(locale, { cursor, limit: 12, category }),
    webApi.getCategories(locale),
  ]);

  const posts = postsResponse?.items || [];
  const featuredPost = posts.find((p) => p.featured) || posts[0];
  const regularPosts = featuredPost
    ? posts.filter((p) => p.id !== featuredPost.id)
    : posts;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-12">
      {/* Hero Section / Featured Post */}
      {featuredPost && !cursor && !category && (
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-[#121215] shadow-xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.45)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 sm:p-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>{t('featured')}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#f4f4f5] leading-tight">
                <Link
                  href={`/posts/${featuredPost.slug}`}
                  className="hover:text-indigo-600 dark:hover:text-white transition-colors"
                >
                  {featuredPost.title}
                </Link>
              </h1>

              {featuredPost.excerpt && (
                <p className="text-sm sm:text-base text-slate-600 dark:text-[#a1a1aa] line-clamp-3 leading-relaxed font-normal">
                  {featuredPost.excerpt}
                </p>
              )}

              <div className="flex items-center gap-3 pt-2 text-xs text-slate-400 dark:text-zinc-500 font-medium">
                <span className="text-slate-600 dark:text-zinc-400">{featuredPost.categories[0]?.name}</span>
                <span>•</span>
                <span>{featuredPost.readingTimeMin} {t('readTime')}</span>
                <span>•</span>
                <span>{featuredPost.viewsCount.toLocaleString()} {t('views')}</span>
              </div>

              <div className="pt-2">
                <Link
                  href={`/posts/${featuredPost.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-indigo-500 hover:shadow-[0_0_20px_-3px_rgba(79,70,229,0.35)] transition-all duration-200"
                >
                  <span>Makaleyi Oku</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="relative aspect-video lg:aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-[#18181b] border border-slate-200/60 dark:border-white/[0.04]">
              {featuredPost.coverMedia ? (
                <Image
                  src={`http://localhost:9000/media/${featuredPost.coverMedia.storageKey}`}
                  alt={featuredPost.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  blurDataURL={featuredPost.coverMedia.blurhash || undefined}
                  placeholder={featuredPost.coverMedia.blurhash ? 'blur' : 'empty'}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-[#18181b] p-6 text-center">
                  <span className="font-mono text-xs uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-medium">
                    TechBlog // Editorial
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <section id="categories" className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <Link
              href="/"
              className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                !category
                  ? 'bg-indigo-600 text-white shadow-xs dark:bg-white/[0.1] dark:text-zinc-100 dark:border dark:border-white/15'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-200 border border-slate-200 dark:border-white/[0.06]'
              }`}
            >
              {t('allPosts')}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.slug}`}
                className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  category === cat.slug
                    ? 'bg-indigo-600 text-white shadow-xs dark:bg-white/[0.1] dark:text-zinc-100 dark:border dark:border-white/15'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-200 border border-slate-200 dark:border-white/[0.06]'
                }`}
              >
                {cat.name} ({cat.postCount})
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Articles Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/[0.08]">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#f4f4f5]">
            {category
              ? `Kategori: ${categories.find((c) => c.slug === category)?.name || category}`
              : t('allPosts')}
          </h2>
          <span className="text-xs text-slate-400 dark:text-zinc-500">
            {posts.length} makale listelendi
          </span>
        </div>

        {regularPosts.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500 dark:text-zinc-400">
            {t('noPostsFound')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularPosts.map((post) => (
              <PostCard key={post.id} post={post} locale={locale} />
            ))}
          </div>
        )}

        {/* Keyset Pagination Load More */}
        {postsResponse?.hasNextPage && postsResponse.nextCursor && (
          <div className="pt-8 text-center">
            <Link
              href={`/?cursor=${postsResponse.nextCursor}${
                category ? `&category=${category}` : ''
              }`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#121215] dark:text-zinc-300 dark:hover:bg-[#18181b] dark:hover:text-white shadow-xs transition-colors"
            >
              <span>{t('loadMore')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* Newsletter Section */}
      <section className="pt-6">
        <NewsletterForm />
      </section>
    </div>
  );
}
