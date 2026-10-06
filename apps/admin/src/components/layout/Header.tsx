import React from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { LogOut, Globe } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { activeLocale, setActiveLocale, sidebarOpen } = useUiStore();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/80 ${
        sidebarOpen ? 'left-64' : 'left-20'
      }`}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          İçerik Yönetim Sistemi
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Language selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
          <Globe className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
          <button
            onClick={() => setActiveLocale('tr')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeLocale === 'tr'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            TR
          </button>
          <button
            onClick={() => setActiveLocale('en')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeLocale === 'en'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            EN
          </button>
        </div>

        {/* User profile & logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-semibold text-xs">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {user?.displayName || user?.username}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {user?.role}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Çıkış Yap"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
