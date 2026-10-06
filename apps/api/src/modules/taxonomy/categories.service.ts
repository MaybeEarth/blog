import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { UpsertCategoryInput, CategoryDto, slugify } from '@blog/shared';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(locale = 'tr'): Promise<CategoryDto[]> {
    const cacheKey = `categories:all:${locale}`;
    const cached = await this.redis.get<CategoryDto[]>(cacheKey);
    if (cached) return cached;

    const items = await this.prisma.category.findMany({
      include: {
        translations: {
          where: { locale },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const result: CategoryDto[] = items
      .map((cat) => {
        const trans = cat.translations[0];
        if (!trans) return null;
        return {
          id: cat.id,
          parentId: cat.parentId,
          sortOrder: cat.sortOrder,
          postCount: cat.postCount,
          name: trans.name,
          slug: trans.slug,
          description: trans.description,
        };
      })
      .filter((c): c is CategoryDto => c !== null);

    await this.redis.set(cacheKey, result, 3600);
    await this.redis.attachTag(`categories:${locale}`, cacheKey);

    return result;
  }

  async findBySlug(locale: string, slug: string): Promise<CategoryDto> {
    const translation = await this.prisma.categoryTranslation.findUnique({
      where: {
        locale_slug: { locale, slug },
      },
      include: { category: true },
    });

    if (!translation) {
      throw new NotFoundException(`Kategori bulunamadı: ${slug} (${locale})`);
    }

    return {
      id: translation.category.id,
      parentId: translation.category.parentId,
      sortOrder: translation.category.sortOrder,
      postCount: translation.category.postCount,
      name: translation.name,
      slug: translation.slug,
      description: translation.description,
    };
  }

  async create(dto: UpsertCategoryInput) {
    const category = await this.prisma.category.create({
      data: {
        parentId: dto.parentId,
        sortOrder: dto.sortOrder,
        translations: {
          create: dto.translations.map((t) => ({
            locale: t.locale,
            name: t.name,
            slug: t.slug || slugify(t.name),
            description: t.description,
          })),
        },
      },
      include: { translations: true },
    });

    for (const t of dto.translations) {
      await this.redis.invalidateTag(`categories:${t.locale}`);
    }

    return category;
  }
}
