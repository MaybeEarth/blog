import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { postsApi } from '../api/posts.api';
import { languagesApi } from '../api/languages.api';
import { useUiStore } from '../stores/ui.store';
import {
  FileText,
  Eye,
  Globe,
  Plus,
  FolderTree,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const DashboardPage: React.FC = () => {
  const { activeLocale } = useUiStore();

  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ['posts', { locale: activeLocale, limit: 6 }],
    queryFn: () => postsApi.getPosts({ locale: activeLocale, limit: 6 }),
  });

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: () => languagesApi.getAll(),
  });

  const totalViews =
    postsData?.items.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Yönetim Paneli
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Blog içeriklerinizi, dilleri ve medya dosyalarını tek noktadan yönetin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/posts/new">
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
              Yeni Yazı Yaz
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Yazı Sayısı ({activeLocale.toUpperCase()})
            </span>
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {postsData?.items.length ?? 0}+
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Mevcut dildeki aktif içerikler
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Toplam Okunma
            </span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalViews.toLocaleString('tr-TR')}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Sayfa görüntülenmeleri
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Desteklenen Diller
            </span>
            <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {languages?.length ?? 2} Dil
          </div>
          <div className="mt-1 text-xs text-slate-400">
            TR, EN (Genişletilebilir)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hızlı İşlemler
            </span>
            <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Link to="/categories" className="flex-1">
              <Button variant="secondary" size="sm" className="w-full text-xs">
                Kategoriler
              </Button>
            </Link>
            <Link to="/media" className="flex-1">
              <Button variant="secondary" size="sm" className="w-full text-xs">
                Medyalar
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Posts Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Son Yayınlanan Yazılar ({activeLocale.toUpperCase()})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              En son güncellenen veya yayına alınan blog içerikleri
            </p>
          </div>
          <Link
            to="/posts"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <span>Tümünü Gör</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isPostsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : !postsData?.items || postsData.items.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
            Bu dilde henüz yayınlanmış yazı bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-medium">Başlık</th>
                  <th className="pb-3 font-medium">Kategori</th>
                  <th className="pb-3 font-medium">Okuma Süresi</th>
                  <th className="pb-3 font-medium">Görüntülenme</th>
                  <th className="pb-3 font-medium">Yayın Tarihi</th>
                  <th className="pb-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {postsData.items.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 pr-4 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      {post.title}
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-slate-400">
                      {post.categories[0]?.name || '-'}
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-slate-400">
                      {post.readingTimeMin} dk
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-slate-400">
                      {post.viewsCount.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-slate-400">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('tr-TR')
                        : '-'}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        to={`/posts/edit/${post.postId}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
