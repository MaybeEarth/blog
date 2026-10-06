# Detaylı ve Performans Odaklı Uygulama Planı (Revize v2)

Kaynak: `kapsaml_blog_projesi_plan.md`.

**v2 değişiklikleri**
- ❌ **Yorum sistemi tamamen çıkarıldı** (tablo, endpoint, UI, spam koruması, moderasyon, Turnstile).
- 🌍 **Çok dilli (i18n) mimari** eklendi (içerik çevirisi + arayüz çevirisi + SEO).
- 🖥️ **Kendi sunucunda yayın (self-hosting)**: Cloudflare/S3 gibi dış servislere bağımlılık kaldırıldı; MinIO, Nginx cache, kendi yedekleme, kendi izleme.
- ⚙️ **Backend kararı verildi:** NestJS + Fastify + Prisma + PostgreSQL + Redis (gerekçe Bölüm 1.2).

---

## 0. Orijinal Plandaki Boşluklar ve Düzeltmeler

| # | Orijinal planda | Sorun | Çözüm |
|---|---|---|---|
| 1 | `next/head`, `fallback:'blocking'` | Pages Router terimleri | App Router: `generateMetadata`, `generateStaticParams`, `dynamicParams`, `revalidateTag` |
| 2 | ISR "60 sn" | Gereksiz yenileme, bayat içerik | On-demand revalidation + uzun güvenlik ağı (1 saat) |
| 3 | `views_count` doğrudan UPDATE | Row lock, WAL şişmesi | Redis `INCR` + toplu flush + günlük agregasyon |
| 4 | Offset sayfalama | Derinde yavaş | Keyset (cursor) pagination |
| 5 | Arama stratejisi yok | Backend arama belirsiz | `tsvector` + GIN + `pg_trgm`, dile göre config |
| 6 | Refresh token yönetimi | Çalınma/rotasyon yok | Hash'li saklama, rotation + reuse detection |
| 7 | Multer→Sharp→S3 | API'yi bloke eder | Presigned URL + BullMQ + Sharp worker |
| 8 | Zero-downtime belirsiz | `compose up` kesinti yapar | Nginx upstream + blue/green |
| 9 | Eksik tablolar | Revizyon, medya, çeviri, refresh token yok | Bölüm 2 |
| 10 | Çok dillilik yok | — | Bölüm 6 (i18n) |
| 11 | CDN yok | Origin yükü | Self-host: Nginx `proxy_cache` + immutable header; **opsiyonel** CDN |
| 12 | Performans hedefi yok | Ölçülemez | Bölüm 11 bütçeler + k6 + Lighthouse CI |
| 13 | Restore testi yok | Test edilmemiş yedek = yedek yok | Aylık otomatik restore |
| 14 | Self-hosting detayı yok | Tek sunucu riskleri | Bölüm 9 (sertleştirme, yedek, izleme) |

---

## AŞAMA 1 — Mimari ve Repo

### 1.1 Monorepo (pnpm workspaces + Turborepo)
```
blog/
├─ apps/
│  ├─ api/        # NestJS (Fastify adapter) + worker entry
│  ├─ web/        # Next.js App Router + next-intl
│  └─ admin/      # React + Vite + Tailwind + Zustand + react-i18next
├─ packages/
│  ├─ shared/     # Zod şemaları, tipler, locale sabitleri (tek kaynak)
│  └─ config/     # eslint, tsconfig, prettier
├─ infra/         # docker, nginx, scripts, k6, github workflows
└─ turbo.json
```
Zod şemaları ve locale listesi `packages/shared`'de; API, web ve admin aynısını kullanır.

### 1.2 Backend Kararı ve Gerekçesi

| Aday | Artı | Eksi | Karar |
|---|---|---|---|
| **NestJS + Fastify adapter** | Modüler yapı, DI, guard/pipe/interceptor hazır, BullMQ/Swagger/throttler entegrasyonu, **TypeScript ile front'la ortak Zod/tip**, Fastify ile Express'in ~2x throughput'u | Express'ten biraz daha fazla boilerplate | ✅ **SEÇİLDİ** |
| Express | Basit | Yapı disiplini yok, yavaş | ❌ |
| Fastify (çıplak) | Çok hızlı | Mimari kurallarını elle yazmak gerekir, büyüdükçe dağılır | ❌ |
| Go (Fiber/Gin) | Ham performans | Front ile tip paylaşımı yok, ekip/ekosistem ayrımı; blog trafiği DB/cache bound, dil darboğaz değil | ❌ |

