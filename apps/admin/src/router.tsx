import React, { useEffect } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PostsPage } from './pages/PostsPage';
import { PostEditPage } from './pages/PostEditPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { TagsPage } from './pages/TagsPage';
import { MediaPage } from './pages/MediaPage';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-xs text-slate-400">Oturum doğrulanıyor...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'posts',
            element: <PostsPage />,
          },
          {
            path: 'posts/new',
            element: <PostEditPage />,
          },
          {
            path: 'posts/edit/:id',
            element: <PostEditPage />,
          },
          {
            path: 'categories',
            element: <CategoriesPage />,
          },
          {
            path: 'tags',
            element: <TagsPage />,
          },
          {
            path: 'media',
            element: <MediaPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
