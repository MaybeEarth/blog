import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class LanguagesService {
  private readonly cacheKey = 'languages:all';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll() {
    const cached = await this.redis.get(this.cacheKey);
    if (cached) return cached;

    const languages = await this.prisma.language.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    await this.redis.set(this.cacheKey, languages, 3600); // 1 saat
    return languages;
  }

  async findByCode(code: string) {
    const language = await this.prisma.language.findUnique({
      where: { code },
    });
    if (!language) {
      throw new NotFoundException(`Dil bulunamadı: ${code}`);
    }
    return language;
  }
}
