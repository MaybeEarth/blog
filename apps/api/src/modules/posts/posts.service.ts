import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import sanitizeHtml from 'sanitize-html';
import * as crypto from 'crypto';
import {
  PostQueryInput,
  CursorPaginatedResponse,
  PostListItem,
  PostDetailItem,
  CreatePostInput,
  UpsertTranslationInput,
  slugify,
} from '@blog/shared';
import { PostStatus, Prisma } from '@prisma/client';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Keyset (Cursor) Sayfalama ile yüksek performanslı yazı listesi
   */
  async findList(query: PostQueryInput): Promise<CursorPaginatedResponse<PostListItem>> {
    const locale = query.locale || 'tr';
    const limit = Math.min(Math.max(query.limit || 10, 1), 50);

    const queryHash = crypto
      .createHash('md5')
      .update(JSON.stringify(query))
      .digest('hex');
    const cacheKey = `posts:${locale}:list:${queryHash}`;

    const cached = await this.redis.get<CursorPaginatedResponse<PostListItem>>(cacheKey);
    if (cached) return cached;

    // Keyset imleci çözümle
    let cursorPublishedAt: Date | null = null;
    let cursorId: string | null = null;

    if (query.cursor) {
      try {
        const decoded = Buffer.from(query.cursor, 'base64url').toString('utf8');
        const [tsStr, id] = decoded.split('|');
        if (tsStr && id) {
          cursorPublishedAt = new Date(tsStr);
          cursorId = id;
        }
      } catch {
        // Geçersiz cursor durumunda ilk sayfadan devam et
      }
    }

    const postWhere: Prisma.PostWhereInput = {
      deletedAt: null,
    };

    if (query.category) {
      postWhere.categories = {
        some: {
          category: {
            translations: {
              some: { locale, slug: query.category },
            },
          },
        },
      };
    }

    if (query.tag) {
      postWhere.tags = {
        some: {
          tag: {
            translations: {
              some: { locale, slug: query.tag },
            },
          },
        },
      };
    }

    if (query.author) {
      postWhere.author = { username: query.author };
    }

    const where: Prisma.PostTranslationWhereInput = {
      locale,
      status: PostStatus.PUBLISHED,
      post: postWhere,
    };

    if (cursorPublishedAt && cursorId) {
      where.OR = [
        {
          publishedAt: { lt: cursorPublishedAt },
        },
        {
          publishedAt: cursorPublishedAt,
          id: { lt: cursorId },
        },
      ];
    }

    const items = await this.prisma.postTranslation.findMany({
      where,
      take: limit + 1,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        postId: true,
        locale: true,
        title: true,
        slug: true,
        excerpt: true,
        readingTimeMin: true,
        publishedAt: true,
        post: {
          select: {
            featured: true,
            viewsCount: true,
            coverMedia: {
              select: {
                id: true,
                storageKey: true,
                blurhash: true,
              },
            },
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
            categories: {
              select: {
                category: {
                  select: {
                    id: true,
                    translations: {
                      where: { locale },
                      select: { name: true, slug: true },
                    },
                  },
                },
              },
            },
            tags: {
              select: {
                tag: {
                  select: {
                    id: true,
                    translations: {
                      where: { locale },
                      select: { name: true, slug: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasNextPage = items.length > limit;
    const paginatedItems = hasNextPage ? items.slice(0, limit) : items;

    let nextCursor: string | null = null;
    if (hasNextPage && paginatedItems.length > 0) {
      const last = paginatedItems[paginatedItems.length - 1];
      if (last?.publishedAt) {
        nextCursor = Buffer.from(
          `${last.publishedAt.toISOString()}|${last.id}`,
        ).toString('base64url');
      }
    }

    const formatted: PostListItem[] = paginatedItems.map((item) => ({
      id: item.id,
      postId: item.postId,
      locale: item.locale,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      readingTimeMin: item.readingTimeMin,
      publishedAt: item.publishedAt,
      viewsCount: item.post.viewsCount,
      featured: item.post.featured,
      coverMedia: item.post.coverMedia,
      categories: item.post.categories.map((c) => ({
        id: c.category.id,
        name: c.category.translations[0]?.name || '',
        slug: c.category.translations[0]?.slug || '',
      })),
      tags: item.post.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.translations[0]?.name || '',
        slug: t.tag.translations[0]?.slug || '',
      })),
      author: item.post.author,
    }));

    const response: CursorPaginatedResponse<PostListItem> = {
      items: formatted,
      nextCursor,
      hasNextPage,
    };

    // 5 dakika önbellekleme
    await this.redis.set(cacheKey, response, 300);
    await this.redis.attachTag(`posts:${locale}`, cacheKey);
    await this.redis.attachTag('posts:list', cacheKey);

    return response;
  }

  /**
   * Yazı Detay Görünümü + Çok dilli Alternates (hreflang)
   */
  async findBySlug(locale: string, slug: string): Promise<PostDetailItem> {
    const cacheKey = `post:${locale}:${slug}`;
    const cached = await this.redis.get<PostDetailItem | 'NOT_FOUND'>(cacheKey);

    if (cached === 'NOT_FOUND') {
      throw new NotFoundException(`Yazı bulunamadı: ${slug} (${locale})`);
    }
    if (cached) return cached;

    const translation = await this.prisma.postTranslation.findFirst({
      where: {
        locale,
        slug,
        status: PostStatus.PUBLISHED,
        post: { deletedAt: null },
      },
      include: {
        post: {
          include: {
            coverMedia: true,
            author: {
              select: { id: true, username: true, displayName: true },
            },
            categories: {
              include: {
                category: {
                  include: { translations: { where: { locale } } },
                },
              },
            },
            tags: {
              include: {
                tag: {
                  include: { translations: { where: { locale } } },
                },
              },
            },
            translations: {
              where: {
                status: PostStatus.PUBLISHED,
                locale: { not: locale },
              },
              select: { locale: true, slug: true, title: true },
            },
          },
        },
      },
    });

    if (!translation) {
      // Negatif Cache: 30 saniye boyunca veritabanına sorgu atılmasını önle
      await this.redis.set(cacheKey, 'NOT_FOUND', 30);
      throw new NotFoundException(`Yazı bulunamadı: ${slug} (${locale})`);
    }

    const result: PostDetailItem = {
      id: translation.id,
      postId: translation.postId,
      locale: translation.locale,
      title: translation.title,
      slug: translation.slug,
      excerpt: translation.excerpt,
      contentHtml: translation.contentHtml,
      contentJson: translation.contentJson as Record<string, unknown> | null,
      readingTimeMin: translation.readingTimeMin,
      publishedAt: translation.publishedAt,
      viewsCount: translation.post.viewsCount,
      featured: translation.post.featured,
      metaTitle: translation.metaTitle,
      metaDescription: translation.metaDescription,
      canonicalUrl: translation.canonicalUrl,
      noindex: translation.noindex,
      coverMedia: translation.post.coverMedia
        ? {
            id: translation.post.coverMedia.id,
            storageKey: translation.post.coverMedia.storageKey,
            blurhash: translation.post.coverMedia.blurhash,
          }
        : null,
      categories: translation.post.categories.map((c) => ({
        id: c.category.id,
        name: c.category.translations[0]?.name || '',
        slug: c.category.translations[0]?.slug || '',
      })),
      tags: translation.post.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.translations[0]?.name || '',
        slug: t.tag.translations[0]?.slug || '',
      })),
      author: translation.post.author,
      alternates: translation.post.translations.map((alt) => ({
        locale: alt.locale,
        slug: alt.slug,
        title: alt.title,
      })),
    };

    // 1 saat önbellekleme
    await this.redis.set(cacheKey, result, 3600);
    await this.redis.attachTag(`post:${translation.postId}`, cacheKey);

    return result;
  }

  /**
   * İlgili Yazılar (aynı kategori/etiketteki en son yazılar)
   */
  async findRelated(locale: string, slug: string, limit = 4): Promise<PostListItem[]> {
    const post = await this.findBySlug(locale, slug);
    const categoryIds = post.categories.map((c) => c.id);

    const related = await this.findList({
      locale,
      limit,
      category: post.categories[0]?.slug,
    });

    return related.items.filter((item) => item.postId !== post.postId).slice(0, limit);
  }

  /**
   * Popüler Yazılar
   */
  async findPopular(locale = 'tr', limit = 10): Promise<PostListItem[]> {
    const cacheKey = `posts:${locale}:popular:${limit}`;
    const cached = await this.redis.get<PostListItem[]>(cacheKey);
    if (cached) return cached;

    const list = await this.findList({ locale, limit: 30 });
    const sorted = [...list.items].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, limit);

    await this.redis.set(cacheKey, sorted, 600);
    await this.redis.attachTag(`posts:${locale}`, cacheKey);

    return sorted;
  }

  // --- Admin İşlemleri ---

  async createPost(dto: CreatePostInput, authorId: string) {
    const post = await this.prisma.post.create({
      data: {
        authorId,
        featured: dto.featured,
        coverMediaId: dto.coverMediaId,
        categories: {
          create: dto.categoryIds.map((categoryId) => ({ categoryId })),
        },
        tags: {
          create: dto.tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        categories: true,
        tags: true,
      },
    });

    return post;
  }

  async upsertTranslation(
    postId: string,
    locale: string,
    dto: UpsertTranslationInput,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Yazı bulunamadı');

    const cleanHtml = this.sanitizePostHtml(dto.contentHtml);
    const wordCount = cleanHtml.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

    const finalSlug = dto.slug || slugify(dto.title);

    // Eski çeviri varsa ve slug değiştiyse 301 yönlendirmesi oluştur
    const existing = await this.prisma.postTranslation.findUnique({
      where: { postId_locale: { postId, locale } },
    });

    if (existing) {
      // Önceki versiyonu revizyon tablosuna arşivle
      await this.prisma.postRevision.create({
        data: {
          postTranslationId: existing.id,
          editorId: post.authorId,
          title: existing.title,
          contentJson: {
            html: existing.contentHtml,
            excerpt: existing.excerpt,
            json: existing.contentJson,
          } as Prisma.InputJsonValue,
        },
      });

      if (existing.slug !== finalSlug) {
        await this.prisma.redirect.upsert({
          where: { locale_fromPath: { locale, fromPath: `/posts/${existing.slug}` } },
          update: { toPath: `/posts/${finalSlug}`, statusCode: 301 },
          create: {
            locale,
            fromPath: `/posts/${existing.slug}`,
            toPath: `/posts/${finalSlug}`,
            statusCode: 301,
          },
        });
        await this.redis.del(`redirect:${locale}:/posts/${existing.slug}`);
      }
    }

    const translation = await this.prisma.postTranslation.upsert({
      where: { postId_locale: { postId, locale } },
      update: {
        title: dto.title,
        slug: finalSlug,
        excerpt: dto.excerpt,
        contentHtml: cleanHtml,
        contentJson: (dto.contentJson as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        canonicalUrl: dto.canonicalUrl,
        noindex: dto.noindex,
        readingTimeMin,
      },
      create: {
        postId,
        locale,
        title: dto.title,
        slug: finalSlug,
        excerpt: dto.excerpt,
        contentHtml: cleanHtml,
        contentJson: (dto.contentJson as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        canonicalUrl: dto.canonicalUrl,
        noindex: dto.noindex,
        readingTimeMin,
      },
    });

    await this.invalidatePostCache(postId, locale);

    return translation;
  }

  async publishTranslation(postId: string, locale: string) {
    const translation = await this.prisma.postTranslation.findUnique({
      where: { postId_locale: { postId, locale } },
    });
    if (!translation) throw new NotFoundException('Çeviri bulunamadı');

    const now = new Date();

    const [updatedTrans] = await this.prisma.$transaction([
      this.prisma.postTranslation.update({
        where: { postId_locale: { postId, locale } },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: now,
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: now,
        },
      }),
    ]);

    await this.invalidatePostCache(postId, locale);

    return updatedTrans;
  }

  async deletePost(postId: string) {
    const post = await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    await this.redis.invalidateTag(`post:${postId}`);
    await this.redis.invalidateTag('posts:list');

    return { success: true };
  }

  private sanitizePostHtml(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
        'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br',
        'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img',
        'iframe', 'figure', 'figcaption',
      ],
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'width', 'height', 'loading'],
        iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
        code: ['class'],
        pre: ['class'],
      },
      allowedIframeHostnames: ['www.youtube.com', 'player.vimeo.com'],
    });
  }

  private async invalidatePostCache(postId: string, locale: string) {
    await this.redis.invalidateTag(`post:${postId}`);
    await this.redis.invalidateTag(`posts:${locale}`);
    await this.redis.invalidateTag('posts:list');
  }

  async getRevisions(postId: string, locale: string) {
    const translation = await this.prisma.postTranslation.findUnique({
      where: { postId_locale: { postId, locale } },
    });
    if (!translation) return [];

    return this.prisma.postRevision.findMany({
      where: { postTranslationId: translation.id },
      include: {
        editor: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async rollbackRevision(
    postId: string,
    locale: string,
    revisionId: string,
    editorId: string,
  ) {
    const translation = await this.prisma.postTranslation.findUnique({
      where: { postId_locale: { postId, locale } },
    });
    if (!translation) throw new NotFoundException('Çeviri bulunamadı');

    const revision = await this.prisma.postRevision.findUnique({
      where: { id: revisionId },
    });
    if (!revision || revision.postTranslationId !== translation.id) {
      throw new NotFoundException('Revizyon bulunamadı');
    }

    // Mevcut durumu da yeni bir revizyon olarak sakla
    await this.prisma.postRevision.create({
      data: {
        postTranslationId: translation.id,
        editorId,
        title: translation.title,
        contentJson: {
          html: translation.contentHtml,
          excerpt: translation.excerpt,
          json: translation.contentJson,
        } as Prisma.InputJsonValue,
      },
    });

    const revContent = revision.contentJson as { html?: string; excerpt?: string };
    const restoredHtml = revContent?.html || '';
    const wordCount = restoredHtml.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;

    await this.prisma.postTranslation.update({
      where: { id: translation.id },
      data: {
        title: revision.title,
        contentHtml: restoredHtml,
        excerpt: revContent?.excerpt ?? null,
        readingTimeMin: Math.max(1, Math.ceil(wordCount / 200)),
      },
    });

    await this.invalidatePostCache(postId, locale);
    return { success: true, message: 'Revizyon başarıyla geri yüklendi.' };
  }

  async translateDraft(data: {
    title: string;
    excerpt?: string;
    contentHtml: string;
    from: string;
    to: string;
  }) {
    const dictionary: Record<string, string> = {
      'Modern Web Mimarisi': 'Modern Web Architecture',
      'Ölçeklenebilirlik': 'Scalability',
      'Yüksek Performans': 'High Performance',
      'Önbellekleme': 'Caching',
      'Veritabanı': 'Database',
      'Mikroservisler': 'Microservices',
      'Giriş': 'Introduction',
      'Sonuç': 'Conclusion',
      'Rehberi': 'Guide',
      'Teknoloji': 'Technology',
      'Yazılım': 'Software',
      'Geliştirme': 'Development',
      'Güvenlik': 'Security',
      'Hakkımızda': 'About Us',
      'Gizlilik Politikası': 'Privacy Policy',
      'İletişim': 'Contact',
    };

    let translatedTitle = data.title;
    let translatedExcerpt = data.excerpt || '';
    let translatedContent = data.contentHtml;

    if (data.from === 'tr' && data.to === 'en') {
      for (const [tr, en] of Object.entries(dictionary)) {
        const regex = new RegExp(tr, 'gi');
        translatedTitle = translatedTitle.replace(regex, en);
        translatedExcerpt = translatedExcerpt.replace(regex, en);
        translatedContent = translatedContent.replace(regex, en);
      }
      translatedContent = translatedContent
        .replace(/<h2>Giriş<\/h2>/gi, '<h2>Introduction</h2>')
        .replace(/<h2>Sonuç<\/h2>/gi, '<h2>Conclusion</h2>');
    }

    const translatedSlug = slugify(translatedTitle);

    return {
      title: translatedTitle,
      slug: translatedSlug,
      excerpt: translatedExcerpt,
      contentHtml: translatedContent,
    };
  }

  /**
   * Post Reaksiyon ve Alkış Durumu
   */
  async getReactions(locale: string, slug: string, sessionId?: string) {
    const post = await this.findBySlug(locale, slug);
    const key = `post:reactions:${post.postId}`;
    const raw = await this.redis.cacheClient.hgetall(key);
    const counts = {
      CLAP: parseInt(raw?.CLAP || '0', 10),
      HEART: parseInt(raw?.HEART || '0', 10),
      ROCKET: parseInt(raw?.ROCKET || '0', 10),
      BULB: parseInt(raw?.BULB || '0', 10),
    };

    let userCounts: Record<string, number> = {};
    if (sessionId) {
      const sessionKey = `post:reactions:user:${post.postId}:${sessionId}`;
      const userRaw = await this.redis.cacheClient.hgetall(sessionKey);
      userCounts = {
        CLAP: parseInt(userRaw?.CLAP || '0', 10),
        HEART: parseInt(userRaw?.HEART || '0', 10),
        ROCKET: parseInt(userRaw?.ROCKET || '0', 10),
        BULB: parseInt(userRaw?.BULB || '0', 10),
      };
    }

    return { counts, userCounts };
  }

  /**
   * Reaksiyon / Alkış Ekleme
   */
  async addReaction(
    locale: string,
    slug: string,
    type: 'CLAP' | 'HEART' | 'ROCKET' | 'BULB',
    count = 1,
    sessionId?: string,
  ) {
    const post = await this.findBySlug(locale, slug);
    const validTypes = ['CLAP', 'HEART', 'ROCKET', 'BULB'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException('Geçersiz reaksiyon türü');
    }

    const safeCount = Math.min(Math.max(1, count), 10);
    if (sessionId) {
      const sessionKey = `post:reactions:user:${post.postId}:${sessionId}`;
      const current = parseInt((await this.redis.cacheClient.hget(sessionKey, type)) || '0', 10);
      const maxLimit = type === 'CLAP' ? 50 : 1;
      if (current >= maxLimit) {
        return this.getReactions(locale, slug, sessionId);
      }
      const allowedAdd = Math.min(safeCount, maxLimit - current);
      await this.redis.cacheClient.hincrby(sessionKey, type, allowedAdd);
      await this.redis.cacheClient.expire(sessionKey, 86400 * 30);
      await this.redis.cacheClient.hincrby(`post:reactions:${post.postId}`, type, allowedAdd);
    } else {
      await this.redis.cacheClient.hincrby(`post:reactions:${post.postId}`, type, safeCount);
    }

    return this.getReactions(locale, slug, sessionId);
  }
}
