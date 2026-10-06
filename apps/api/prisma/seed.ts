import { PrismaClient, Role, PostStatus, PageStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Languages
  const tr = await prisma.language.upsert({
    where: { code: 'tr' },
    update: { isDefault: true, isEnabled: true, pgSearchConfig: 'turkish' },
    create: {
      code: 'tr',
      name: 'Turkish',
      nativeName: 'Türkçe',
      direction: 'ltr',
      isDefault: true,
      isEnabled: true,
      sortOrder: 1,
      pgSearchConfig: 'turkish',
    },
  });

  const en = await prisma.language.upsert({
    where: { code: 'en' },
    update: { isDefault: false, isEnabled: true, pgSearchConfig: 'english' },
    create: {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      isDefault: false,
      isEnabled: true,
      sortOrder: 2,
      pgSearchConfig: 'english',
    },
  });

  console.log(`✅ Languages created: ${tr.code}, ${en.code}`);

  // 2. Admin User
  const passwordHash = await argon2.hash('Admin!12345');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash, role: Role.ADMIN },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash,
      role: Role.ADMIN,
      displayName: 'Sistem Yöneticisi',
      preferredUiLocale: 'tr',
      translations: {
        create: [
          { locale: 'tr', bio: 'Baş editör ve sistem yöneticisi.' },
          { locale: 'en', bio: 'Lead editor and system administrator.' },
        ],
      },
    },
  });

  console.log(`✅ Admin user ready: ${admin.email}`);

  // 3. Categories
  const categoryDefs = [
    {
      tr: { name: 'Yazılım', slug: 'yazilim', desc: 'Yazılım geliştirme ve mimari.' },
      en: { name: 'Software', slug: 'software', desc: 'Software engineering & architecture.' },
    },
    {
      tr: { name: 'Teknoloji', slug: 'teknoloji', desc: 'Güncel teknoloji trendleri.' },
      en: { name: 'Technology', slug: 'technology', desc: 'Latest technology trends.' },
    },
    {
      tr: { name: 'Performans', slug: 'performans', desc: 'Web ve sistem performansı.' },
      en: { name: 'Performance', slug: 'performance', desc: 'Web and system performance.' },
    },
    {
      tr: { name: 'Veritabanı', slug: 'veritabani', desc: 'SQL, NoSQL ve önbellek.' },
      en: { name: 'Databases', slug: 'databases', desc: 'SQL, NoSQL and caching.' },
    },
  ];

  const categories = [];
  for (const cat of categoryDefs) {
    const existing = await prisma.categoryTranslation.findFirst({
      where: { locale: 'tr', slug: cat.tr.slug },
      include: { category: true },
    });

    if (existing) {
      categories.push(existing.category);
    } else {
      const created = await prisma.category.create({
        data: {
          translations: {
            create: [
              { locale: 'tr', name: cat.tr.name, slug: cat.tr.slug, description: cat.tr.desc },
              { locale: 'en', name: cat.en.name, slug: cat.en.slug, description: cat.en.desc },
            ],
          },
        },
      });
      categories.push(created);
    }
  }

  console.log(`✅ Categories ready: ${categories.length}`);

  // 4. Tags
  const tagDefs = [
    { tr: { name: 'NestJS', slug: 'nestjs' }, en: { name: 'NestJS', slug: 'nestjs' } },
    { tr: { name: 'Next.js', slug: 'nextjs' }, en: { name: 'Next.js', slug: 'nextjs' } },
    { tr: { name: 'PostgreSQL', slug: 'postgresql' }, en: { name: 'PostgreSQL', slug: 'postgresql' } },
    { tr: { name: 'Redis', slug: 'redis' }, en: { name: 'Redis', slug: 'redis' } },
    { tr: { name: 'TypeScript', slug: 'typescript' }, en: { name: 'TypeScript', slug: 'typescript' } },
    { tr: { name: 'Docker', slug: 'docker' }, en: { name: 'Docker', slug: 'docker' } },
    { tr: { name: 'Optimizasyon', slug: 'optimizasyon' }, en: { name: 'Optimization', slug: 'optimization' } },
    { tr: { name: 'SEO', slug: 'seo' }, en: { name: 'SEO', slug: 'seo' } },
  ];

  const tags = [];
  for (const t of tagDefs) {
    const existing = await prisma.tagTranslation.findFirst({
      where: { locale: 'tr', slug: t.tr.slug },
      include: { tag: true },
    });

    if (existing) {
      tags.push(existing.tag);
    } else {
      const created = await prisma.tag.create({
        data: {
          translations: {
            create: [
              { locale: 'tr', name: t.tr.name, slug: t.tr.slug },
              { locale: 'en', name: t.en.name, slug: t.en.slug },
            ],
          },
        },
      });
      tags.push(created);
    }
  }

  console.log(`✅ Tags ready: ${tags.length}`);

  // 5. Posts: Check existing count
  const postCount = await prisma.post.count();
  const targetCount = parseInt(process.env.SEED_POSTS_PER_LOCALE || '1000', 10);

  if (postCount >= targetCount) {
    console.log(`ℹ️ Already has ${postCount} posts (target: ${targetCount}). Skipping bulk post creation.`);
  } else {
    const needed = targetCount - postCount;
    console.log(`🚀 Generating ${needed} multilingual posts in batches...`);

    const batchSize = 100;
    const now = Date.now();

    for (let i = 0; i < needed; i += batchSize) {
      const currentBatch = Math.min(batchSize, needed - i);
      const postCreations = [];

      for (let j = 0; j < currentBatch; j++) {
        const idx = postCount + i + j + 1;
        const pubDate = new Date(now - (needed - (i + j)) * 3600 * 1000);
        const cat = categories[idx % categories.length]!;
        const tag = tags[idx % tags.length]!;

        postCreations.push(
          prisma.post.create({
            data: {
              authorId: admin.id,
              status: PostStatus.PUBLISHED,
              viewsCount: Math.floor(Math.random() * 5000),
              publishedAt: pubDate,
              categories: { create: [{ categoryId: cat.id }] },
              tags: { create: [{ tagId: tag.id }] },
              translations: {
                create: [
                  {
                    locale: 'tr',
                    title: `Modern Web Mimarisi ve Ölçeklenebilirlik Rehberi #${idx}`,
                    slug: `modern-web-mimarisi-ve-olceklenebilirlik-rehberi-${idx}`,
                    excerpt: `Yüksek trafikli sistemlerde performans optimizasyonu ve mimari desenler #${idx}.`,
                    contentHtml: `<h2>Giriş</h2><p>Bu makale #${idx}, modern web uygulamalarında PostgreSQL, Redis ve NestJS kullanarak nasıl yüksek throughput elde edileceğini detaylandırmaktadır.</p><p>Önbellekleme stratejileri ve keyset sayfalama veri tabanı yükünü minimize eder.</p>`,
                    readingTimeMin: 4,
                    status: PostStatus.PUBLISHED,
                    publishedAt: pubDate,
                    metaTitle: `Modern Web Mimarisi #${idx} | Blog`,
                    metaDescription: `Ölçeklenebilir mimari ve yüksek performanslı backend teknikleri rehberi #${idx}.`,
                  },
                  {
                    locale: 'en',
                    title: `Modern Web Architecture & Scalability Guide #${idx}`,
                    slug: `modern-web-architecture-and-scalability-guide-${idx}`,
                    excerpt: `Performance optimization and architectural patterns in high-traffic systems #${idx}.`,
                    contentHtml: `<h2>Introduction</h2><p>This article #${idx} explains how to achieve high throughput using PostgreSQL, Redis, and NestJS in modern web applications.</p><p>Caching strategies and keyset pagination minimize database load.</p>`,
                    readingTimeMin: 4,
                    status: PostStatus.PUBLISHED,
                    publishedAt: pubDate,
                    metaTitle: `Modern Web Architecture #${idx} | Blog`,
                    metaDescription: `Guide to scalable architecture and high-performance backend techniques #${idx}.`,
                  },
                ],
              },
            },
          }),
        );
      }

      await prisma.$transaction(postCreations);
      process.stdout.write(`  Inserted ${i + currentBatch}/${needed} posts...\r`);
    }

    console.log(`\n✅ Successfully seeded ${needed} multilingual posts!`);
  }

  // 6. Institutional Pages (Hakkımızda, Gizlilik, İletişim)
  const existingPage = await prisma.page.findFirst();
  if (!existingPage) {
    console.log('📄 Seeding institutional pages...');
    await prisma.page.create({
      data: {
        status: PageStatus.PUBLISHED,
        translations: {
          create: [
            {
              locale: 'tr',
              title: 'Hakkımızda',
              slug: 'hakkimizda',
              contentHtml: '<h1>Hakkımızda</h1><p>TechBlog, yüksek performanslı, ölçeklenebilir ve bağımsız modern yazılım mimarileri üzerine teknik içerikler sunan özgür bir platformdur.</p><p>Sistemimiz tamamen öz-barındırma (self-hosted) prensipleriyle Vercel, AWS veya üçüncü parti SaaS kilitlenmelerinden bağımsız olarak çalışır.</p>',
              metaTitle: 'Hakkımızda | TechBlog',
              metaDescription: 'TechBlog hakkında bilgiler ve misyonumuz.',
            },
            {
              locale: 'en',
              title: 'About Us',
              slug: 'about',
              contentHtml: '<h1>About Us</h1><p>TechBlog is an independent, ultra-high-performance technical blog dedicated to modern software architecture, scalability, and engineering excellence.</p><p>Built strictly on self-hosted principles, free from SaaS vendor lock-in.</p>',
              metaTitle: 'About Us | TechBlog',
              metaDescription: 'Learn more about TechBlog and our engineering mission.',
            },
          ],
        },
      },
    });

    await prisma.page.create({
      data: {
        status: PageStatus.PUBLISHED,
        translations: {
          create: [
            {
              locale: 'tr',
              title: 'Gizlilik Politikası',
              slug: 'gizlilik-politikasi',
              contentHtml: '<h1>Gizlilik Politikası</h1><p>TechBlog olarak gizliliğinize büyük önem veriyoruz. Sitemizde üçüncü parti takipçiler veya izinsiz çerezler kullanılmaz.</p><p>Analitik verileri tamamen anonimleştirilmiş IP hash yöntemiyle kendi sunucumuzda saklanır.</p>',
              metaTitle: 'Gizlilik Politikası | TechBlog',
              metaDescription: 'Kişisel veri koruma ve gizlilik ilkelerimiz.',
            },
            {
              locale: 'en',
              title: 'Privacy Policy',
              slug: 'privacy-policy',
              contentHtml: '<h1>Privacy Policy</h1><p>At TechBlog, we value your privacy. We do not use third-party invasive trackers or unnecessary cookies.</p><p>All metrics are gathered anonymously and processed strictly on self-hosted infrastructure.</p>',
              metaTitle: 'Privacy Policy | TechBlog',
              metaDescription: 'Our commitment to data privacy and minimal tracking.',
            },
          ],
        },
      },
    });
    console.log('✅ Institutional pages seeded successfully!');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
