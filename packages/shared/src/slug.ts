const TR_MAP: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  ß: 'ss', ä: 'a', Ä: 'a',
};

/** Dil bağımsız SEO slug üretimi (Türkçe/Almanca karakterler transliterasyonla). */
export function slugify(input: string, maxLength = 80): string {
  const mapped = Array.from(input).map((ch) => TR_MAP[ch] ?? ch).join('');
  return mapped
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}
