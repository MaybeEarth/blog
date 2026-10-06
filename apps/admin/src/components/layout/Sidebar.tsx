import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Tags,
  Image,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useUiStore();

  const navigation = [
    { name: 'Panel', href: '/', icon: LayoutDashboard },
    { name: 'Yazılar', href: '/posts', icon: FileText },
    { name: 'Kategoriler', href: '/categories', icon: FolderTree },
    { name: 'Etiketler', href: '/tags', icon: Tags },
    { name: 'Medya Kütüphanesi', href: '/media', icon: Image },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md">
            B
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-white tracking-wide text-sm truncate">
              Blog Yönetim
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={sidebarOpen ? 'Kenar çubuğunu daralt' : 'Kenar çubuğunu genişlet'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="truncate">{item.name}</span>}
          </NavLink>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800">
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800/60 hover:text-indigo-400 transition-colors"
        >
          <Globe className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Siteyi Görüntüle</span>}
        </a>
      </div>
    </aside>
  );
};
