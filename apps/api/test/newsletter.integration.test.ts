import test from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/prisma/prisma.service';

test('Newsletter Double Opt-In Module Integration Tests', async (t) => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let adminToken: string;
  const testEmail = `test-newsletter-${Date.now()}@example.com`;

  t.before(async () => {
    const adapter = new FastifyAdapter();
    app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
      logger: false,
    });

    await app.register(fastifyCookie as any);
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    // Login admin to test admin endpoint
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'admin@example.com',
        password: 'Admin!12345',
      },
    });
    const loginData = JSON.parse(loginRes.body);
    adminToken = loginData.accessToken;
  });

  t.after(async () => {
    // Cleanup
    await prisma.subscriber.deleteMany({
      where: { email: { contains: 'test-newsletter-' } },
    });
    await app.close();
  });

  await t.test('1. Subscribe with valid email creates pending subscriber', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/newsletter/subscribe',
      payload: {
        email: testEmail,
        locale: 'tr',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.status, 'pending_confirmation');

    // Verify in DB
    const sub = await prisma.subscriber.findUnique({
      where: { email: testEmail },
    });
    assert.ok(sub);
    assert.equal(sub.confirmedAt, null);
    assert.ok(sub.token);
  });

  await t.test('2. Subscribe again while pending updates token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/newsletter/subscribe',
      payload: {
        email: testEmail,
        locale: 'en',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.status, 'pending_confirmation');
  });

  await t.test('3. Confirm subscription activates subscriber', async () => {
    const sub = await prisma.subscriber.findUnique({ where: { email: testEmail } });
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/newsletter/confirm?token=${sub!.token}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.status, 'confirmed');

    // DB verify
    const updated = await prisma.subscriber.findUnique({ where: { email: testEmail } });
    assert.ok(updated!.confirmedAt);
    assert.equal(updated!.token, null);
  });

  await t.test('4. Subscribing when already confirmed returns already_subscribed', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/newsletter/subscribe',
      payload: {
        email: testEmail,
        locale: 'tr',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.status, 'already_subscribed');
  });

  await t.test('5. Admin can list subscribers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/newsletter/subscribers',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.total >= 1);
    assert.ok(Array.isArray(body.items));
  });

  await t.test('6. Unsubscribe removes subscriber', async () => {
    // Generate new unconfirmed subscriber or re-add
    const sub = await prisma.subscriber.create({
      data: {
        email: `to-unsub-${Date.now()}@example.com`,
        locale: 'tr',
        token: 'unsub-test-token-123',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/newsletter/unsubscribe?token=${sub.token}`,
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.status, 'unsubscribed');

    const check = await prisma.subscriber.findUnique({ where: { id: sub.id } });
    assert.equal(check, null);
  });
});
