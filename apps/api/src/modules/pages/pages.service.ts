import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PageStatus } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { slugify } from '@blog/shared';

export interface UpsertPageTranslationDto {
  title: string;
  slug?: string;
  contentHtml: string;
  contentJson?: Record<string, unknown>;
  metaTitle?: string;
  metaDescription?: string;
}

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(locale: string, slug: string) {
    const translation = await this.prisma.pageTranslation.findFirst({
      where: {
        locale,
        slug,
        page: { status: PageStatus.PUBLISHED },
      },
      include: {
        page: true,
      },
    });

    if (!translation) {
      throw new NotFoundException(`Sayfa bulunamadı: ${locale}/${slug}`);
    }

    // Karşılıklı diller (hreflang alternatifleri)
    const alternates = await this.prisma.pageTranslation.findMany({
      where: {
        pageId: translation.pageId,
        locale: { not: locale },
      },
      select: {
        locale: true,
        slug: true,
        title: true,
      },
    });

    return {
      id: translation.pageId,
      locale: translation.locale,
      title: translation.title,
      slug: translation.slug,
      contentHtml: translation.contentHtml,
      contentJson: translation.contentJson,
      metaTitle: translation.metaTitle,
      metaDescription: translation.metaDescription,
      status: translation.page.status,
      createdAt: translation.page.createdAt,
      updatedAt: translation.page.updatedAt,
      alternates,
    };
  }

  async findAll(locale?: string) {
    if (locale) {
      return this.prisma.pageTranslation.findMany({
        where: {
          locale,
          page: { status: PageStatus.PUBLISHED },
        },
        select: {
          pageId: true,
          locale: true,
          title: true,
          slug: true,
        },
      });
    }

    return this.prisma.page.findMany({
      include: {
        translations: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPage(status: PageStatus = PageStatus.PUBLISHED) {
    return this.prisma.page.create({
      data: { status },
      include: { translations: true },
    });
  }

  async upsertTranslation(pageId: string, locale: string, data: UpsertPageTranslationDto) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      throw new NotFoundException(`Sayfa bulunamadı: ${pageId}`);
    }

    const cleanHtml = sanitizeHtml(data.contentHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'iframe']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
        iframe: ['src', 'width', 'height', 'allowfullscreen'],
      },
    });

    const finalSlug = data.slug || slugify(data.title);

    return this.prisma.pageTranslation.upsert({
      where: {
        pageId_locale: {
          pageId,
          locale,
        },
      },
      update: {
        title: data.title,
        slug: finalSlug,
        contentHtml: cleanHtml,
        contentJson: data.contentJson as any,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      },
      create: {
        pageId,
        locale,
        title: data.title,
        slug: finalSlug,
        contentHtml: cleanHtml,
        contentJson: data.contentJson as any,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      },
    });
  }

  async deletePage(id: string) {
    return this.prisma.page.delete({ where: { id } });
  }
}
