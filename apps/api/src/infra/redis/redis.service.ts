import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public cacheClient!: Redis;
  public queueClient!: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const cacheUrl = this.configService.get<string>('REDIS_CACHE_URL', 'redis://localhost:6379');
    const queueUrl = this.configService.get<string>('REDIS_QUEUE_URL', 'redis://localhost:6380');

    this.cacheClient = new Redis(cacheUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    this.queueClient = new Redis(queueUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    this.cacheClient.on('error', (err) => this.logger.error('Redis Cache Client Error', err));
    this.queueClient.on('error', (err) => this.logger.error('Redis Queue Client Error', err));

    this.logger.log('Redis clients initialized successfully');
  }

  async onModuleDestroy() {
    await Promise.all([this.cacheClient?.quit(), this.queueClient?.quit()]);
  }

  // --- Cache Helpers ---

  async get<T = string>(key: string): Promise<T | null> {
    const data = await this.cacheClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      // TTL Jitter (+- 10%) to prevent cache stampede
      const jitter = Math.floor(ttlSeconds * 0.1 * (Math.random() * 2 - 1));
      const finalTtl = Math.max(1, ttlSeconds + jitter);
      await this.cacheClient.set(key, str, 'EX', finalTtl);
    } else {
      await this.cacheClient.set(key, str);
    }
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.cacheClient.unlink(...keys);
  }

  async incr(key: string): Promise<number> {
    return this.cacheClient.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.cacheClient.expire(key, seconds);
  }

  /**
   * Tag-based cache invalidation
   */
  async attachTag(tag: string, key: string): Promise<void> {
    await this.cacheClient.sadd(`tag:${tag}`, key);
  }

  async invalidateTag(tag: string): Promise<void> {
    const tagKey = `tag:${tag}`;
    const keys = await this.cacheClient.smembers(tagKey);
    if (keys.length > 0) {
      await this.cacheClient.unlink(...keys);
    }
    await this.cacheClient.unlink(tagKey);
  }
}
