import { z } from 'zod';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const MediaStatusEnum = z.enum(['PROCESSING', 'READY', 'FAILED']);
export type MediaStatus = z.infer<typeof MediaStatusEnum>;

export const requestPresignedUrlSchema = z.object({
  filename: z
    .string()
    .min(1, 'Dosya adı boş olamaz')
    .max(255, 'Dosya adı çok uzun')
    .regex(/^[^<>:"/\\|?*]+$/, 'Dosya adı geçersiz karakterler içeriyor'),
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    errorMap: () => ({
      message: 'Desteklenmeyen dosya türü. Sadece JPEG, PNG, WebP ve AVIF kabul edilir.',
    }),
  }),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(
      MAX_IMAGE_SIZE_BYTES,
      `Dosya boyutu en fazla ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB olabilir`,
    ),
});
export type RequestPresignedUrlInput = z.infer<typeof requestPresignedUrlSchema>;

export const updateMediaTranslationSchema = z.object({
  altText: z.string().max(255).optional(),
  caption: z.string().max(500).optional(),
});
export type UpdateMediaTranslationInput = z.infer<typeof updateMediaTranslationSchema>;

export const mediaQuerySchema = z.object({
  status: MediaStatusEnum.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type MediaQueryInput = z.infer<typeof mediaQuerySchema>;

export interface MediaVariantInfo {
  width: number;
  webp: string;
  avif: string;
}

export interface MediaVariantsPayload {
  original: {
    key: string;
    url: string;
    width?: number;
    height?: number;
  };
  variants: MediaVariantInfo[];
}

export interface MediaTranslationDto {
  locale: string;
  altText: string | null;
  caption: string | null;
}

export interface MediaItemDto {
  id: string;
  uploaderId: string;
  storageKey: string;
  mime: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  variants: MediaVariantsPayload | null;
  status: MediaStatus;
  url: string;
  translations: MediaTranslationDto[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PresignedUploadResponse {
  mediaId: string;
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}
