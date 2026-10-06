import { z } from 'zod';

/** Tek kaynak: API, web ve admin aynı locale tanımlarını kullanır. */
export interface LocaleDef {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  /** PostgreSQL text search config; desteklenmeyen diller için 'simple'. */
  pgSearchConfig: 'turkish' | 'english' | 'german' | 'simple';
}

export const LOCALES: readonly LocaleDef[] = [
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr', pgSearchConfig: 'turkish' },
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', pgSearchConfig: 'english' },
] as const;

export const DEFAULT_LOCALE = 'tr';

export const localeCodeSchema = z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/);

export const isSupportedLocale = (code: string): boolean => LOCALES.some((l) => l.code === code);

export const getLocale = (code: string): LocaleDef | undefined =>
  LOCALES.find((l) => l.code === code);
