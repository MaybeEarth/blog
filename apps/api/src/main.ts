import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: process.env.NODE_ENV === 'development',
    trustProxy: true,
    requestIdHeader: 'x-request-id',
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);

  const configService = app.get(ConfigService);
  const webOrigin = configService.get<string>('WEB_ORIGIN', 'http://localhost:3000');
  const adminOrigin = configService.get<string>('ADMIN_ORIGIN', 'http://localhost:5173');

  // Security Plugins
  await app.register(fastifyCookie as any);

  await app.register(fastifyHelmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'blob:', '*'],
        scriptSrc: [`'self'`],
      },
    },
  });

  await app.register(fastifyCors as any, {
    origin: [webOrigin, adminOrigin, 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global Route Prefix
  app.setGlobalPrefix('api/v1');

  const port = configService.get<number>('API_PORT', 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Blog API running at: http://localhost:${port}/api/v1`);
}

bootstrap();
