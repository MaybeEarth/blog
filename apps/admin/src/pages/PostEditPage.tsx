import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../api/posts.api';
import { categoriesApi } from '../api/categories.api';
import { tagsApi } from '../api/tags.api';
import { languagesApi } from '../api/languages.api';
import { slugify } from '@blog/shared';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { SeoPreview } from '../components/posts/SeoPreview';
import { MediaLibraryModal } from '../components/media/MediaLibraryModal';
import { type MediaItemDto } from '@blog/shared';
import {
  Save,
  Globe,
  Image as ImageIcon,
  CheckCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

interface TranslationFormState {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  noindex: boolean;
  isPublished: boolean;
}

const defaultTranslationState: TranslationFormState = {
  title: '',
  slug: '',
  excerpt: '',
  contentHtml: '',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  noindex: false,
  isPublished: false,
};

export const PostEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('tr');
  const [postId, setPostId] = useState<string | null>(id || null);

  // Post meta
  const [featured, setFeatured] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [coverMedia, setCoverMedia] = useState<MediaItemDto | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Per-language translation state
  const [translations, setTranslations] = useState<Record<string, TranslationFormState>>({
    tr: { ...defaultTranslationState },
    en: { ...defaultTranslationState },
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<'editor' | 'preview'>('editor');

  // Load languages
  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: () => languagesApi.getAll(),
  });

  // Load categories and tags
  const { data: categories } = useQuery({
    queryKey: ['categories', activeTab],
    queryFn: () => categoriesApi.getAll(activeTab),
  });

  const { data: tags } = useQuery({
    queryKey: ['tags', activeTab],
    queryFn: () => tagsApi.getAll(activeTab),
  });

  // Current translation getter/setter
  const currentTrans: TranslationFormState =
    translations[activeTab] || { ...defaultTranslationState };

  const updateCurrentTrans = (fields: Partial<TranslationFormState>) => {
    setTranslations((prev) => {
      const existing = prev[activeTab] || { ...defaultTranslationState };
      return {
        ...prev,
        [activeTab]: {
          ...existing,
          ...fields,
        },
      };
    });
  };

  const handleTitleChange = (newTitle: string) => {
    updateCurrentTrans({
      title: newTitle,
      slug: slugify(newTitle),
      metaTitle: newTitle,
    });
  };

  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslateFromTr = async () => {
    const trData = translations['tr'];
    if (!trData?.title && !trData?.contentHtml) {
      alert('Lütfen önce Türkçe sekmesinde bir başlık veya içerik girin.');
      return;
    }
    setIsTranslating(true);
    try {
      const draft = await postsApi.translateDraft({
        title: trData.title || '',
        excerpt: trData.excerpt || undefined,
        contentHtml: trData.contentHtml || '',
        from: 'tr',
        to: 'en',
      });
      updateCurrentTrans({
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt,
        contentHtml: draft.contentHtml,
        metaTitle: draft.title,
      });
    } catch {
      alert('Taslak çeviri üretilirken hata oluştu.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Save translation mutation
  const saveMutation = useMutation({
    mutationFn: async ({ shouldPublish = false }: { shouldPublish?: boolean }) => {
      let currentPostId = postId;

      // 1. Yeni post ise önce ana post kaydını oluştur
      if (!currentPostId) {
        const created = await postsApi.createPost({
          featured,
          coverMediaId: coverMedia?.id,
          categoryIds: selectedCategoryIds,
          tagIds: selectedTagIds,
        });
        currentPostId = created.id;
        setPostId(created.id);
      }

      // 2. Mevcut dil çevirisini kaydet
      await postsApi.upsertTranslation(currentPostId, activeTab, {
        title: currentTrans.title,
        slug: currentTrans.slug || slugify(currentTrans.title),
        excerpt: currentTrans.excerpt || undefined,
        contentHtml: currentTrans.contentHtml,
        metaTitle: currentTrans.metaTitle || undefined,
        metaDescription: currentTrans.metaDescription || undefined,
        canonicalUrl: currentTrans.canonicalUrl || undefined,
        noindex: currentTrans.noindex,
      });

      // 3. Yayına alma isteniyorsa publish endpointini çağır
      if (shouldPublish) {
        await postsApi.publishTranslation(currentPostId, activeTab);
        updateCurrentTrans({ isPublished: true });
      }

      return currentPostId;
    },
    onSuccess: (savedId, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setStatusMessage(
        variables.shouldPublish
          ? `Tebrikler! (${activeTab.toUpperCase()}) çevirisi yayına alındı.`
          : `Taslak (${activeTab.toUpperCase()}) başarıyla kaydedildi.`,
      );
      setTimeout(() => setStatusMessage(null), 4000);
      if (!id && savedId) {
        navigate(`/posts/edit/${savedId}`, { replace: true });
      }
    },
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/posts')}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isEditing ? 'Yazıyı Düzenle' : 'Yeni Yazı Oluştur'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bağımsız çoklu dil desteği (i18n) ve SEO optimizasyonu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMessage && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mr-2">
              <CheckCircle className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
          )}

          <Button
            variant="secondary"
            icon={<Save className="w-4 h-4" />}
            isLoading={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ shouldPublish: false })}
          >
            Taslak Kaydet
          </Button>

          <Button
            variant="primary"
            icon={<Globe className="w-4 h-4" />}
            isLoading={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ shouldPublish: true })}
          >
            Yayına Al ({activeTab.toUpperCase()})
          </Button>
        </div>
      </div>

      {/* Language Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="text-xs font-semibold text-slate-400 mr-2">
          Düzenlenen Dil:
        </span>
        {(languages || [{ code: 'tr', nativeName: 'Türkçe' }, { code: 'en', nativeName: 'English' }]).map(
          (lang) => (
            <button
              key={lang.code}
              onClick={() => setActiveTab(lang.code)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === lang.code
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <span>{lang.nativeName}</span>
              <span className="text-[10px] uppercase opacity-70">({lang.code})</span>
            </button>
          ),
        )}

        {activeTab === 'en' && (
          <button
            type="button"
            onClick={handleTranslateFromTr}
            disabled={isTranslating}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isTranslating ? 'Çevriliyor...' : 'TR\'den Çeviri Taslağı Üret (AI)'}</span>
          </button>
        )}
      </div>

      {/* Main Grid: Left Editor & Right Sidebar/SEO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Editor & Content) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-4">
            <Input
              label={`Yazı Başlığı (${activeTab.toUpperCase()})`}
              placeholder="Modern Web Mimarisi ve Ölçeklenebilirlik..."
              value={currentTrans.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
            />

            {/* Slug input */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Kalıcı Bağlantı (URL Slug)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  /{activeTab}/posts/
                </span>
                <input
                  type="text"
                  value={currentTrans.slug}
                  onChange={(e) => updateCurrentTrans({ slug: e.target.value })}
                  placeholder="modern-web-mimarisi"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentTrans({ slug: slugify(currentTrans.title) })
                  }
                  title="Başlıktan otomatik üret"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Özet (Excerpt)
              </label>
              <textarea
                rows={2}
                value={currentTrans.excerpt}
                onChange={(e) => updateCurrentTrans({ excerpt: e.target.value })}
                placeholder="Yazının kısa bir özeti..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Content Editor */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                İçerik (HTML / Markdown)
              </label>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActivePreview('editor')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activePreview === 'editor'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Editör
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreview('preview')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activePreview === 'preview'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Canlı Önizleme
                </button>
              </div>
            </div>

            {activePreview === 'editor' ? (
              <textarea
                rows={16}
                value={currentTrans.contentHtml}
                onChange={(e) => updateCurrentTrans({ contentHtml: e.target.value })}
                placeholder="<h2>Giriş</h2><p>İçeriğinizi buraya yazın...</p>"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-4 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <div
                className="prose dark:prose-invert max-w-none min-h-[300px] p-4 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-sm"
                dangerouslySetInnerHTML={{
                  __html: currentTrans.contentHtml || '<p class="text-slate-400">Henüz içerik girilmedi.</p>',
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Taxonomy, Media & SEO */}
        <div className="space-y-6">
          {/* Post Settings Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Yazı Ayarları
            </h3>

            {/* Featured toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Öne Çıkarılan Yazı
              </span>
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {/* Cover Image Picker */}
            <div>
              <span className="block text-xs text-slate-700 dark:text-slate-300 font-medium mb-2">
                Kapak Görseli
              </span>
              {coverMedia ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-2">
                  <img
                    src={coverMedia.url}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverMedia(null)}
                    className="absolute top-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white hover:bg-black/80"
                  >
                    Kaldır
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-xs text-slate-500 hover:border-indigo-400 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Kapak Görseli Seç</span>
                </button>
              )}
            </div>

            {/* Categories Multi-Select */}
            <div>
              <span className="block text-xs text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                Kategoriler
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-xs">
                {categories?.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategoryIds((prev) => [...prev, cat.id]);
                        } else {
                          setSelectedCategoryIds((prev) =>
                            prev.filter((id) => id !== cat.id),
                          );
                        }
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags Multi-Select */}
            <div>
              <span className="block text-xs text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                Etiketler
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-xs">
                {tags?.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTagIds((prev) => [...prev, tag.id]);
                        } else {
                          setSelectedTagIds((prev) =>
                            prev.filter((id) => id !== tag.id),
                          );
                        }
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SEO Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Arama Motoru (SEO) Alanları
            </h3>

            <Input
              label="Meta Başlık (Meta Title)"
              placeholder="Varsayılan: Yazı Başlığı"
              value={currentTrans.metaTitle}
              onChange={(e) => updateCurrentTrans({ metaTitle: e.target.value })}
            />

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Meta Açıklama (Meta Description)
              </label>
              <textarea
                rows={3}
                value={currentTrans.metaDescription}
                onChange={(e) =>
                  updateCurrentTrans({ metaDescription: e.target.value })
                }
                placeholder="Google arama sonuçlarında çıkacak açıklama..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Arama motorlarından gizle (noindex)
              </span>
              <input
                type="checkbox"
                checked={currentTrans.noindex}
                onChange={(e) => updateCurrentTrans({ noindex: e.target.checked })}
                className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Live SEO Preview */}
          <SeoPreview
            title={currentTrans.metaTitle || currentTrans.title}
            slug={currentTrans.slug}
            description={currentTrans.metaDescription || currentTrans.excerpt}
            locale={activeTab}
            coverImageUrl={coverMedia?.url}
          />
        </div>
      </div>

      {/* Media Library Picker Modal */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        selectedMediaId={coverMedia?.id}
        onSelect={(media) => setCoverMedia(media)}
      />
    </div>
  );
};
