import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories.api';
import { useUiStore } from '../stores/ui.store';
import { slugify } from '@blog/shared';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Plus, Trash2, FolderTree, Loader2 } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeLocale } = useUiStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', activeLocale],
    queryFn: () => categoriesApi.getAll(activeLocale),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Kategori oluştur
      const created = await categoriesApi.create({
        parentId: parentId || undefined,
      });

      // 2. Çeviri ekle
      await categoriesApi.upsertTranslation(created.id, activeLocale, {
        name,
        slug: slug || slugify(name),
        description: description || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsModalOpen(false);
      setName('');
      setSlug('');
      setDescription('');
      setParentId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleDelete = async (id: string, catName: string) => {
    if (confirm(`"${catName}" kategorisini silmek istediğinizden emin misiniz?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Kategori Yönetimi ({activeLocale.toUpperCase()})
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Blog yazılarınız için hiyerarşik ve çok dilli kategoriler
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Yeni Kategori Ekle
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="text-center py-16 text-sm text-slate-500 dark:text-slate-400">
            Henüz kategori bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="py-3 px-4 font-medium">Kategori Adı</th>
                  <th className="py-3 px-4 font-medium">Kalıcı Bağlantı (Slug)</th>
                  <th className="py-3 px-4 font-medium">Yazı Sayısı</th>
                  <th className="py-3 px-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-indigo-500" />
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                      /{cat.slug}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {cat.postCount} yazı
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
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

      {/* New Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Yeni Kategori Oluştur"
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
            label="Kategori Adı"
            placeholder="Backend ve Altyapı"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(slugify(e.target.value));
            }}
            required
          />

          <Input
            label="Kalıcı Bağlantı (Slug)"
            placeholder="backend-ve-altyapi"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Açıklama (İsteğe bağlı)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              placeholder="Kategori hakkında kısa bilgi..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
