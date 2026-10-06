import type { MetadataRoute } from 'next';
import { webApi } from '../lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Ana sayfalar
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/tr`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          tr: `${siteUrl}/tr`,
          en: `${siteUrl}/en`,
        },
      },
    },
    {
      url: `${siteUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          tr: `${siteUrl}/tr`,
          en: `${siteUrl}/en`,
        },
      },
    },
  ];

  // Türkçe ve İngilizce tüm yazıları çek
  const [trPosts, enPosts] = await Promise.all([
    webApi.getPosts('tr', { limit: 50 }),
    webApi.getPosts('en', { limit: 50 }),
  ]);

  if (trPosts?.items) {
    for (const post of trPosts.items) {
      routes.push({
        url: `${siteUrl}/tr/posts/${post.slug}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  if (enPosts?.items) {
    for (const post of enPosts.items) {
      routes.push({
        url: `${siteUrl}/en/posts/${post.slug}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  return routes;
}
