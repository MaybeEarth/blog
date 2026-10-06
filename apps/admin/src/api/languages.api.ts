import { apiClient } from './client';

export interface LanguageDto {
  code: string;
  name: string;
  nativeName: string;
  direction: string;
  isDefault: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

export const languagesApi = {
  getAll: async (): Promise<LanguageDto[]> => {
    return apiClient<LanguageDto[]>('/languages');
  },
};
