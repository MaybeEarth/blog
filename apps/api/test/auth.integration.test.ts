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
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';

let app: NestFastifyApplication;
let prisma: PrismaService;

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

  // Test için Admin kullanıcısı hazırla
  const adminPasswordHash = await argon2.hash('Admin!12345');
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash: adminPasswordHash, role: Role.ADMIN },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      displayName: 'Sistem Yöneticisi',
      preferredUiLocale: 'tr',
    },
  });

  // Test için Editor kullanıcısı hazırla
  const editorPasswordHash = await argon2.hash('Editor!12345');
  await prisma.user.upsert({
    where: { email: 'editor_test@example.com' },
    update: { passwordHash: editorPasswordHash, role: Role.EDITOR },
    create: {
      username: 'editor_test',
      email: 'editor_test@example.com',
      passwordHash: editorPasswordHash,
      role: Role.EDITOR,
      displayName: 'Test Editörü',
      preferredUiLocale: 'tr',
    },
  });
});

after(async () => {
  if (app) {
    await app.close();
  }
});

test('1. Public health check endpoint returns 200', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/health',
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.status, 'ok');
  assert.ok(body.locales.includes('tr'));
});

test('2. Login with valid admin credentials returns accessToken and refreshToken cookie', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      identifier: 'admin@example.com',
      password: 'Admin!12345',
    },
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.ok(body.accessToken, 'Access token should be returned');
  assert.equal(body.user.email, 'admin@example.com');
  assert.equal(body.user.role, 'ADMIN');

  const cookies = response.cookies;
  const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
  assert.ok(refreshCookie, 'refreshToken cookie must be set');
  assert.ok(refreshCookie.httpOnly, 'Cookie must be HttpOnly');
});

test('3. Login with invalid password returns 401', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      identifier: 'admin@example.com',
      password: 'WrongPassword123',
    },
  });

  assert.equal(response.statusCode, 401);
  const body = JSON.parse(response.body);
  assert.equal(body.message, 'Geçersiz kullanıcı adı veya şifre');
});

test('4. Protected /auth/me rejects unauthenticated requests with 401', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
  });

  assert.equal(response.statusCode, 401);
});

test('5. Protected /auth/me returns user profile with valid Bearer token', async () => {
  // Login first
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      identifier: 'admin@example.com',
      password: 'Admin!12345',
    },
  });
  const { accessToken } = JSON.parse(loginRes.body);

  const meRes = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  assert.equal(meRes.statusCode, 200);
  const user = JSON.parse(meRes.body);
  assert.equal(user.email, 'admin@example.com');
  assert.equal(user.role, 'ADMIN');
  assert.equal(user.passwordHash, undefined, 'passwordHash must never be exposed');
});

test('6. Refresh token rotation issues new access & refresh tokens', async () => {
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      identifier: 'admin@example.com',
      password: 'Admin!12345',
    },
  });

  const firstRefreshCookie = loginRes.cookies.find((c) => c.name === 'refreshToken')!;
  const firstRefreshToken = firstRefreshCookie.value;

  // Refresh call
  const refreshRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    cookies: {
      refreshToken: firstRefreshToken,
    },
  });

  assert.equal(refreshRes.statusCode, 200);
  const refreshBody = JSON.parse(refreshRes.body);
  assert.ok(refreshBody.accessToken);

  const secondRefreshCookie = refreshRes.cookies.find((c) => c.name === 'refreshToken')!;
  const secondRefreshToken = secondRefreshCookie.value;
  assert.notEqual(firstRefreshToken, secondRefreshToken, 'Refresh token must be rotated');

  // Verify second token works
  const refreshAgainRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    cookies: {
      refreshToken: secondRefreshToken,
    },
  });
  assert.equal(refreshAgainRes.statusCode, 200);
});

test('7. Refresh token reuse detection revokes entire token family', async () => {
  // Login
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      identifier: 'admin@example.com',
      password: 'Admin!12345',
    },
  });

  const stolenToken = loginRes.cookies.find((c) => c.name === 'refreshToken')!.value;

  // Legitimate user rotates the token
  const legitimateRefresh = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    cookies: { refreshToken: stolenToken },
  });
  assert.equal(legitimateRefresh.statusCode, 200);
  const legitimateToken = legitimateRefresh.cookies.find((c) => c.name === 'refreshToken')!.value;

  // Attacker tries to use the already-revoked stolenToken
  const attackerAttempt = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    cookies: { refreshToken: stolenToken },
  });
  assert.equal(attackerAttempt.statusCode, 401);
  assert.ok(
    JSON.parse(attackerAttempt.body).message.includes('Güvenlik ihlali'),
    'Reuse detection must trigger security alert',
  );

  // Even the legitimate token should now be revoked (entire family invalidated)
  const subsequentAttempt = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    cookies: { refreshToken: legitimateToken },
  });
  assert.equal(subsequentAttempt.statusCode, 401);
});

test('8. RBAC: Only ADMIN can access GET /api/v1/users; EDITOR receives 403 Forbidden', async () => {
  // Login as Admin
  const adminLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { identifier: 'admin@example.com', password: 'Admin!12345' },
  });
  const adminToken = JSON.parse(adminLogin.body).accessToken;

  // Admin access
  const adminAccess = await app.inject({
    method: 'GET',
    url: '/api/v1/users',
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminAccess.statusCode, 200);
  const usersList = JSON.parse(adminAccess.body);
  assert.ok(Array.isArray(usersList));
  assert.ok(usersList.length >= 2);

  // Login as Editor
  const editorLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { identifier: 'editor_test@example.com', password: 'Editor!12345' },
  });
  const editorToken = JSON.parse(editorLogin.body).accessToken;

  // Editor attempt to access /api/v1/users
  const editorAccess = await app.inject({
    method: 'GET',
    url: '/api/v1/users',
    headers: { authorization: `Bearer ${editorToken}` },
  });
  assert.equal(editorAccess.statusCode, 403);
  assert.ok(JSON.parse(editorAccess.body).message.includes('yetki'));
});

test('9. Logout revokes token and clears cookie', async () => {
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { identifier: 'admin@example.com', password: 'Admin!12345' },
  });
  const refreshCookie = loginRes.cookies.find((c) => c.name === 'refreshToken')!.value;

  const logoutRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/logout',
    cookies: { refreshToken: refreshCookie },
  });
  assert.equal(logoutRes.statusCode, 200);

  // Refresh with logged-out token should fail
  const refreshAfterLogout = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    cookies: { refreshToken: refreshCookie },
  });
  assert.equal(refreshAfterLogout.statusCode, 401);
});
