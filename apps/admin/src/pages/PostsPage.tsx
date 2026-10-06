import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { postsApi } from '../api/posts.api';
import { useUiStore } from '../stores/ui.store';
import { Plus, Search, Trash2, Edit, Loader2 } from 'lucide-react';
import { Button } from '../components/common/Button';

export const PostsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeLocale } = useUiStore();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['posts', { locale: activeLocale, cursor, limit: 10 }],
    queryFn: () => postsApi.getPosts({ locale: activeLocale, cursor, limit: 10 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => postsApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const handleDelete = async (postId: string, title: string) => {
    if (confirm(`"${title}" başlıklı yazıyı silmek istediğinizden emin misiniz?`)) {
      await deleteMutation.mutateAsync(postId);
    }
  };

  const handleNextPage = () => {
    if (data?.nextCursor) {
      setCursorHistory((prev) => [...prev, cursor || '']);
      setCursor(data.nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory((prev) => prev.slice(0, -1));
      setCursor(prevCursor || undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Yazı Yönetimi ({activeLocale.toUpperCase()})
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Yayınlanan ve taslak durumundaki tüm blog yazılarınız
          </p>
        </div>

        <Link to="/posts/new">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
            Yeni Yazı Ekle
          </Button>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Yazı başlığına göre filtrele..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-100"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : !data?.items || data.items.length === 0 ? (
          <div className="text-center py-16 text-sm text-slate-500 dark:text-slate-400">
            Kayıtlı yazı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="py-3 px-4 font-medium">Başlık</th>
                  <th className="py-3 px-4 font-medium">Kategori</th>
                  <th className="py-3 px-4 font-medium">Okuma Süresi</th>
                  <th className="py-3 px-4 font-medium">Görüntülenme</th>
                  <th className="py-3 px-4 font-medium">Yayın Tarihi</th>
                  <th className="py-3 px-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items
                  .filter((p) =>
                    searchTerm
                      ? p.title.toLowerCase().includes(searchTerm.toLowerCase())
                      : true,
                  )
                  .map((post) => (
                    <tr
                      key={post.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-sm">
                        <div className="truncate font-semibold">{post.title}</div>
                        <div className="text-xs text-slate-400 font-normal truncate">
                          /{activeLocale}/posts/{post.slug}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {post.categories[0]?.name || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {post.readingTimeMin} dk
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {post.viewsCount.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString('tr-TR')
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/posts/edit/${post.postId}`}>
                            <button
                              title="Düzenle"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDelete(post.postId, post.title)}
                            title="Sil"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Keyset Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrevPage}
            disabled={cursorHistory.length === 0}
          >
            Önceki Sayfa
          </Button>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            Sayfa Navigasyonu (Keyset Index)
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleNextPage}
            disabled={!data?.hasNextPage}
          >
            Sonraki Sayfa
          </Button>
        </div>
      </div>
    </div>
  );
};
