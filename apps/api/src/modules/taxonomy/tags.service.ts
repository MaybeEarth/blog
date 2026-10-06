import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { UpsertTagInput, TagDto, slugify } from '@blog/shared';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(locale = 'tr'): Promise<TagDto[]> {
    const cacheKey = `tags:all:${locale}`;
    const cached = await this.redis.get<TagDto[]>(cacheKey);
    if (cached) return cached;

    const items = await this.prisma.tag.findMany({
      include: {
        translations: {
          where: { locale },
        },
      },
      orderBy: { postCount: 'desc' },
    });

    const result: TagDto[] = items
      .map((tag) => {
        const trans = tag.translations[0];
        if (!trans) return null;
        return {
          id: tag.id,
          postCount: tag.postCount,
          name: trans.name,
          slug: trans.slug,
        };
      })
      .filter((t): t is TagDto => t !== null);

    await this.redis.set(cacheKey, result, 3600);
    await this.redis.attachTag(`tags:${locale}`, cacheKey);

    return result;
  }

  async findPopular(locale = 'tr', limit = 10): Promise<TagDto[]> {
    const all = await this.findAll(locale);
    return all.slice(0, limit);
  }

  async findBySlug(locale: string, slug: string): Promise<TagDto> {
    const translation = await this.prisma.tagTranslation.findUnique({
      where: {
        locale_slug: { locale, slug },
      },
      include: { tag: true },
    });

    if (!translation) {
      throw new NotFoundException(`Etiket bulunamadı: ${slug} (${locale})`);
    }

    return {
      id: translation.tag.id,
      postCount: translation.tag.postCount,
      name: translation.name,
      slug: translation.slug,
    };
  }

  async create(dto: UpsertTagInput) {
    const tag = await this.prisma.tag.create({
      data: {
        translations: {
          create: dto.translations.map((t) => ({
            locale: t.locale,
            name: t.name,
            slug: t.slug || slugify(t.name),
          })),
        },
      },
      include: { translations: true },
    });

    for (const t of dto.translations) {
      await this.redis.invalidateTag(`tags:${t.locale}`);
    }

    return tag;
  }
}
