import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class RedirectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findRedirect(locale: string, path: string) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const cacheKey = `redirect:${locale}:${cleanPath}`;

    const cached = await this.redis.get<{ toPath: string; statusCode: number } | 'NONE'>(cacheKey);
    if (cached === 'NONE') return null;
    if (cached) return cached;

    const redirect = await this.prisma.redirect.findUnique({
      where: {
        locale_fromPath: {
          locale,
          fromPath: cleanPath,
        },
      },
      select: {
        toPath: true,
        statusCode: true,
      },
    });

    if (!redirect) {
      await this.redis.set(cacheKey, 'NONE', 60);
      return null;
    }

    await this.redis.set(cacheKey, redirect, 3600);
    return redirect;
  }
}
