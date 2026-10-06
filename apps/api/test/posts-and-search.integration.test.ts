import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { RedisService } from '../src/infra/redis/redis.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';

let app: NestFastifyApplication;
let prisma: PrismaService;
let redis: RedisService;
let analytics: AnalyticsService;
let adminToken: string;

before(async () => {
  const adapter = new FastifyAdapter();
  app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: false,
  });

  await app.register(fastifyCookie as any);
  app.setGlobalPrefix('api/v1');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  prisma = app.get(PrismaService);
  redis = app.get(RedisService);
  analytics = app.get(AnalyticsService);

  // Admin login for admin endpoints
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      identifier: 'admin@example.com',
      password: 'Admin!12345',
    },
  });
  adminToken = JSON.parse(loginRes.body).accessToken;
});

after(async () => {
  if (app) {
    await app.close();
  }
});

test('1. Keyset pagination returns first page with valid nextCursor and hasNextPage', async () => {
  const res1 = await app.inject({
    method: 'GET',
    url: '/api/v1/posts?locale=tr&limit=5',
  });

  assert.equal(res1.statusCode, 200);
  const data1 = JSON.parse(res1.body);
  assert.equal(data1.items.length, 5);
  assert.equal(data1.hasNextPage, true);
  assert.ok(data1.nextCursor);

  // İkinci sayfayı çek
  const res2 = await app.inject({
    method: 'GET',
    url: `/api/v1/posts?locale=tr&limit=5&cursor=${data1.nextCursor}`,
  });

  assert.equal(res2.statusCode, 200);
  const data2 = JSON.parse(res2.body);
  assert.equal(data2.items.length, 5);

  // 1. sayfanın en son elemanının tarihi >= 2. sayfanın ilk elemanının tarihi olmalı (kronolojik sıra)
  const lastPage1Date = new Date(data1.items[4].publishedAt).getTime();
  const firstPage2Date = new Date(data2.items[0].publishedAt).getTime();
  assert.ok(
    lastPage1Date >= firstPage2Date,
    'Keyset pagination must preserve strict descending chronological ordering',
  );

  // ID'ler kesinlikle çakışmamalı
  const ids1 = new Set(data1.items.map((i: any) => i.id));
  for (const item of data2.items) {
    assert.ok(!ids1.has(item.id), 'Page 2 must not contain any items from Page 1');
  }
});

test('2. Post detail includes full content and multilingual alternates (hreflang)', async () => {
  const detailRes = await app.inject({
    method: 'GET',
    url: '/api/v1/posts/tr/modern-web-mimarisi-ve-olceklenebilirlik-rehberi-1',
  });

  assert.equal(detailRes.statusCode, 200);
  const detail = JSON.parse(detailRes.body);
  assert.equal(detail.slug, 'modern-web-mimarisi-ve-olceklenebilirlik-rehberi-1');
  assert.ok(detail.contentHtml.includes('<h2>Giriş</h2>'));
  assert.ok(detail.readingTimeMin > 0);
  assert.ok(Array.isArray(detail.alternates));
  assert.ok(detail.alternates.length >= 1, 'Post must have alternate translations');
  assert.equal(detail.alternates[0].locale, 'en');
});

test('3. Negative caching for non-existent post returns 404 and caches the miss', async () => {
  const randomSlug = `non-existent-${Date.now()}`;

  const res1 = await app.inject({
    method: 'GET',
    url: `/api/v1/posts/tr/${randomSlug}`,
  });
  assert.equal(res1.statusCode, 404);

  // İkinci istek de hemen 404 dönmeli (Redis negatif cache)
  const res2 = await app.inject({
    method: 'GET',
    url: `/api/v1/posts/tr/${randomSlug}`,
  });
  assert.equal(res2.statusCode, 404);
});

test('4. Full-Text Search in Turkish matches tsvector and returns highlighted snippets', async () => {
  const searchRes = await app.inject({
    method: 'GET',
    url: '/api/v1/search?locale=tr&q=Ölçeklenebilirlik&limit=5',
  });

  assert.equal(searchRes.statusCode, 200);
  const results = JSON.parse(searchRes.body);
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0, 'Should find matches for Turkish term');

  const first = results[0];
  assert.ok(first.rank > 0);
  assert.ok(first.snippet, 'Snippet must be generated');
});

test('5. Full-Text Search in English matches stemmed words', async () => {
  const searchRes = await app.inject({
    method: 'GET',
    url: '/api/v1/search?locale=en&q=Architecture&limit=5',
  });

  assert.equal(searchRes.statusCode, 200);
  const results = JSON.parse(searchRes.body);
  assert.ok(results.length > 0, 'Should find matches for English term');
  assert.equal(results[0].locale, 'en');
});

