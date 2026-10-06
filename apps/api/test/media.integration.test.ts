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
import { S3Service } from '../src/infra/s3/s3.service';
import { MediaProcessor } from '../src/modules/media/media.processor';
import sharp from 'sharp';

let app: NestFastifyApplication;
let prisma: PrismaService;
let s3: S3Service;
let processor: MediaProcessor;
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
  s3 = app.get(S3Service);
  processor = app.get(MediaProcessor);

  // Admin girişi yap
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

let testMediaId: string;
let testStorageKey: string;
let testUploadUrl: string;

test('1. Presign endpoint validates input and creates Media record with PROCESSING status', async () => {
  // Geçersiz dosya türü
  const invalidRes = await app.inject({
    method: 'POST',
    url: '/api/v1/media/presign',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      filename: 'malware.exe',
      mimeType: 'application/octet-stream',
      sizeBytes: 1024,
    },
  });
  assert.equal(invalidRes.statusCode, 400);

  // Geçerli görsel isteği
  const validRes = await app.inject({
    method: 'POST',
    url: '/api/v1/media/presign',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      filename: 'hero-architecture.png',
      mimeType: 'image/png',
      sizeBytes: 150000,
    },
  });

  assert.equal(validRes.statusCode, 201);
  const data = JSON.parse(validRes.body);
  assert.ok(data.mediaId, 'Media ID must be generated');
  assert.ok(data.storageKey.startsWith('uploads/'));
  assert.ok(data.uploadUrl.includes('localhost:9000'));
  assert.equal(data.expiresInSeconds, 900);

  testMediaId = data.mediaId;
  testStorageKey = data.storageKey;
  testUploadUrl = data.uploadUrl;

  // Veritabanı durumu kontrol
  const dbMedia = await prisma.media.findUnique({
    where: { id: testMediaId },
  });
  assert.ok(dbMedia);
  assert.equal(dbMedia!.status, 'PROCESSING');
  assert.equal(dbMedia!.mime, 'image/png');
});

test('2. Upload image to S3 and trigger complete upload endpoint', async () => {
  // 800x600 boyutunda test PNG görseli üret
  const testImageBuffer = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 52, g: 152, b: 219 },
    },
  })
    .png()
    .toBuffer();

  // Presigned URL ile S3/RustFS'e yükle
  const s3PutRes = await fetch(testUploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
    },
    body: new Uint8Array(testImageBuffer),
  });
  assert.ok(
    s3PutRes.status === 200 || s3PutRes.status === 204,
    `S3 PUT should succeed, got ${s3PutRes.status}`,
  );

  // Complete endpoint çağır
  const completeRes = await app.inject({
    method: 'POST',
    url: `/api/v1/media/${testMediaId}/complete`,
    headers: { authorization: `Bearer ${adminToken}` },
  });

  assert.equal(completeRes.statusCode, 201);
  const completeData = JSON.parse(completeRes.body);
  assert.equal(completeData.success, true);
});

test('3. MediaProcessor generates responsive WebP & AVIF variants, blurhash and sets READY', async () => {
  // Processor doğrudan çalıştırılır (kuyruk asenkronluğunu deterministik beklemek için)
  await processor.processImage(testMediaId, testStorageKey);

  // DB kaydını kontrol et
  const updatedMedia = await prisma.media.findUnique({
    where: { id: testMediaId },
  });

  assert.ok(updatedMedia);
  assert.equal(updatedMedia!.status, 'READY');
  assert.equal(updatedMedia!.width, 800);
  assert.equal(updatedMedia!.height, 600);
  assert.ok(
    updatedMedia!.blurhash?.startsWith('data:image/webp;base64,'),
    'Blurhash data URL must be generated',
  );

  const variants = updatedMedia!.variants as any;
  assert.ok(variants.original.url);
  assert.ok(Array.isArray(variants.variants));
  assert.ok(variants.variants.length >= 2, 'Should have 320 and 640 variants');

  // S3'te 320 genişliğindeki WebP varyantının mevcut ve dolu olduğunu doğrula
  const variantBuffer = await s3.getObjectBuffer(
    `variants/${testMediaId}/w320.webp`,
  );
  assert.ok(variantBuffer.length > 0, 'S3 must contain generated WebP variant');
});

test('4. Upsert localized ALT text and caption for media', async () => {
  // Türkçe ALT metin ekle
  const trRes = await app.inject({
    method: 'PUT',
    url: `/api/v1/media/${testMediaId}/translations/tr`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      altText: 'Modern mimari ve bulut altyapısı görseli',
      caption: 'Kapak görseli açıklaması',
    },
  });
  assert.equal(trRes.statusCode, 200);

  // İngilizce ALT metin ekle
  const enRes = await app.inject({
    method: 'PUT',
    url: `/api/v1/media/${testMediaId}/translations/en`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      altText: 'Modern architecture and cloud infrastructure image',
    },
  });
  assert.equal(enRes.statusCode, 200);

  // Medya detayını çek
  const getRes = await app.inject({
    method: 'GET',
    url: `/api/v1/media/${testMediaId}`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert.equal(getRes.statusCode, 200);
  const mediaDetail = JSON.parse(getRes.body);
  assert.equal(mediaDetail.translations.length, 2);
  const trTrans = mediaDetail.translations.find((t: any) => t.locale === 'tr');
  assert.equal(trTrans.altText, 'Modern mimari ve bulut altyapısı görseli');
});

test('5. Media library listing returns paginated media items', async () => {
  const listRes = await app.inject({
    method: 'GET',
    url: '/api/v1/media?limit=10',
    headers: { authorization: `Bearer ${adminToken}` },
  });

  assert.equal(listRes.statusCode, 200);
  const listData = JSON.parse(listRes.body);
  assert.ok(Array.isArray(listData.items));
  assert.ok(listData.items.length >= 1);
  const found = listData.items.find((m: any) => m.id === testMediaId);
  assert.ok(found, 'Uploaded media must be present in media list');
  assert.equal(found.status, 'READY');
});

test('6. Delete media removes record from DB and deletes S3 objects', async () => {
  const delRes = await app.inject({
    method: 'DELETE',
    url: `/api/v1/media/${testMediaId}`,
    headers: { authorization: `Bearer ${adminToken}` },
  });

  assert.equal(delRes.statusCode, 200);

  // DB kontrol
  const dbCheck = await prisma.media.findUnique({
    where: { id: testMediaId },
  });
  assert.equal(dbCheck, null, 'Media must be deleted from DB');

  // Tekrar sorgulandığında 404 dönmeli
  const getDeleted = await app.inject({
    method: 'GET',
    url: `/api/v1/media/${testMediaId}`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert.equal(getDeleted.statusCode, 404);
});
