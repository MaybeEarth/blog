import { apiClient } from './client';
import {
  PostQueryInput,
  CursorPaginatedResponse,
  PostListItem,
  PostDetailItem,
  CreatePostInput,
  UpsertTranslationInput,
} from '@blog/shared';

export const postsApi = {
  getPosts: async (
    query: Partial<PostQueryInput> = {},
  ): Promise<CursorPaginatedResponse<PostListItem>> => {
    const params = new URLSearchParams();
    if (query.locale) params.set('locale', query.locale);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.category) params.set('category', query.category);
    if (query.tag) params.set('tag', query.tag);
    if (query.author) params.set('author', query.author);

    const qs = params.toString();
    return apiClient<CursorPaginatedResponse<PostListItem>>(
      `/posts${qs ? `?${qs}` : ''}`,
    );
  },

  getPostBySlug: async (locale: string, slug: string): Promise<PostDetailItem> => {
    return apiClient<PostDetailItem>(`/posts/${locale}/${slug}`);
  },

  createPost: async (dto: CreatePostInput): Promise<{ id: string }> => {
    return apiClient<{ id: string }>('/posts', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  upsertTranslation: async (
    postId: string,
    locale: string,
    dto: UpsertTranslationInput,
  ): Promise<any> => {
    return apiClient(`/posts/${postId}/translations/${locale}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  publishTranslation: async (postId: string, locale: string): Promise<any> => {
    return apiClient(`/posts/${postId}/translations/${locale}/publish`, {
      method: 'POST',
    });
  },

  deletePost: async (id: string): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/posts/${id}`, {
      method: 'DELETE',
    });
  },
};
