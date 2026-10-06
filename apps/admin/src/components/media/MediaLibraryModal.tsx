import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../common/Modal';
import { MediaUploader } from './MediaUploader';
import { mediaApi } from '../../api/media.api';
import { type MediaItemDto } from '@blog/shared';
import { Loader2, Check } from 'lucide-react';
import { Button } from '../common/Button';

export interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItemDto) => void;
  selectedMediaId?: string | null;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedMediaId,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
  const [currentSelected, setCurrentSelected] = useState<MediaItemDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['media', { limit: 40 }],
    queryFn: () => mediaApi.getMedia({ limit: 40 }),
    enabled: isOpen,
  });

  const handleConfirmSelect = () => {
    if (currentSelected) {
      onSelect(currentSelected);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Medya Kütüphanesi"
      description="Yazınız veya kapak için bir görsel seçin ya da yenisini yükleyin."
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {currentSelected ? (
              <span>
                Seçilen: {currentSelected.width}x{currentSelected.height}px (
                {Math.round(currentSelected.sizeBytes / 1024)} KB)
              </span>
            ) : (
              <span>Lütfen bir görsel seçin</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              disabled={!currentSelected}
              onClick={handleConfirmSelect}
            >
              Görseli Seç
            </Button>
          </div>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'browse'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Kütüphaneden Seç
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Yeni Yükle
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div className="py-4">
          <MediaUploader
            onSuccess={() => {
              setActiveTab('browse');
            }}
          />
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : !data?.items || data.items.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
          Henüz yüklenmiş bir medya bulunmuyor. Yeni yükle sekmesinden görsel yükleyebilirsiniz.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto p-1">
          {data.items.map((item) => {
            const isSelected =
              currentSelected?.id === item.id ||
              (!currentSelected && selectedMediaId === item.id);

            return (
              <div
                key={item.id}
                onClick={() => setCurrentSelected(item)}
                className={`group relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-slate-100 dark:bg-slate-800 ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-600/30'
                    : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <img
                  src={item.url}
                  alt={item.storageKey}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />

                {isSelected && (
                  <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate font-medium">
                    {item.width && item.height ? `${item.width}x${item.height}` : 'Görsel'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
