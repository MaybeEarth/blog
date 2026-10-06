import { create } from 'zustand';
import { type UserProfile, type LoginInput } from '@blog/shared';
import { authApi } from '../api/auth.api';
import { configureApiClient } from '../api/client';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setToken: (token) => {
    set({ token, isAuthenticated: !!token });
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login(credentials);
      set({
        token: data.accessToken,
        isAuthenticated: true,
      });

      // Profil detayını çek
      const profile = await authApi.getMe();
      set({ user: profile, isLoading: false });
    } catch (error) {
      set({ isLoading: false, isAuthenticated: false, token: null, user: null });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // Cookie'deki refreshToken ile /auth/refresh denemesi
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        set({ token: data.accessToken, isAuthenticated: true });

        const profile = await authApi.getMe();
        set({ user: profile, isLoading: false });
      } else {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// Configure API client with auth store
configureApiClient({
  getToken: () => useAuthStore.getState().token,
  setToken: (token) => useAuthStore.getState().setToken(token),
  onUnauthorized: () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  },
});
