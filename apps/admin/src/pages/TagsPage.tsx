import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi } from '../api/tags.api';
import { useUiStore } from '../stores/ui.store';
import { slugify } from '@blog/shared';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';

export const TagsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeLocale } = useUiStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags', activeLocale],
    queryFn: () => tagsApi.getAll(activeLocale),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await tagsApi.create({
        translations: [
          {
            locale: activeLocale,
            name,
            slug: slug || slugify(name),
          },
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setIsModalOpen(false);
      setName('');
      setSlug('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const handleDelete = async (id: string, tagName: string) => {
    if (confirm(`"${tagName}" etiketini silmek istediğinizden emin misiniz?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Etiket Yönetimi ({activeLocale.toUpperCase()})
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Blog yazılarınız için konu etiketleri
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Yeni Etiket Ekle
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : !tags || tags.length === 0 ? (
          <div className="text-center py-16 text-sm text-slate-500 dark:text-slate-400">
            Henüz etiket bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="py-3 px-4 font-medium">Etiket Adı</th>
                  <th className="py-3 px-4 font-medium">Kalıcı Bağlantı (Slug)</th>
                  <th className="py-3 px-4 font-medium">Yazı Sayısı</th>
                  <th className="py-3 px-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tags.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-indigo-500" />
                        <span>{t.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                      #{t.slug}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {t.postCount} yazı
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Tag Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Yeni Etiket Oluştur"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              isLoading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Kaydet
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Etiket Adı"
            placeholder="Next.js"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(slugify(e.target.value));
            }}
            required
          />

          <Input
            label="Kalıcı Bağlantı (Slug)"
            placeholder="nextjs"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
