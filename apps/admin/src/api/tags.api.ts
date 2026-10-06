import { apiClient } from './client';
import { TagDto, UpsertTagInput } from '@blog/shared';

export const tagsApi = {
  getAll: async (locale = 'tr'): Promise<TagDto[]> => {
    return apiClient<TagDto[]>(`/tags?locale=${locale}`);
  },

  create: async (dto: UpsertTagInput): Promise<{ id: string }> => {
    return apiClient<{ id: string }>('/tags', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/tags/${id}`, {
      method: 'DELETE',
    });
  },
};
