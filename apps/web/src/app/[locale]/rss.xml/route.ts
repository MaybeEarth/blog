import { webApi } from '../../../lib/api';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const postsResponse = await webApi.getPosts(locale, { limit: 30 });
  const items = postsResponse?.items || [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const feedTitle = isTr ? 'TechBlog - En Son Yazılar' : 'TechBlog - Latest Articles';
  const feedDescription = isTr
    ? 'Yüksek performanslı, ölçeklenebilir ve bağımsız modern yazılım mimarileri.'
    : 'High performance, scalable, and independent modern software architectures.';

  const rssItemsXml = items
    .map((post) => {
      const postUrl = `${siteUrl}/${locale}/posts/${post.slug}`;
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : new Date().toUTCString();

      return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${post.excerpt || post.title}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author><![CDATA[${post.author.displayName}]]></author>
    </item>`;
    })
    .join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${feedTitle}</title>
    <link>${siteUrl}/${locale}</link>
    <description>${feedDescription}</description>
    <language>${locale}</language>
    <atom:link href="${siteUrl}/${locale}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
