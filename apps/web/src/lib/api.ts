import type {
  CursorPaginatedResponse,
  PostListItem,
  PostDetailItem,
  CategoryDto,
  TagDto,
} from '@blog/shared';

const API_BASE =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api/v1';

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T | null> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`API Error [${res.status}] for ${url}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`Network error for ${url}:`, error);
    return null;
  }
}

export const webApi = {
  getPosts: async (
    locale: string,
    params: { cursor?: string; limit?: number; category?: string; tag?: string } = {},
  ): Promise<CursorPaginatedResponse<PostListItem> | null> => {
    const searchParams = new URLSearchParams({ locale });
    if (params.cursor) searchParams.set('cursor', params.cursor);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.category) searchParams.set('category', params.category);
    if (params.tag) searchParams.set('tag', params.tag);

    return fetchApi<CursorPaginatedResponse<PostListItem>>(
      `/posts?${searchParams.toString()}`,
      {
        next: { tags: [`posts:${locale}`], revalidate: 3600 },
      },
    );
  },

  getPopular: async (locale: string, limit = 5): Promise<PostListItem[]> => {
    return (
      (await fetchApi<PostListItem[]>(`/posts/popular?locale=${locale}&limit=${limit}`, {
        next: { tags: [`posts:${locale}`], revalidate: 3600 },
      })) || []
    );
  },

  getPostBySlug: async (
    locale: string,
    slug: string,
  ): Promise<PostDetailItem | null> => {
    return fetchApi<PostDetailItem>(`/posts/${locale}/${slug}`, {
      next: { tags: [`post:${locale}:${slug}`], revalidate: 3600 },
    });
  },

  getRelated: async (
    locale: string,
    slug: string,
    limit = 4,
  ): Promise<PostListItem[]> => {
    return (
      (await fetchApi<PostListItem[]>(
        `/posts/${locale}/${slug}/related?limit=${limit}`,
        {
          next: { revalidate: 3600 },
        },
      )) || []
    );
  },

  getCategories: async (locale: string): Promise<CategoryDto[]> => {
    return (
      (await fetchApi<CategoryDto[]>(`/categories?locale=${locale}`, {
        next: { tags: [`categories:${locale}`], revalidate: 86400 },
      })) || []
    );
  },

  getTags: async (locale: string): Promise<TagDto[]> => {
    return (
      (await fetchApi<TagDto[]>(`/tags?locale=${locale}`, {
        next: { tags: [`tags:${locale}`], revalidate: 86400 },
      })) || []
    );
  },

  getRedirect: async (
    locale: string,
    path: string,
  ): Promise<{ toPath: string; statusCode: number } | null> => {
    return fetchApi<{ toPath: string; statusCode: number }>(
      `/redirects?locale=${locale}&path=${encodeURIComponent(path)}`,
      { cache: 'no-store' },
    );
  },

  search: async (locale: string, q: string, limit = 10) => {
    return (
      (await fetchApi<
        Array<{ id: string; title: string; slug: string; snippet?: string }>
      >(
        `/search?locale=${locale}&q=${encodeURIComponent(q)}&limit=${limit}`,
        { cache: 'no-store' },
      )) || []
    );
  },

  suggest: async (locale: string, q: string) => {
    return (
      (await fetchApi<Array<{ title: string; slug: string }>>(
        `/search/suggest?locale=${locale}&q=${encodeURIComponent(q)}`,
        { cache: 'no-store' },
      )) || []
    );
  },

  sendViewBeacon: async (postId: string, locale: string) => {
    try {
      await fetch(`${API_BASE}/analytics/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, locale }),
        keepalive: true,
      });
    } catch {
      // Beacon errors ignored
    }
  },

  getPageBySlug: async (
    locale: string,
    slug: string,
  ): Promise<{
    id: string;
    locale: string;
    title: string;
    slug: string;
    contentHtml: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    alternates: Array<{ locale: string; slug: string; title: string }>;
  } | null> => {
    return fetchApi(`/pages/${locale}/${slug}`, {
      next: { tags: [`pages:${locale}:${slug}`], revalidate: 3600 },
    });
  },
};
