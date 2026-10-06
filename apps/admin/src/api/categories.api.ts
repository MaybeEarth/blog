import { apiClient } from './client';
import { CategoryDto } from '@blog/shared';

export const categoriesApi = {
  getAll: async (locale = 'tr'): Promise<CategoryDto[]> => {
    return apiClient<CategoryDto[]>(`/categories?locale=${locale}`);
  },

  create: async (dto: { parentId?: string; sortOrder?: number }): Promise<{ id: string }> => {
    return apiClient<{ id: string }>('/categories', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  upsertTranslation: async (
    categoryId: string,
    locale: string,
    dto: { name: string; slug?: string; description?: string },
  ): Promise<any> => {
    return apiClient(`/categories/${categoryId}/translations/${locale}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};
