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
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all hover:border-slate-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
      {/* Cover Image / Thumbnail */}
      <Link href={`/posts/${post.slug}`} className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
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
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6 text-center">
            <span className="text-sm font-semibold text-slate-400 group-hover:text-indigo-500 transition-colors">
              {post.categories[0]?.name || 'Teknoloji'}
            </span>
          </div>
        )}

        {post.featured && (
          <div className="absolute top-3 left-3 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
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
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {/* Footer info */}
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-400 dark:border-slate-800/80">
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
