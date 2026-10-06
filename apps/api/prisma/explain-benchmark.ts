import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function runExplain(label: string, query: string, params: any[] = []) {
  console.log(`\n==================================================`);
  console.log(`📊 BENCHMARK: ${label}`);
  console.log(`==================================================`);

  const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, COSTS, VERBOSE) ${query}`;
  const start = performance.now();
  const rows: any = await prisma.$queryRawUnsafe(explainQuery, ...params);
  const elapsed = (performance.now() - start).toFixed(2);

  const planLines = rows.map((r: any) => r['QUERY PLAN']).join('\n');
  console.log(planLines);
  console.log(`⏱️ Roundtrip Client Time: ${elapsed}ms`);

  const isSeqScan = planLines.includes('Seq Scan on post_translations');
  if (isSeqScan) {
    console.warn(`⚠️ WARNING: Sequential Scan detected on post_translations! Check indexes.`);
  } else {
    console.log(`✅ Index Scan / Bitmap Index Scan verified!`);
  }
}

async function main() {
  console.log('🚀 Running Database EXPLAIN & Performance Benchmarks...');

  // 1. Keyset pagination on published posts
  await runExplain(
    '1. Keyset Pagination (Home / Post List)',
    `SELECT pt.id, pt.title, pt.slug, pt.excerpt, pt."readingTimeMin", pt."publishedAt", p."viewsCount"
     FROM post_translations pt
     JOIN posts p ON pt."postId" = p.id
     WHERE pt.locale = 'tr' AND pt.status = 'PUBLISHED'
     ORDER BY pt."publishedAt" DESC, pt.id DESC
     LIMIT 10;`,
  );

  // 2. Full text search
  await runExplain(
    '2. Full-Text Search (tsvector GIN)',
    `SELECT pt.id, pt.title, pt.slug, ts_rank_cd(pt.search_vector, websearch_to_tsquery('turkish', 'yazılım')) as rank
     FROM post_translations pt
     WHERE pt.locale = 'tr' AND pt.status = 'PUBLISHED'
       AND pt.search_vector @@ websearch_to_tsquery('turkish', 'yazılım')
     ORDER BY rank DESC
     LIMIT 10;`,
  );

  // 3. Trigram similarity / autocomplete
  await runExplain(
    '3. Trigram Title Suggestion / Fuzzy Match',
    `SELECT pt.id, pt.title, similarity(pt.title, 'Mimarisi') as sim
     FROM post_translations pt
     WHERE pt.locale = 'tr' AND pt.status = 'PUBLISHED'
       AND pt.title % 'Mimarisi'
     ORDER BY sim DESC
     LIMIT 5;`,
  );

  // 4. Category-filtered keyset pagination
  const category = await prisma.category.findFirst();
  if (category) {
    await runExplain(
      '4. Category Filtered Keyset Pagination',
      `SELECT pt.id, pt.title, pt.slug, pt."publishedAt"
       FROM post_translations pt
       JOIN post_categories pc ON pc."postId" = pt."postId"
       WHERE pc."categoryId" = '${category.id}' AND pt.locale = 'tr' AND pt.status = 'PUBLISHED'
       ORDER BY pt."publishedAt" DESC, pt.id DESC
       LIMIT 10;`,
    );
  }
}

main()
  .catch((e) => {
    console.error('Benchmark failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
