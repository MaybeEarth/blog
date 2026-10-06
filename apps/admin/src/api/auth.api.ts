import { apiClient } from './client';
import { LoginInput, UserProfile } from '@blog/shared';

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    displayName: string;
    preferredUiLocale: string;
  };
}

export const authApi = {
  login: async (credentials: LoginInput): Promise<LoginResponse> => {
    return apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  logout: async (): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },

  getMe: async (): Promise<UserProfile> => {
    return apiClient<UserProfile>('/auth/me');
  },
};
