import { z } from 'zod';

export const RoleEnum = z.enum(['ADMIN', 'EDITOR']);
export type Role = z.infer<typeof RoleEnum>;

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Kullanıcı adı veya e-posta en az 3 karakter olmalıdır')
    .max(100),
  password: z
    .string()
    .min(6, 'Şifre en az 6 karakter olmalıdır')
    .max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const jwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  role: RoleEnum,
  displayName: z.string(),
  preferredUiLocale: z.string(),
});
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  role: RoleEnum,
  displayName: z.string(),
  avatarMediaId: z.string().nullable().optional(),
  socialLinks: z.record(z.string()).nullable().optional(),
  preferredUiLocale: z.string(),
  isActive: z.boolean(),
  lastLoginAt: z.date().nullable().optional(),
  createdAt: z.date(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const updateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  preferredUiLocale: z.string().length(2).optional(),
  socialLinks: z.record(z.string()).optional(),
  bio: z.string().max(1000).optional(),
});
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalıdır'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
