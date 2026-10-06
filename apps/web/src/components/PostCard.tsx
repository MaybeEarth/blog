import React from 'react';
import { Link } from '../i18n/routing';
import type { PostListItem } from '@blog/shared';
import { Clock, Eye, Calendar } from 'lucide-react';
import Image from 'next/image';

export interface PostCardProps {
  post: PostListItem;
  locale: string;
}

export const PostCard: React.FC<PostCardProps> = ({ post, locale }) => {
  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(
        locale === 'tr' ? 'tr-TR' : 'en-US',
        { year: 'numeric', month: 'short', day: 'numeric' },
      )
    : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 hover:border-slate-300 hover:shadow-xl dark:border-white/[0.08] dark:bg-[#121215] dark:hover:border-white/[0.18] hover:-translate-y-0.5 dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
      {/* Cover Image / Thumbnail */}
      <Link href={`/posts/${post.slug}`} className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-[#18181b] border-b border-slate-200/60 dark:border-white/[0.04]">
        {post.coverMedia ? (
          <Image
            src={`http://localhost:9000/media/${post.coverMedia.storageKey}`}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            blurDataURL={post.coverMedia.blurhash || undefined}
            placeholder={post.coverMedia.blurhash ? 'blur' : 'empty'}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-[#18181b] p-6 text-center">
            <span className="font-mono text-xs text-slate-400 dark:text-zinc-500 group-hover:text-zinc-400 transition-colors">
              {post.categories[0]?.name || 'Teknoloji'}
            </span>
          </div>
        )}

        {post.featured && (
          <div className="absolute top-3 left-3 rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-zinc-300">
            Öne Çıkan
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Category Tag */}
        {post.categories.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {post.categories.slice(0, 2).map((cat) => (
              <span
                key={cat.id}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400/90"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 dark:text-[#f4f4f5] dark:group-hover:text-white transition-colors line-clamp-2">
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mt-2 text-xs text-slate-500 dark:text-[#a1a1aa] line-clamp-2 leading-relaxed font-normal">
            {post.excerpt}
          </p>
        )}

        {/* Footer info */}
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-400 dark:border-white/[0.06] dark:text-zinc-500">
          <div className="flex items-center gap-3">
            {publishedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{publishedDate}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{post.readingTimeMin} dk</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{post.viewsCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </article>
  );
};
