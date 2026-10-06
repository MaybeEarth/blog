import { apiClient } from './client';
import {
  RequestPresignedUrlInput,
  PresignedUploadResponse,
  MediaQueryInput,
  MediaItemDto,
  UpdateMediaTranslationInput,
} from '@blog/shared';

export interface PaginatedMediaResponse {
  items: MediaItemDto[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export const mediaApi = {
  getMedia: async (
    query: Partial<MediaQueryInput> = {},
  ): Promise<PaginatedMediaResponse> => {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.cursor) params.set('cursor', query.cursor);

    const qs = params.toString();
    return apiClient<PaginatedMediaResponse>(`/media${qs ? `?${qs}` : ''}`);
  },

  getById: async (id: string): Promise<MediaItemDto> => {
    return apiClient<MediaItemDto>(`/media/${id}`);
  },

  requestPresign: async (
    dto: RequestPresignedUrlInput,
  ): Promise<PresignedUploadResponse> => {
    return apiClient<PresignedUploadResponse>('/media/presign', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  uploadToS3: async (
    uploadUrl: string,
    file: File | Blob,
    mimeType: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during S3 upload'));
      xhr.send(file);
    });
  },

  completeUpload: async (id: string): Promise<{ success: boolean; status: string }> => {
    return apiClient<{ success: boolean; status: string }>(`/media/${id}/complete`, {
      method: 'POST',
    });
  },

  updateTranslation: async (
    id: string,
    locale: string,
    dto: UpdateMediaTranslationInput,
  ): Promise<any> => {
    return apiClient(`/media/${id}/translations/${locale}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/media/${id}`, {
      method: 'DELETE',
    });
  },
};
