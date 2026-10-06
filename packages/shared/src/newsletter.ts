import { z } from 'zod';

export const subscribeSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz').max(150),
  locale: z.string().min(2).max(5).default('tr'),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export interface SubscriberItem {
  id: string;
  email: string;
  locale: string;
  confirmedAt: Date | string | null;
  createdAt: Date | string;
}
