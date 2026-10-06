import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Mail, CheckCircle2, Clock, Users, Loader2 } from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  locale: string;
  confirmedAt: string | null;
  createdAt: string;
}

interface SubscribersResponse {
  total: number;
  items: Subscriber[];
}

export const SubscribersPage: React.FC = () => {
  const { data, isLoading, error } = useQuery<SubscribersResponse>({
    queryKey: ['subscribers'],
    queryFn: () => apiClient<SubscribersResponse>('/newsletter/subscribers'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-500" />
            <span>Bülten Aboneleri</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Web sitesinden bültene kaydolan e-posta aboneleri ve onay durumları.
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Users className="w-4 h-4" />
            <span>Toplam: {data.total} Abone</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-500">
            Aboneler yüklenirken bir hata oluştu.
          </div>
        ) : data?.items.length === 0 ? (
          <div className="py-20 text-center">
            <Mail className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Henüz abone bulunmuyor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Kullanıcılar bültenden kaydoldukça burada listelenecektir.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">E-posta</th>
                  <th className="px-6 py-3.5">Dil</th>
                  <th className="px-6 py-3.5">Durum</th>
                  <th className="px-6 py-3.5">Kayıt Tarihi</th>
                  <th className="px-6 py-3.5">Onay Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data?.items.map((sub) => {
                  const isConfirmed = Boolean(sub.confirmedAt);
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {sub.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {sub.locale}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Onaylandı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Onay Bekliyor
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(sub.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {sub.confirmedAt
                          ? new Date(sub.confirmedAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
