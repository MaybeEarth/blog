import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUiStore } from '../../stores/ui.store';

export const AdminLayout: React.FC = () => {
  const { sidebarOpen } = useUiStore();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans antialiased">
      <Sidebar />
      <Header />
      <main
        className={`pt-16 transition-all duration-300 min-h-screen ${
          sidebarOpen ? 'pl-64' : 'pl-20'
        }`}
      >
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
