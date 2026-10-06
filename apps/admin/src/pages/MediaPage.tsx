import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '../api/media.api';
import { type MediaItemDto } from '@blog/shared';
import { useUiStore } from '../stores/ui.store';
import { MediaUploader } from '../components/media/MediaUploader';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import {
  Upload,
  Copy,
  Trash2,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';

export const MediaPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeLocale } = useUiStore();

  const [selectedMedia, setSelectedMedia] = useState<MediaItemDto | null>(null);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['media', { limit: 50 }],
    queryFn: () => mediaApi.getMedia({ limit: 50 }),
  });

  const updateTranslationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMedia) return;
      await mediaApi.updateTranslation(selectedMedia.id, activeLocale, {
        altText,
        caption,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      alert('Medya bilgileri güncellendi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSelectedMedia(null);
    },
  });

  const handleSelectMedia = (item: MediaItemDto) => {
    setSelectedMedia(item);
    const trans = item.translations.find((t) => t.locale === activeLocale);
    setAltText(trans?.altText || '');
    setCaption(trans?.caption || '');
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu görseli ve tüm optimize varyantlarını silmek istediğinizden emin misiniz?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Medya Kütüphanesi
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            RustFS/S3 uyumlu depolamada saklanan optimize edilmiş görsel varlıkları
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Upload className="w-4 h-4" />}
          onClick={() => setIsUploadOpen(true)}
        >
          Yeni Görsel Yükle
        </Button>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : !data?.items || data.items.length === 0 ? (
          <div className="text-center py-16 text-sm text-slate-500 dark:text-slate-400">
            Kütüphanede görsel bulunamadı. "Yeni Görsel Yükle" düğmesi ile ekleyebilirsiniz.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectMedia(item)}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-800"
              >
                <img
                  src={item.url}
                  alt={item.storageKey}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />

                <div className="absolute top-2 left-2">
                  <Badge variant={item.status as any}>{item.status}</Badge>
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate text-xs font-semibold">
                    {item.storageKey.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {item.width}x{item.height} • {Math.round(item.sizeBytes / 1024)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Görsel Yükle"
        description="Doğrudan S3 presigned URL ile yüklenir ve otomatik olarak WebP/AVIF varyantlarına dönüştürülür."
      >
        <MediaUploader
          onSuccess={() => {
            setIsUploadOpen(false);
          }}
        />
      </Modal>

      {/* Detail / Edit Modal */}
      {selectedMedia && (
        <Modal
          isOpen={Boolean(selectedMedia)}
          onClose={() => setSelectedMedia(null)}
          title="Medya Detayları"
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => handleDelete(selectedMedia.id)}
              >
                Sil
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedMedia(null)}
                >
                  Kapat
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={updateTranslationMutation.isPending}
                  onClick={() => updateTranslationMutation.mutate()}
                >
                  Meta Bilgilerini Kaydet
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <img
                src={selectedMedia.url}
                alt="Selected"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={selectedMedia.url}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-300"
              />
              <Button
                variant="secondary"
                size="sm"
                icon={copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={() => handleCopyUrl(selectedMedia.url)}
              >
                {copiedUrl ? 'Kopyalandı' : 'Kopyala'}
              </Button>
              <a
                href={selectedMedia.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Çözünürlük:</span>
                <span className="ml-1 font-semibold text-slate-800 dark:text-slate-200">
                  {selectedMedia.width} x {selectedMedia.height} px
                </span>
              </div>
              <div>
                <span className="text-slate-400">Dosya Boyutu:</span>
                <span className="ml-1 font-semibold text-slate-800 dark:text-slate-200">
                  {Math.round(selectedMedia.sizeBytes / 1024)} KB
                </span>
              </div>
              <div>
                <span className="text-slate-400">Tür (MIME):</span>
                <span className="ml-1 font-semibold text-slate-800 dark:text-slate-200">
                  {selectedMedia.mime}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Durum:</span>
                <span className="ml-1 font-semibold text-slate-800 dark:text-slate-200">
                  {selectedMedia.status}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <Input
                label={`Alternatif Metin (ALT Metin - ${activeLocale.toUpperCase()})`}
                placeholder="Görme engelliler ve arama motorları için görsel açıklaması..."
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />

              <Input
                label={`Görsel Alt Yazısı (Caption - ${activeLocale.toUpperCase()})`}
                placeholder="Görselin altında görüntülenecek başlık..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