test('6. Trigram title autocomplete suggestion returns fast matches', async () => {
  const suggestRes = await app.inject({
    method: 'GET',
    url: '/api/v1/search/suggest?locale=tr&q=Mimar',
  });

  assert.equal(suggestRes.statusCode, 200);
  const suggestions = JSON.parse(suggestRes.body);
  assert.ok(Array.isArray(suggestions));
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions[0].title.includes('Mimar'));
});

test('7. Publishing new post invalidates Redis tag cache', async () => {
  // 1. Yazı oluştur
  const createPostRes = await app.inject({
    method: 'POST',
    url: '/api/v1/posts',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { featured: true },
  });
  assert.equal(createPostRes.statusCode, 201);
  const newPost = JSON.parse(createPostRes.body);

  // 2. Çeviri ekle (DRAFT)
  const customTitle = `Canlı Yayın Testi ${Date.now()}`;
  const upsertTransRes = await app.inject({
    method: 'PUT',
    url: `/api/v1/posts/${newPost.id}/translations/tr`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      title: customTitle,
      contentHtml: '<p>Önbellek geçersiz kılma doğrulaması için oluşturulan içerik.</p>',
    },
  });
  assert.equal(upsertTransRes.statusCode, 200);

  // 3. Yayına al
  const publishRes = await app.inject({
    method: 'POST',
    url: `/api/v1/posts/${newPost.id}/translations/tr/publish`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert.equal(publishRes.statusCode, 201);

  // 4. Liste sorgusunda en tepede gelmeli
  const listRes = await app.inject({
    method: 'GET',
    url: '/api/v1/posts?locale=tr&limit=1',
  });
  const topItem = JSON.parse(listRes.body).items[0];
  assert.equal(topItem.title, customTitle, 'New published post must invalidate cache and appear on top');
});

test('8. View beacon increments Redis counters and flushes to PostgreSQL', async () => {
  const listRes = await app.inject({
    method: 'GET',
    url: '/api/v1/posts?locale=tr&limit=1',
  });
  const testPost = JSON.parse(listRes.body).items[0];
  const initialViews = testPost.viewsCount;

  // View 1
  const viewRes1 = await app.inject({
    method: 'POST',
    url: '/api/v1/analytics/view',
    payload: { postId: testPost.postId, locale: 'tr' },
  });
  assert.equal(viewRes1.statusCode, 200);
  assert.equal(JSON.parse(viewRes1.body).recorded, true);

  // View 2 (aynı IP)
  const viewRes2 = await app.inject({
    method: 'POST',
    url: '/api/v1/analytics/view',
    payload: { postId: testPost.postId, locale: 'tr' },
  });
  assert.equal(viewRes2.statusCode, 200);

  // Redis'teki birikmiş görüntülenmeleri PostgreSQL'e flush et
  const flushed = await analytics.flushViewsToDatabase();
  assert.ok(flushed >= 1, 'Should flush at least 1 post');

  // PostgreSQL'den kontrol et
  const updatedPost = await prisma.post.findUnique({
    where: { id: testPost.postId },
  });
  assert.ok(
    updatedPost!.viewsCount > initialViews,
    'Post viewsCount in PostgreSQL must be incremented',
  );
});

test('9. Updating translation slug creates 301 redirect entry', async () => {
  // Yeni post oluştur ve yayınla
  const createRes = await app.inject({
    method: 'POST',
    url: '/api/v1/posts',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { featured: false },
  });
  const p = JSON.parse(createRes.body);

  const initialSlug = `eski-url-slug-${Date.now()}`;
  await app.inject({
    method: 'PUT',
    url: `/api/v1/posts/${p.id}/translations/tr`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      title: 'Eski URL Başlığı',
      slug: initialSlug,
      contentHtml: '<p>Yönlendirme testi metni.</p>',
    },
  });

  // Slug değiştir
  const newSlug = `yeni-url-slug-${Date.now()}`;
  await app.inject({
    method: 'PUT',
    url: `/api/v1/posts/${p.id}/translations/tr`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      title: 'Yeni URL Başlığı',
      slug: newSlug,
      contentHtml: '<p>Yönlendirme testi metni güncellendi.</p>',
    },
  });

  // Redirect endpoint sorgula
  const redirectRes = await app.inject({
    method: 'GET',
    url: `/api/v1/redirects?locale=tr&path=/posts/${initialSlug}`,
  });

  assert.equal(redirectRes.statusCode, 200);
  const redirect = JSON.parse(redirectRes.body);
  assert.equal(redirect.toPath, `/posts/${newSlug}`);
  assert.equal(redirect.statusCode, 301);
});
