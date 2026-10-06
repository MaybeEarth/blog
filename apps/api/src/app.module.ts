import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { validateEnv } from './config/env.config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LanguagesModule } from './modules/languages/languages.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { PostsModule } from './modules/posts/posts.module';
import { SearchModule } from './modules/search/search.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RedirectsModule } from './modules/redirects/redirects.module';
import { S3Module } from './infra/s3/s3.module';
import { MediaModule } from './modules/media/media.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { PagesModule } from './modules/pages/pages.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisModule,
    S3Module,
    AuthModule,
    UsersModule,
    LanguagesModule,
    TaxonomyModule,
    PostsModule,
    SearchModule,
    AnalyticsModule,
    RedirectsModule,
    MediaModule,
    NewsletterModule,
    PagesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
