import { z } from 'zod';

export const PostStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type PostStatus = z.infer<typeof PostStatusEnum>;

export const postQuerySchema = z.object({
  locale: z.string().default('tr'),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
  category: z.string().optional(),
  tag: z.string().optional(),
  author: z.string().optional(),
});
export type PostQueryInput = z.infer<typeof postQuerySchema>;

export const searchQuerySchema = z.object({
  locale: z.string().default('tr'),
  q: z.string().min(2, 'Arama terimi en az 2 karakter olmalıdır').max(100),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

export const createPostSchema = z.object({
  featured: z.boolean().default(false),
  coverMediaId: z.string().uuid().optional(),
  categoryIds: z.array(z.string().uuid()).default([]),
  tagIds: z.array(z.string().uuid()).default([]),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const upsertTranslationSchema = z.object({
  title: z.string().min(3).max(250),
  slug: z.string().min(3).max(100).optional(),
  excerpt: z.string().max(500).optional(),
  contentJson: z.record(z.unknown()).optional(),
  contentHtml: z.string().min(10),
  metaTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(300).optional(),
  canonicalUrl: z.string().url().optional(),
  noindex: z.boolean().default(false),
});
export type UpsertTranslationInput = z.infer<typeof upsertTranslationSchema>;

export const viewBeaconSchema = z.object({
  postId: z.string().uuid(),
  locale: z.string().length(2),
});
export type ViewBeaconInput = z.infer<typeof viewBeaconSchema>;

export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface PostListItem {
  id: string;
  postId: string;
  locale: string;
  title: string;
  slug: string;
  excerpt: string | null;
  readingTimeMin: number;
  publishedAt: Date | string | null;
  viewsCount: number;
  featured: boolean;
  coverMedia: {
    id: string;
    storageKey: string;
    blurhash: string | null;
  } | null;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
  author: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface PostDetailItem extends PostListItem {
  contentHtml: string;
  contentJson: Record<string, unknown> | null;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  alternates: Array<{
    locale: string;
    slug: string;
    title: string;
  }>;
}
