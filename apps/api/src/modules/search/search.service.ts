import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { SearchQueryInput } from '@blog/shared';
import * as crypto from 'crypto';

export interface SearchResultItem {
  id: string;
  postId: string;
  locale: string;
  title: string;
  slug: string;
  excerpt: string | null;
  readingTimeMin: number;
  publishedAt: Date | string | null;
  rank: number;
  snippet: string;
}

export interface SuggestionItem {
  title: string;
  slug: string;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async search(input: SearchQueryInput) {
    const locale = input.locale || 'tr';
    const limit = Math.min(Math.max(input.limit || 10, 1), 30);
    const q = input.q.trim();

    const hash = crypto
      .createHash('md5')
      .update(`${locale}:${q}:${limit}`)
      .digest('hex');
    const cacheKey = `search:${locale}:${hash}`;

    const cached = await this.redis.get<SearchResultItem[]>(cacheKey);
    if (cached) return cached;

    // Dil konfigürasyonunu belirle
    const lang = await this.prisma.language.findUnique({
      where: { code: locale },
      select: { pgSearchConfig: true },
    });
    const config = lang?.pgSearchConfig || 'simple';

    const rawResults: any = await this.prisma.$queryRawUnsafe(
      `SELECT
        pt.id,
        pt."postId",
        pt.locale,
        pt.title,
        pt.slug,
        pt.excerpt,
        pt."readingTimeMin",
        pt."publishedAt",
        ts_rank_cd(pt.search_vector, websearch_to_tsquery($1::regconfig, $2)) AS rank,
        ts_headline($1::regconfig, pt."contentHtml", websearch_to_tsquery($1::regconfig, $2), 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15') AS snippet
      FROM post_translations pt
      JOIN posts p ON pt."postId" = p.id
      WHERE pt.locale = $3
        AND pt.status = 'PUBLISHED'
        AND p."deletedAt" IS NULL
        AND pt.search_vector @@ websearch_to_tsquery($1::regconfig, $2)
      ORDER BY rank DESC, pt."publishedAt" DESC
      LIMIT $4;`,
      config,
      q,
      locale,
      limit,
    );

    const formatted: SearchResultItem[] = rawResults.map((r: any) => ({
      id: r.id,
      postId: r.postId,
      locale: r.locale,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      readingTimeMin: r.readingTimeMin,
      publishedAt: r.publishedAt,
      rank: Number(r.rank),
      snippet: r.snippet,
    }));

    await this.redis.set(cacheKey, formatted, 60); // 60 saniye cache
    await this.redis.attachTag(`posts:${locale}`, cacheKey);

    return formatted;
  }

  async suggest(locale = 'tr', q: string): Promise<SuggestionItem[]> {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];

    const cacheKey = `suggest:${locale}:${term}`;
    const cached = await this.redis.get<SuggestionItem[]>(cacheKey);
    if (cached) return cached;

    const rawSuggestions: any = await this.prisma.$queryRawUnsafe(
      `SELECT
        title,
        slug
      FROM post_translations
      WHERE locale = $1
        AND status = 'PUBLISHED'
        AND (title ILIKE '%' || $2 || '%' OR title % $2)
      ORDER BY similarity(title, $2) DESC, title ASC
      LIMIT 5;`,
      locale,
      term,
    );

    const suggestions: SuggestionItem[] = rawSuggestions.map((r: any) => ({
      title: r.title,
      slug: r.slug,
    }));

    await this.redis.set(cacheKey, suggestions, 60);
    return suggestions;
  }
}
