import React from 'react';
import { Globe, Share2 } from 'lucide-react';

export interface SeoPreviewProps {
  title: string;
  slug: string;
  description: string;
  locale: string;
  coverImageUrl?: string | null;
}

export const SeoPreview: React.FC<SeoPreviewProps> = ({
  title,
  slug,
  description,
  locale,
  coverImageUrl,
}) => {
  const displayTitle = title || 'Yazı Başlığı Buraya Gelecek';
  const displaySlug = slug || 'yazi-baglantisi-url';
  const displayDesc =
    description ||
    'Yazınızın arama motorlarında ve sosyal medyada nasıl görüneceğini buradan canlı olarak takip edebilirsiniz.';
  const previewUrl = `https://example.com/${locale}/posts/${displaySlug}`;

  const titleLength = displayTitle.length;
  const descLength = displayDesc.length;

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Canlı SEO ve Arama Motoru Önizlemesi (SERP)
        </h3>
      </div>

      {/* Google SERP Preview */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-sans dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            G
          </div>
          <div className="flex flex-col text-xs leading-tight">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              example.com
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">
              {previewUrl}
            </span>
          </div>
        </div>

        <h4 className="text-base font-medium text-[#1a0dab] hover:underline cursor-pointer dark:text-[#8ab4f8] truncate">
          {displayTitle} | Blog
        </h4>

        <p className="mt-1 text-xs text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 leading-relaxed">
          {displayDesc}
        </p>
      </div>

      {/* Character indicators */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="text-slate-500 dark:text-slate-400">Başlık Karakteri</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {titleLength} / 60
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                titleLength >= 40 && titleLength <= 60
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {titleLength >= 40 && titleLength <= 60 ? 'İdeal' : 'Geliştirilebilir'}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="text-slate-500 dark:text-slate-400">Açıklama Karakteri</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {descLength} / 160
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                descLength >= 120 && descLength <= 160
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {descLength >= 120 && descLength <= 160 ? 'İdeal' : 'Geliştirilebilir'}
            </span>
          </div>
        </div>
      </div>

      {/* Social / Open Graph Preview Card */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Share2 className="w-3.5 h-3.5 text-indigo-500" />
          <span>Sosyal Medya (Open Graph) Kartı</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          {coverImageUrl ? (
            <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <img
                src={coverImageUrl}
                alt="OG Preview"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-slate-100 dark:bg-slate-800 text-xs text-slate-400">
              Kapak görseli eklenmedi
            </div>
          )}
          <div className="p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              example.com
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {displayTitle}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
              {displayDesc}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
