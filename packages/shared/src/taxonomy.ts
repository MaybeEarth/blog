import { z } from 'zod';

export const upsertCategorySchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().default(0),
  translations: z.array(
    z.object({
      locale: z.string().length(2),
      name: z.string().min(2).max(100),
      slug: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional(),
    }),
  ).min(1),
});
export type UpsertCategoryInput = z.infer<typeof upsertCategorySchema>;

export const upsertTagSchema = z.object({
  translations: z.array(
    z.object({
      locale: z.string().length(2),
      name: z.string().min(2).max(100),
      slug: z.string().min(2).max(100).optional(),
    }),
  ).min(1),
});
export type UpsertTagInput = z.infer<typeof upsertTagSchema>;

export interface CategoryDto {
  id: string;
  parentId: string | null;
  sortOrder: number;
  postCount: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface TagDto {
  id: string;
  postCount: number;
  name: string;
  slug: string;
}
