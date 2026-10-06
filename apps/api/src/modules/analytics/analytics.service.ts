import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async trackView(postId: string, ip: string, userAgent = ''): Promise<{ recorded: boolean }> {
    // 1. Basit bot filtresi
    if (this.isBot(userAgent)) {
      return { recorded: false };
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 2. IP Tekilleştirme (24 saat geçerli anahtar)
    const seenKey = `view:seen:${postId}:${today}:${ip}`;
    const isUnique = await this.redis.cacheClient.set(seenKey, '1', 'EX', 86400, 'NX');

    // 3. Sayaçları artır
    const rawKey = `views:raw:${postId}:${today}`;
    const uniqueKey = `views:unique:${postId}:${today}`;

    await this.redis.cacheClient.incr(rawKey);
    if (isUnique) {
      await this.redis.cacheClient.incr(uniqueKey);
    }

    // Güncellenen postları kuyruk kümesine ekle
    await this.redis.cacheClient.sadd(`views:dirty:${today}`, postId);

    return { recorded: true };
  }

  /**
   * Redis'teki sayaçları topluca PostgreSQL'e yazar
   */
  async flushViewsToDatabase(dateStr?: string): Promise<number> {
    const today = dateStr || new Date().toISOString().slice(0, 10);
    const dirtyKey = `views:dirty:${today}`;

    const postIds = await this.redis.cacheClient.smembers(dirtyKey);
    if (postIds.length === 0) return 0;

    const dayDate = new Date(today);
    let flushedCount = 0;

    for (const postId of postIds) {
      const rawKey = `views:raw:${postId}:${today}`;
      const uniqueKey = `views:unique:${postId}:${today}`;

      // Değerleri al ve Redis'ten sil
      const rawCountStr = await this.redis.cacheClient.get(rawKey);
      const uniqueCountStr = await this.redis.cacheClient.get(uniqueKey);

      const rawCount = rawCountStr ? parseInt(rawCountStr, 10) : 0;
      const uniqueCount = uniqueCountStr ? parseInt(uniqueCountStr, 10) : 0;

      if (rawCount > 0) {
        // Atomic Post Update ve Günlük Agregasyon
        await this.prisma.$transaction([
          this.prisma.post.update({
            where: { id: postId },
            data: { viewsCount: { increment: rawCount } },
          }),
          this.prisma.postViewsDaily.upsert({
            where: {
              postId_day: {
                postId,
                day: dayDate,
              },
            },
            update: {
              views: { increment: rawCount },
              uniqueViews: { increment: uniqueCount },
            },
            create: {
              postId,
              day: dayDate,
              views: rawCount,
              uniqueViews: uniqueCount,
            },
          }),
        ]);

        await this.redis.cacheClient.del(rawKey, uniqueKey);
        flushedCount++;
      }
    }

    await this.redis.cacheClient.del(dirtyKey);
    this.logger.log(`Flushed view counts for ${flushedCount} posts into PostgreSQL`);

    return flushedCount;
  }

  private isBot(userAgent: string): boolean {
    const ua = userAgent.toLowerCase();
    return (
      ua.includes('bot') ||
      ua.includes('crawler') ||
      ua.includes('spider') ||
      ua.includes('crawling') ||
      ua.includes('curl') ||
      ua.includes('wget')
    );
  }
}