> Blog iş yükü %95 okuma ve zaten Redis + statik sayfa ile servis edildiğinden darboğaz Node değil I/O'dur. NestJS+Fastify hedeflenen 500+ RPS okumayı tek 2 vCPU'da rahat taşır. Mimari katmanlı (Controller / Service / Repository) olduğundan ileride mikroservise ayırmak kolaydır.

- **ORM:** Prisma (tip güvenliği); `tsvector`, keyset, agregasyon için `$queryRaw`. **PgBouncer** (transaction mode).
- **Kuyruk:** BullMQ (Redis). **Loglama:** Pino (Winston'dan çok daha hızlı).
- **Runtime:** Node 22 LTS.

### 1.3 Backend Modül Yapısı
```
src/modules/ auth | users | posts | translations | categories | tags | media | search | analytics | seo | settings | health
  └─ <modül>.controller.ts / .service.ts / .repository.ts / dto/
src/common/ guards | interceptors (cache, logging, locale) | filters | pipes (zod) | decorators
src/infra/  prisma | redis | s3(minio) | queue | mailer
src/config/ (env zod doğrulama)
```
- Tutarlı hata formatı `{code, message, details, requestId}`; her istekte `requestId`.
- Versiyonlama: `/api/v1`. Locale: `Accept-Language` yerine açık `?locale=` parametresi (cache dostu).

---

## AŞAMA 2 — Veritabanı (PostgreSQL)

PK: **UUIDv7**. `timestamptz`. Soft delete: `deleted_at`.

### 2.1 Tablolar

**users**: `id, username (uniq), email (uniq, citext), password_hash (Argon2id), role (ADMIN|EDITOR), display_name, avatar_media_id, social_links jsonb, preferred_ui_locale, is_active, last_login_at, created_at, updated_at`
> Yorum kalktığı için halka açık kayıt yok; `USER` rolü kaldırıldı. Admin/editor davetle oluşturulur.

**user_translations**: `user_id, locale, bio` — PK `(user_id, locale)`.

**refresh_tokens**: `id, user_id, token_hash uniq, family_id, expires_at, revoked_at, replaced_by, user_agent, ip, created_at`.

**languages** *(yeni)*: `code (tr, en, de…) PK, name, native_name, direction (ltr|rtl), is_default, is_enabled, sort_order, pg_search_config ('turkish'|'english'|'german'|'simple')` — yeni dil eklemek = tek satır + UI json.

**posts** *(dilden bağımsız çekirdek)*: `id, author_id, cover_media_id, featured bool, status (DRAFT|PUBLISHED|ARCHIVED), views_count, published_at, scheduled_at, created_at, updated_at, deleted_at`

**post_translations** *(yeni, ana içerik burada)*: `id, post_id FK, locale FK, title, slug, excerpt, content_json jsonb (TipTap), content_html (sanitize + önceden render), reading_time_min, status (DRAFT|PUBLISHED), search_vector tsvector, meta_title, meta_description, og_media_id, canonical_url, noindex, published_at, created_at, updated_at`
- Unique: `(locale, slug)` ve `(post_id, locale)`.
- `content_html` yayın anında üretilir → okumada render maliyeti sıfır.
- Bir yazı farklı dillerde bağımsız yayınlanabilir; hreflang yalnızca PUBLISHED çeviriler için üretilir.

**post_revisions**: `id, post_translation_id, editor_id, title, content_json, created_at` (son 50 saklanır).

**categories**: `id, parent_id, sort_order, post_count`; **category_translations**: `category_id, locale, name, slug, description` (uniq `(locale, slug)`).
**tags**: `id, post_count`; **tag_translations**: `tag_id, locale, name, slug` (uniq `(locale, slug)`).
**post_categories**, **post_tags**: composite PK + ters index.

**media**: `id, uploader_id, storage_key, mime, size_bytes, width, height, blurhash, variants jsonb, status (PROCESSING|READY|FAILED), created_at`; **media_translations**: `media_id, locale, alt_text, caption` (erişilebilirlik için dile göre alt metin).

**pages** + **page_translations**: Hakkında / İletişim / Gizlilik gibi statik sayfalar (slug dile göre).

**redirects**: `locale, from_path, to_path, status_code` — slug değişince otomatik 301.

**post_views_daily**: `post_id, day, views, unique_views` PK `(post_id, day)`.

**site_settings** + **site_setting_translations**: site başlığı, açıklama, footer metni (dile göre).

**audit_logs**: `actor_id, action, entity, entity_id, diff jsonb, ip, created_at`.

**subscribers** (opsiyonel bülten): `email, locale, confirmed_at, token`.

### 2.2 İndeksler
```sql
CREATE UNIQUE INDEX pt_locale_slug_uq ON post_translations (locale, slug) WHERE status='PUBLISHED' OR status='DRAFT';
CREATE INDEX pt_list_idx ON post_translations (locale, published_at DESC, id DESC) WHERE status='PUBLISHED'; -- partial, keyset
CREATE INDEX pt_post_idx ON post_translations (post_id);
CREATE INDEX pt_search_gin ON post_translations USING GIN (search_vector);
CREATE INDEX pt_title_trgm ON post_translations USING GIN (title gin_trgm_ops);
CREATE INDEX posts_author_idx ON posts (author_id, published_at DESC);
CREATE INDEX ct_locale_slug ON category_translations (locale, slug);
CREATE INDEX post_tags_rev ON post_tags (tag_id, post_id);
```
- Tüm kritik sorgularda `EXPLAIN (ANALYZE, BUFFERS)`; Seq Scan kabul edilmez.
- `pg_stat_statements`, sıkılaştırılmış autovacuum.

### 2.3 Migration / Seed
- Prisma Migrate; prod'da **expand → migrate → contract** deseni.
- Seed: admin, diller (tr, en), örnek kategori/etiket, her dilde 1000+ sahte yazı (yük testi).

---

## AŞAMA 3 — Backend / API

### 3.1 Kimlik Doğrulama
- Access JWT 15 dk (`Authorization: Bearer`), Refresh 7–30 gün (`HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`).
- **Rotation + reuse detection** (çalıntı tespitinde tüm family iptal).
- **Argon2id**; login'de IP + hesap bazlı kademeli bekleme (5 başarısız denemede).
- RBAC: `@Roles()` guard, EDITOR yalnızca kendi yazılarını düzenler.
- Endpointler: `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `/auth/reset-password`, `POST /auth/accept-invite`. (`/auth/register` yok.)

### 3.2 Güvenlik
- Helmet, CORS whitelist, CSRF: `SameSite=Strict` + `Origin` kontrolü.
- **Rate limit (Redis, `@nestjs/throttler`):** genel 100/dk; login 5/dk; upload 10/dk; arama 30/dk; analytics beacon 60/dk.
- Body limit 1MB (JSON).
- `sanitize-html` allow-list (iframe yalnızca YouTube/Vimeo/privacy domain).
- CSP (nonce), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Env zod ile doğrulanır; gizliler Docker secrets / `600` izinli dosya.
- CI'da `npm audit`, Trivy, Dependabot/Renovate.

### 3.3 Endpoint Kataloğu
| Alan | Endpoint |
|---|---|
| Posts (public) | `GET /posts?locale=&cursor=&limit=&category=&tag=&author=` · `GET /posts/:locale/:slug` (yanıtta `alternates: [{locale, slug}]`) · `GET /posts/:locale/:slug/related` · `GET /posts/popular?locale=` |
| Posts (admin) | `POST /posts` · `PATCH /posts/:id` · `DELETE /posts/:id` · `PUT /posts/:id/translations/:locale` · `POST /posts/:id/translations/:locale/publish` · `…/schedule` · `…/autosave` · `GET …/revisions` |
| Taksonomi | CRUD `/categories`, `/tags` (+ `/translations/:locale`) |
| Diller | `GET /languages` · admin: CRUD `/languages` |
| Arama | `GET /search?locale=&q=&cursor=` · `GET /search/suggest?locale=&q=` |
| Medya | `POST /media/presign` · `POST /media/:id/complete` · `GET /media` · `DELETE /media/:id` |
| Analytics | `POST /analytics/view` · admin `GET /analytics/overview?range=` |
| SEO/Feed | `GET /feed/:locale/rss` · `GET /sitemap-data` · `GET /redirects` |
| Sistem | `GET /health/live` · `/health/ready` · `/metrics` (iç ağ) |

Liste yanıtları minimal (content_html yok). N+1 yok.

### 3.4 Keyset Pagination
```sql
SELECT ... FROM post_translations
WHERE locale=$1 AND status='PUBLISHED' AND (published_at, id) < ($ts, $id)
ORDER BY published_at DESC, id DESC LIMIT $limit+1;
```
Cursor: base64url(`published_at|id`).

### 3.5 Önbellekleme (Self-host için katmanlı)
1. **Nginx `proxy_cache`** (public GET API + sayfalar): `s-maxage`, `stale-while-revalidate`, `proxy_cache_use_stale updating`, cache lock. (Cloudflare bağımlılığı yok; ileride eklenirse uyumlu.)
2. **Redis cache-aside:** anahtarlar **locale içerir**: `posts:{locale}:list:{hash}`, `post:{locale}:{slug}`, `cats:{locale}`, `tags:popular:{locale}`, `search:{locale}:{hash}`.
3. **Tag-based invalidation:** `tag:post:{id}` seti; yayında ilgili tüm dil anahtarları `UNLINK` ile silinir (SCAN/KEYS yok).
4. **Stampede koruması:** `SET NX` kilidi + TTL jitter ±10%.
5. **Negatif cache:** olmayan slug için 30 sn.
6. Redis: `allkeys-lru`; **cache instance** ile **kuyruk/rate-limit instance'ı ayrı** (kuyruk için `appendonly yes`).
7. **Next.js ISR cache'i çoklu replica için paylaşımlı olmalı:** custom `cacheHandler` (Redis) → blue/green ve çok konteynerde tutarlı cache.
8. Yayın → API webhook → Next `revalidateTag('posts:{locale}')` + `revalidatePath` (ilgili tüm dillerin sayfaları ve `alternates`).

### 3.6 Görüntülenme Sayacı
`sendBeacon` → Redis `SETEX` ile IP+post+gün tekilleştirme → `INCR`; BullMQ 1 dk'lık iş toplu `UPDATE` + `post_views_daily` UPSERT. Bot UA filtresi. Sayfa statik kalır.

### 3.7 Arama (dil farkında)
- `languages.pg_search_config` ile dile özgü `to_tsvector(config, …)` (tr: `turkish`; desteklenmeyen diller için `simple` + `unaccent`).
- `websearch_to_tsquery`, `ts_rank_cd`, `ts_headline`.
- Autocomplete: `pg_trgm similarity`, Redis 60 sn.
- Yalnızca istenen dilde arar (diller karışmaz). Büyürse Meilisearch (çok dilli desteği iyi) — `SearchProvider` soyutlaması hazır.

### 3.8 Medya Pipeline
Presigned URL → **MinIO'ya doğrudan yükleme** → `complete` → BullMQ → Sharp worker: EXIF temizle, 320/640/1024/1600 varyantları, **AVIF + WebP**, blurhash, width/height. İçerik hash'li anahtar, `Cache-Control: public, max-age=31536000, immutable`. Magic-bytes MIME doğrulaması, SVG yasak/sanitize. Sahipsiz medya haftalık temizlik. Medya Nginx üzerinden (veya MinIO önünde `proxy_cache`) servis edilir.

### 3.9 Zamanlanmış İşler (BullMQ)
Planlı yayın (dakikalık), view flush, post_count güncelleme, revizyon/refresh token temizliği, sitemap/RSS cache ısıtma, yedekleme tetikleme, çeviri eksikliği raporu.

---

## AŞAMA 4 — Yönetim Paneli (Vite + React)

### 4.1 Altyapı
- React Router (rol bazlı korumalı rotalar), **TanStack Query** + Zustand (UI/auth), refresh interceptor (kuyruklanmış tek seferlik).
- Route bazlı code-splitting; ilk yük < 200KB gzip.
- RHF + `packages/shared` Zod; Shadcn UI.
- **Admin arayüz dili:** `react-i18next` (tr/en), kullanıcı tercihi `users.preferred_ui_locale`.

### 4.2 Sayfalar
Login · Dashboard · Yazılar (sanal liste, **dil sütunları/rozetleri**: ✅ yayında, 📝 taslak, ➖ çeviri yok) · Editör · Kategoriler/Etiketler (çeviri sekmeleri) · Medya · Sayfalar · Diller · Kullanıcılar · Ayarlar · Yönlendirmeler · Audit log.

### 4.3 Editör
- **Dil sekmeleri**: aynı ekranda tr/en/… arası geçiş; "varsayılan dilden kopyala", yan yana çeviri görünümü (kaynak | hedef).
- Çeviri durum göstergesi: kaynak dil güncellenince çeviri "güncel değil (stale)" işaretlenir.
- TipTap (kod bloğu, görsel, YouTube embed, tablo, slash komutları, RTL desteği).
- **Auto-save:** 30 sn + 3 sn debounce, sadece değişiklik varsa, `updated_at` ile çakışma tespiti, localStorage yedek, `beforeunload` uyarısı.
- Slug: dile göre otomatik üretim (Türkçe/Almanca/Arapça transliterasyon), benzersizlik canlı kontrol; slug değişince `redirects`.
- SEO önizleme (SERP + sosyal kart) dil başına; karakter sayaçları.
- Yayınla/zamanla/taslağa al; revizyon geri yükleme.

### 4.4 Dashboard
`post_views_daily` grafikleri (dil kırılımı), popüler yazılar, taslak sayısı, **çeviri eksikliği listesi**. Recharts lazy; Redis 5 dk cache.

---

## AŞAMA 5 — Frontend (Next.js App Router)

### 5.1 Rendering Stratejisi
| Rota | Strateji |
|---|---|
| `/[locale]` | Statik + on-demand revalidate; güvenlik ağı `revalidate=3600` |
| `/[locale]/[slug]` | `generateStaticParams` (her dil için en popüler ~100), `dynamicParams=true` |
| `/[locale]/kategori/[slug]`, `/etiket/[slug]`, `/yazar/[username]` | ISR + cursor sayfalama |
| `/[locale]/arama` | Client-side + API (`noindex`) |
| `/sitemap.xml`, `/[locale]/rss.xml`, `/robots.txt` | Route handler + cache |

Yorum yok → **tüm halka açık sayfalar tamamen statik/ISR**; dinamik tek parça görüntülenme beacon'ıdır.
Sitemap: App Router yerleşik `sitemap.ts` (`generateSitemaps` ile >50k URL bölme), alternates (hreflang) dahil.

### 5.2 Çoklu Dil Mimarisi (i18n)
- **Kütüphane:** `next-intl` (App Router uyumlu, Server Components'te sıfır istemci JS'i).
- **URL stratejisi:** alt dizin — `/tr/...` (varsayılan; istenirse prefix'siz), `/en/...`. Alt dizin tek domain'de SEO otoritesini toplar (alt alan adı/ccTLD'ye göre daha kolay yönetim).
- **Locale yönlendirme:** `middleware` yalnızca kök `/`'te: cookie → `Accept-Language` → varsayılan dil; **botlara yönlendirme yapılmaz**, 302 ve cookie ile hatırlanır. Kullanıcı seçimi her zaman önceliklidir.
- **Çeviri slug'ları farklı:** `/tr/yazi-adi` ↔ `/en/post-title`. API `alternates` döner; **dil değiştirici karşılık gelen çeviriye gider**, çeviri yoksa seçenek gösterilmez (veya dil ana sayfasına gider).
- **Arayüz metinleri:** `messages/{locale}.json` (namespace bazlı bölünmüş, sayfa başına sadece gerekli namespace yüklenir). Eksik anahtar CI'da fail (`i18n-check`).
- **Çok biçimlilik/Tarih/sayı:** ICU MessageFormat (çoğul kuralları), `Intl.DateTimeFormat/NumberFormat/RelativeTimeFormat`.
- **RTL desteği** (Arapça vb. eklenirse): `<html lang dir>`, Tailwind **logical properties** (`ms-*`, `ps-*`, `start/end`), kayan öğeler yönlü.
- **İçerik fallback politikası:** otomatik dil geri düşüşü **yok** (duplicate content/SEO için); olmayan çeviri 404 verir, sadece mevcut çeviriler listelenir.
- Font subset'leri dile göre (`latin`, `latin-ext`, `cyrillic`, `arabic`) yalnızca ilgili sayfada yüklenir.
- Redis ve Next cache anahtarları locale içerir; `revalidateTag` locale bazlıdır.
- Yeni dil ekleme prosedürü: `languages` satırı → `messages/xx.json` → admin çeviri → build; kod değişikliği gerekmez.
- Çeviri iş akışı: manuel (varsayılan); opsiyonel "makine çeviri taslağı" (DeepL/Argos self-host) → editör onayına düşer, otomatik yayına çıkmaz.

### 5.3 Core Web Vitals
- `next/image` + sunucu `width/height` + `blurDataURL`, LCP görseli `priority`, doğru `sizes`.
- `next/font` self-host, `display: swap`, subset'li.
- Server Components varsayılan; `'use client'` yalnızca arama, tema, dil değiştirici, TOC scroll-spy.
- Shiki ile sunucuda syntax highlight (istemciye JS yok).
- Analytics `lazyOnload` veya self-host (Umami/Plausible); sayaç beacon'ı.
- Skeleton + `loading.tsx` (CLS=0), akıllı prefetch, dark mode (flash önleyici).

### 5.4 Bileşenler
Header (arama, tema, **LanguageSwitcher**), PostCard, PostList (cursor + IntersectionObserver), Breadcrumb, TOC, ReadingProgress, ShareButtons, AuthorBox, RelatedPosts (aynı dilde), NewsletterForm (opsiyonel), Footer, 404/500.
- Arama: 250 ms debounce + `AbortController` + min 2 karakter + sonuç cache'i, sadece aktif dilde.

### 5.5 SEO (çok dilli)
- `generateMetadata`: title template, description, **canonical (kendi dili)**, `alternates.languages` (**hreflang** + `x-default`), robots.
- **Karşılıklı (reciprocal) hreflang** zorunlu: her çeviri diğerlerine işaret eder.
- OG: `og:locale`, `og:locale:alternate`; dinamik OG görseli `opengraph-image.tsx` (dile göre).
- JSON-LD: `BlogPosting` (`inLanguage`), `BreadcrumbList`, `Person`, `WebSite`+`SearchAction`, `Organization`.
- Locale başına RSS/Atom; `robots.txt`; `redirects` (middleware, cache'li); arama/filtre `noindex`.
- `html lang` doğru, erişilebilirlik (AA, skip-link, klavye).

### 5.6 Veri Çekme
İç ağ adresi (`http://api:3000`), `fetch` + `next.tags`, `React.cache` ile tekilleştirme, `Promise.all`.

---

## AŞAMA 6 — Test ve Kalite

| Katman | Araç | Kapsam |
|---|---|---|
| Unit | Vitest/Jest | slug (çok dilli transliterasyon), cursor, auth, cache invalidation, sanitize, locale çözümleme; ≥%80 servis |
| Integration | Supertest + Testcontainers (PG+Redis) | Tüm endpointler, RBAC, rate-limit, rotation, keyset, **çeviri unique kuralları, alternates doğruluğu** |
| i18n | `i18n-check` script | Eksik/fazla anahtar, ICU sözdizimi |
| Contract | Ortak Zod + OpenAPI | Front↔back uyum |
| E2E | Playwright | Login→TR yazı→EN çeviri→yayınla→her iki dilde görünür, hreflang & dil değiştirici, arama, dil bazlı 404 |
| A11y/Görsel | axe-core, screenshots | AA ihlali sıfır, RTL ekran görüntüsü (RTL eklenirse) |
| Performans | k6, Lighthouse CI (her dil) | Bölüm 11 bütçesi |
| Güvenlik | OWASP ZAP baseline, Trivy | Kritik = merge yok |
| Statik | ESLint, TS strict, Prettier, Husky, commitlint | |

---

## AŞAMA 7 — Docker ve CI/CD

### 7.1 Docker
- Multi-stage, `node:22-alpine`, non-root, Next `output:'standalone'`, `pnpm deploy --prod`.
- Prod compose servisleri: `nginx, web, api, worker, postgres, pgbouncer, redis-cache, redis-queue, minio, certbot` (+ izleme yığını). `healthcheck`, `mem_limit/cpus`, log rotasyonu, `restart: unless-stopped`. Postgres/Redis/MinIO API portları **host'a publish edilmez**.
- Dev compose: hot reload, mailpit, minio.

### 7.2 CI/CD (GitHub Actions veya self-host Gitea/Woodpecker)
1. **PR:** lint → typecheck → i18n-check → unit → integration → build → Lighthouse CI → Playwright.
2. **main:** + imaj build (Buildx cache), kayıt defterine push (GHCR veya **self-host registry**), Trivy.
3. **Deploy (SSH + `deploy.sh`):** imaj çek → DB migration (expand) → yeni konteyner (blue/green) → `/health/ready` → Nginx upstream çevir (`nginx -s reload`) → eskiyi durdur; hata → otomatik rollback.
4. Sonrası: smoke test + cache warm (her dilde ana sayfa + popüler yazılar) + Telegram bildirimi.
5. Ortamlar: staging → production (onaylı).

---

## AŞAMA 8 — Self-Hosting Sunucu Yapılandırması

### 8.1 Donanım/Kapasite Önerisi
Başlangıç: **4 vCPU / 8 GB RAM / NVMe SSD** (yazı + medya büyümesi için ≥100 GB, medya için ayrı disk/volume önerilir). Statik ağırlıklı mimari nedeniyle 2 vCPU/4GB minimum çalışır; bütçe hedefleri 4/8'e göre.
Kendi donanımda: statik IP, UPS, ISP üst yükleme hızı ≥100 Mbps, mümkünse yedek hat.

### 8.2 Nginx / Ağ
- Reverse proxy: `/api` → api upstream, `/` → web upstream, `/media` → MinIO/yerel cache. Keepalive upstream.
- **Brotli + gzip, HTTP/2, HTTP/3 (QUIC)**; TLS 1.2/1.3, OCSP stapling, HSTS preload.
- `proxy_cache` (HTML + API GET): `proxy_cache_lock`, `proxy_cache_use_stale updating error timeout`, `proxy_cache_background_update on`; cache purge: revalidate sırasında API → Nginx purge endpoint (iç ağ) veya kısa TTL + SWR.
- `/_next/static` ve medya: `immutable`, 1 yıl.
- `limit_req`/`limit_conn` ek koruma; kötü botlar için `map $http_user_agent`.
- **Certbot** otomatik yenileme (HTTP-01 veya DNS-01; çok dilli alt alan adı gerekirse wildcard DNS-01).
- DNS: A/AAAA + CAA kaydı, kısa TTL (geçişte), SPF/DKIM/DMARC (e-posta gönderiliyorsa).
- **Opsiyonel (sonradan):** Cloudflare/BunnyCDN yalnızca CDN/DDoS için önüne eklenebilir; mimari buna hazır (cache header'ları uyumlu).

### 8.3 Sunucu Sertleştirme
- UFW: yalnızca 80/443 (+ SSH). SSH: anahtar, parola kapalı, root kapalı, port değişimi opsiyonel, `fail2ban` (+ CrowdSec Nginx bouncer).
- `unattended-upgrades`, kernel/OS güncelleme penceresi, `auditd` opsiyonel.
- Docker: rootless/`no-new-privileges`, read-only FS (mümkünse), kaynak limitleri, ayrı docker network'leri (`frontend`, `backend`, `data`).
- Disk şifreleme opsiyonel; secrets repo dışında.
- OS tuning: `ulimit -n`, `net.core.somaxconn`, `vm.swappiness`, NTP.
- DDoS (kendi hosting): hosting sağlayıcı/ISP seviyesinde L3/4 koruması sorulmalı; L7 için Nginx rate limit + CrowdSec.
- PostgreSQL: `shared_buffers≈25% RAM`, `effective_cache_size≈60–70%`, `work_mem`, `max_connections` düşük + PgBouncer, `synchronous_commit` varsayılan.

### 8.4 Yüksek Erişilebilirlik Notları
Tek sunucu = tek hata noktası. Azaltma: otomatik restart, sağlık kontrolü, yedekten <1 saatte yeniden kurulum (runbook + `infra/provision.sh`/Ansible), ikinci sunucuda "soğuk" yedek (opsiyonel), UPS/yedek hat.

---

## AŞAMA 9 — İzleme, Yedekleme, Bakım

- **Loglama:** Pino JSON → Loki (+Promtail) veya dosya + logrotate; hassas alan redaksiyonu.
- **Metrikler:** Prometheus + Grafana (HTTP süreleri, cache hit, kuyruk, DB havuz, Nginx `stub_status`/exporter), `node_exporter`, `postgres_exporter`, `redis_exporter`, cAdvisor.
- **Hata takibi:** self-host **GlitchTip/Sentry** (veri sunucuda kalır) veya Sentry cloud.
- **Uptime:** dış izleme (UptimeRobot/Better Stack) — **kendi sunucun düştüğünde içeriden izleme işe yaramaz**, bu yüzden dış servis şart. Telegram/e-posta bildirimi. SSL süresi takibi.
- **Alarmlar:** p95>500ms, 5xx>%1, Redis bellek>%80, disk>%80, PG bağlantı>%80, kuyruk gecikmesi>2dk, yedek başarısız, sertifika <14 gün.
- **Yedekleme (3-2-1):** gece 03:00 `pg_dump -Fc` + (opsiyonel pgBackRest WAL/PITR) → `age` ile şifrele → **yerel disk + farklı sunucu/Backblaze B2/Hetzner Storage Box**. MinIO: `mc mirror` ile ikinci hedefe replikasyon. Saklama 7 günlük / 4 haftalık / 6 aylık. **Aylık otomatik restore testi**.
- **Bakım:** Renovate, aylık `REINDEX`/`VACUUM` incelemesi, yavaş sorgu raporu, log/revizyon temizliği, `docs/runbook.md` (olay, rollback, restore, yeni dil ekleme).

---

## AŞAMA 10 — Opsiyonel Genişlemeler
Bülten (dile göre), PWA, makine çeviri taslağı, Meilisearch geçişi, ikinci sunucu/replica, CDN ekleme.

---

## AŞAMA 11 — Performans Bütçeleri

| Metrik | Hedef |
|---|---|
| LCP (mobil, 4G) | < 2.0 s |
| INP | < 200 ms |
| CLS | < 0.05 |
| TTFB (Nginx cache hit) | < 80 ms; origin < 300 ms |
| Lighthouse (Perf/SEO/A11y/BP), **her dilde** | ≥95 / 100 / ≥95 / ≥95 |
| Public JS (yazı sayfası) | < 90 KB gzip (yorum/CSR yükü yok) |
| Admin ilk yükleme | < 200 KB gzip |
| API p95 (cache hit / miss) | < 30 ms / < 150 ms |
| Redis cache hit | > %90 |
| Yük testi | 1000 eşzamanlı, 500+ RPS okuma, hata < %0.1 (4vCPU/8GB) |
| DB kritik sorgular | < 20 ms, Seq Scan yok |
| Hero görsel | < 150 KB (AVIF/WebP) |

Doğrulama: k6 (smoke/load/stress/soak, dil karışık trafik), Lighthouse CI, WebPageTest, `autocannon`, `web-vitals` gerçek kullanıcı ölçümü.

---

## Uygulama Yol Haritası

| Faz | İçerik | Kabul Kriteri |
|---|---|---|
| **0 (2-3 gün)** | Monorepo, lint/CI iskeleti, dev compose, env doğrulama, `packages/shared` (locale sabitleri) | `pnpm dev` ile tüm servisler ayağa kalkar |
| **1 (1 hafta)** | DB şeması (çeviri tabloları dahil), migration, seed (tr/en), indeksler | EXPLAIN raporu, 1000 yazı/dil |
| **2 (1 hafta)** | Auth (rotation), Users, RBAC, güvenlik katmanı | Integration yeşil |
| **3 (2 hafta)** | Posts/Translations/Taksonomi/Arama API + Redis cache + view sayacı + redirects | k6 okuma hedefleri |
| **4 (1 hafta)** | Medya pipeline (MinIO, Sharp worker, AVIF/WebP) | Upload→varyant <5 sn |
| **5 (2 hafta)** | Admin paneli (dil sekmeli editör, auto-save, medya, dashboard) | Playwright yazı-çeviri-yayın akışı |
| **6 (2.5 hafta)** | Next.js site, i18n routing, ISR/on-demand, hreflang/SEO, arama | Lighthouse bütçesi (her dil) |
| **7 (1 hafta)** | Test sertleştirme, a11y, güvenlik, yük testi | Bölüm 11 geçer |
| **8 (1.5 hafta)** | Sunucu kurulumu, Nginx cache, TLS, CI/CD, blue/green, izleme, yedek+restore testi | Staging→prod, rollback tatbikatı |
| **9 (süreğan)** | Bülten, PWA, makine çeviri, ek diller | — |

Toplam: **~11–13 hafta** (tek geliştirici).

---

## Riskler
| Risk | Önlem |
|---|---|
| Cache invalidation (çok dil × çok katman) | Tag tabanlı, locale-aware; entegrasyon testi; SWR + güvenlik ağı TTL |
| Tek sunucu arızası | Runbook, otomatik provision, dış uptime, 3-2-1 yedek, soğuk yedek sunucu |
| Çeviri eksikliği / duplicate content | Fallback yok, hreflang yalnızca mevcut çeviri, admin'de eksik çeviri raporu |
| Yanlış hreflang | Reciprocal kontrol testi (CI), sitemap alternates doğrulama |
| Bot/DDoS (CDN yok) | Nginx limit_req, CrowdSec, sağlayıcı L3/4 koruması, gerekirse CDN eklenir |
| Büyük görsel yüklemesi | Limit, presign koşulları, asenkron işleme |
| Şema değişiminde kesinti | Expand/contract |
| Token çalınması | Kısa access, rotation + reuse detection, HttpOnly |

---

## Varsayımlar (değiştirmek isterseniz belirtin)
1. **Başlangıç dilleri: `tr` (varsayılan) + `en`**; diğerleri (de, ar, ru…) `languages` tablosu ile sonradan eklenir. Hangi diller olacak?
2. URL: alt dizin (`/tr`, `/en`); varsayılan dil de prefix'li.
3. Alan adı: tek domain; alt alan adı/ccTLD ihtiyacı varsa belirtin.
4. Sunucu: VPS/dedicated Linux (Ubuntu 24.04 LTS), root erişimli.
5. Docker bu makinede kurulu değil → geliştirme için Docker Desktop (veya WSL2) kurulumu gerekecek.
