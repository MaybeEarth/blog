import { ImageResponse } from 'next/og';
import { webApi } from '../../../../lib/api';

export const runtime = 'edge';
export const alt = 'TechBlog Post Cover';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await webApi.getPostBySlug(locale, slug);

  const title = post?.title || 'TechBlog Article';
  const category = post?.categories[0]?.name || 'Teknoloji';
  const readingTime = post?.readingTimeMin ? `${post.readingTimeMin} dk okuma` : '5 dk okuma';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.05) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.05) 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top bar: Brand + Category */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '20px',
              }}
            >
              B
            </div>
            <span style={{ color: '#f4f4f5', fontSize: '24px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
              TechBlog
            </span>
          </div>

          <div
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#a1a1aa',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {category}
          </div>
        </div>

        {/* Middle: Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: title.length > 60 ? '48px' : '56px',
              fontWeight: '900',
              color: '#f4f4f5',
              lineHeight: 1.15,
              letterSpacing: '-1.5px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom bar: Reading time + URL */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '30px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717a', fontSize: '18px' }}>
            <span>{readingTime}</span>
            <span>•</span>
            <span>Modern Yazılım Mimarisi</span>
          </div>

          <div style={{ color: '#818cf8', fontSize: '18px', fontWeight: '600' }}>
            techblog.dev
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
