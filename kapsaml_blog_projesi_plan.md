# Profesyonel Blog Sistemi Proje Planı (Headless CMS Mimarisi)

Bu döküman, modern web standartlarına uygun, yüksek trafik kaldırabilen (scalable), güvenli ve SEO uyumlu bir blog sisteminin uçtan uca geliştirme aşamalarını detaylandırmaktadır.

---

## AŞAMA 1: Sistem Tasarımı ve Mimari Kararlar

Kod yazımına geçmeden önce sistemin sınırları ve kullanılacak teknolojiler kesinleştirilmelidir.

### 1.1. Teknoloji Yığını (Tech Stack) Seçimi
*   **Backend (API Katmanı):** Node.js (NestJS veya Express.js) - *Mikroservis mimarisine geçişe uygun, hızlı I/O işlemleri için.*
*   **Veritabanı:** PostgreSQL - *İlişkisel veriler, JSONB desteği ve veri bütünlüğü için.*
*   **Önbellek (Cache):** Redis - *Sık okunan verileri (ana sayfa yazıları, kategoriler) RAM'de tutarak veritabanı yükünü azaltmak için.*
*   **Frontend (İstemci):** Next.js (App Router) - *SSR (Server-Side Rendering) ve SSG (Static Site Generation) özellikleri ile kusursuz SEO için.*
*   **Yönetim Paneli:** React (Vite) + Tailwind CSS + Zustand - *Hızlı render edilen, modern bir SPA (Single Page Application) için.*
*   **Medya Depolama:** AWS S3 (veya Cloudflare R2 / MinIO) - *Görsellerin sunucudan bağımsız depolanması ve CDN ile dağıtılması için.*

### 1.2. Klasör ve Katman Mimarisi (Backend için)
*   **Controller:** Gelen HTTP isteklerini karşılar ve HTTP yanıtlarını döndürür.
*   **Service:** İş mantığının (Business Logic) yazıldığı yerdir.
*   **Repository / Data Access:** Veritabanı sorgularının yapıldığı, ORM'in (Prisma veya TypeORM) kullanıldığı katmandır.

---

## AŞAMA 2: Veritabanı (Schema) ve Veri Modeli Tasarımı

PostgreSQL üzerinde kurulacak yapının detaylı tablo tasarımları:

### 2.1. Temel Tablolar
*   **`users` Tablosu:**
    *   `id` (UUID, Primary Key)
    *   `username`, `email` (Unique, Indexed)
    *   `password_hash` (Bcrypt veya Argon2)
    *   `role` (Enum: 'ADMIN', 'EDITOR', 'USER')
    *   `profile_picture_url`, `bio`, `social_links` (JSONB)
    *   `is_active` (Boolean), `created_at`, `updated_at`
*   **`posts` Tablosu:**
    *   `id` (UUID, Primary Key)
    *   `author_id` (Foreign Key -> users.id)
    *   `title`, `slug` (Unique, Indexed)
    *   `excerpt` (Özet metin)
    *   `content` (Rich text/Markdown içeriği)
    *   `cover_image_url`
    *   `status` (Enum: 'DRAFT', 'PUBLISHED', 'ARCHIVED')
    *   `views_count` (Integer, Default: 0)
    *   `published_at`, `created_at`, `updated_at`
*   **`categories` ve `tags` Tabloları:**
    *   `id`, `name`, `slug` (Unique), `description`
*   **Ara Tablolar (Many-to-Many):**
    *   `post_categories` (post_id, category_id)
    *   `post_tags` (post_id, tag_id)
*   **`comments` Tablosu:**
    *   `id` (UUID)
    *   `post_id` (Foreign Key -> posts.id)
    *   `user_id` (Eğer üye girişi zorunluysa) VEYA `guest_name`, `guest_email`
    *   `parent_id` (İç içe yorumlar - Nested Comments için self-referencing foreign key)
    *   `content`
    *   `status` (Enum: 'PENDING', 'APPROVED', 'SPAM')
*   **`seo_metadata` Tablosu (Opsiyonel ama profesyonel):**
    *   Her post ve sayfa için özel `meta_title`, `meta_description`, `og_image` değerlerini tutar.

---

## AŞAMA 3: Backend ve RESTful API Geliştirme

Bağımsız ve güvenli bir API katmanının oluşturulması.

### 3.1. Kimlik Doğrulama ve Güvenlik (Auth & Security)
*   **JWT (JSON Web Token):** Access Token (kısa ömürlü, 15 dk) ve Refresh Token (uzun ömürlü, HTTP-only cookie içinde saklanır) yapısı kurulacak.
*   **Şifreleme:** Kullanıcı şifreleri veritabanına kaydedilmeden önce kesinlikle hash'lenecek.
*   **Güvenlik Katmanları:**
    *   `Helmet.js`: HTTP header saldırılarını önlemek için.
    *   `CORS`: Sadece belirlediğimiz frontend ve admin paneli domainlerinden gelen isteklere izin verilecek.
    *   `Rate Limiting`: IP bazlı DDoS ve Brute-Force koruması (Örn: 1 dakikada max 100 istek).
    *   `Veri Validasyonu`: Gelen veriler `Zod` veya `Joi` ile kontrol edilecek (Örn: email formatı doğru mu, şifre en az 8 karakter mi?).

### 3.2. Core API Endpoint'leri
*   **Auth:** `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`
*   **Posts:** `GET /posts` (Sayfalamalı, filtreli), `GET /posts/:slug`, `POST /posts` (Admin/Editor), `PUT /posts/:id`, `DELETE /posts/:id`
*   **Upload:** `POST /upload/image` (Multer ile alınıp, Sharp ile WebP formatına çevrilip sıkıştırılacak ve AWS S3'e yüklenecek).

### 3.3. Performans ve Önbellekleme (Caching)
*   `GET /posts` gibi sık kullanılan uç noktalarda veriler Redis'e kaydedilir.
*   Yeni bir yazı eklendiğinde veya güncellendiğinde (Cache Invalidation), ilgili Redis anahtarları silinir.

---

## AŞAMA 4: Yönetim Paneli (Admin Dashboard) Geliştirme

İçerik üreticilerinin ve yöneticilerin sistemi yönetecekleri kapalı SPA (Single Page Application).

### 4.1. Temel Altyapı
*   Sadece Admin ve Editor rolündekiler girebilir (Protected Routes).
*   Görsel bir kütüphane (Material UI, Ant Design veya Shadcn UI) kullanılarak hızlı arayüz inşası.

### 4.2. Gelişmiş Özellikler
*   **Zengin Metin Editörü (Rich Text Editor):** `TipTap` veya `Editor.js` entegrasyonu. Sadece metin değil, blok bazlı (resim, kod bloğu, video embed) içerik girme imkanı.
*   **Medya Kütüphanesi:** S3'e yüklenen eski görselleri görebilme, seçebilme ve silebilme.
*   **Otomatik Kayıt (Auto-save):** Yazı yazarken her 30 saniyede bir taslak (draft) olarak kaydetme.
*   **SEO Önizleme:** Google arama sonuçlarında (SERP) yazının nasıl görüneceğini simüle eden küçük bir bileşen.
*   **Dashboard Grafikleri:** `Recharts` veya `Chart.js` ile günlük/haftalık ziyaretçi sayıları ve popüler yazılar grafiği.

---

## AŞAMA 5: Frontend (Son Kullanıcı Ekranı) Geliştirme

Google'ın sevdiği, hızlı ve erişilebilir (Accessible) son kullanıcı arayüzü (Next.js).

### 5.1. Sayfa Oluşturma Stratejileri (Next.js Rendering)
*   **Ana Sayfa (`/`):** ISR (Incremental Static Regeneration). Sayfa statik olarak oluşturulur, arka planda belirli aralıklarla (örn: 60 saniye) güncellenir.
*   **Yazı Detay Sayfası (`/[slug]`):** SSG (Static Site Generation) + ISR. En popüler yazılar build anında oluşturulur, yeni yazılar istek geldikçe statik olarak üretilir (`fallback: 'blocking'`).
*   **Arama ve Kullanıcı Sayfaları:** CSR (Client-Side Rendering) veya SSR.

### 5.2. Arayüz Bileşenleri
*   **İskelet Yükleyiciler (Skeleton Loaders):** Veri beklerken sayfanın zıplamasını (Layout Shift) engellemek için geçici gri bloklar.
*   **Dinamik Arama Barı:** Kullanıcı yazarken alttan anında sonuçları getiren "Debounce" uygulanmış arama inputu.
*   **Yorum Ağacı:** İç içe geçmiş (Threaded) yorumların rekürsif (kendi kendini çağıran) bileşenlerle render edilmesi.

### 5.3. Mükemmel SEO Optimizasyonu
*   `next/head` (veya yeni Metadata API) ile her sayfa için benzersiz `<title>`, `<meta name="description">` etiketleri.
*   **Open Graph & Twitter Cards:** Yazılar WhatsApp, Twitter veya LinkedIn'de paylaşıldığında başlık, özet ve kapak fotoğrafının büyük kart olarak çıkması.
*   **JSON-LD (Schema.org):** Arama motorlarına sayfanın bir makale olduğunu anlatan yapısal veri (Article, Breadcrumb ve Author şemaları).
*   **Sitemap & Robots.txt:** `next-sitemap` kütüphanesi ile dinamik olarak `/sitemap.xml` üretimi.

---

## AŞAMA 6: Test Süreçleri (Quality Assurance)

Sistemin hatasız çalıştığından emin olmak için yazılım testleri.

*   **Unit Tests (Birim Testleri):** `Jest` kullanarak fonksiyonların (örneğin SEO slug üreten fonksiyonun veya şifre hashleyen servisin) doğru çalışıp çalışmadığının testi.
*   **Integration Tests:** `Supertest` ile API uç noktalarının (Örn: Veritabanına gerçekten yeni bir kullanıcı ekleniyor mu?) testi.
*   **E2E (Uçtan Uca) Testler:** `Cypress` veya `Playwright` ile sanki gerçek bir kullanıcıymış gibi admin paneline girip, yazı yazıp, yayınla butonuna basma senaryosunun simülasyonu.

---

## AŞAMA 7: DevOps, CI/CD ve Canlıya Alma (Deployment)

Kodun geliştiricinin bilgisayarından çıkıp sunucuya güvenli ve otomatik şekilde aktarılması.

### 7.1. Konteynerleştirme (Docker)
*   Frontend, Backend, PostgreSQL ve Redis için izole `Dockerfile`'lar hazırlanır.
*   Tüm sistemi tek komutta (`docker-compose up -d`) ayağa kaldırmak için `docker-compose.yml` yapılandırılır.

### 7.2. Sürekli Entegrasyon ve Dağıtım (CI/CD Pipeline)
*   **GitHub Actions / GitLab CI:**
    1. Geliştirici kodu Main branch'e pushlar.
    2. Sunucu otomatik olarak testleri (Jest) çalıştırır ve kodu derler (Build).
    3. Testler geçerse, yeni Docker imajı oluşturulur.
    4. İmaj sunucuya gönderilir (SSH) ve eski konteynerler kesintisiz (Zero-Downtime) bir şekilde yenileriyle değiştirilir.

### 7.3. Sunucu ve Ağ Yapılandırması (VPS Configuration)
*   **Nginx (Reverse Proxy):** Dışarıdan gelen HTTP isteklerini karşılar. `/api` ile başlayan istekleri Backend konteynerine, diğer istekleri Frontend konteynerine yönlendirir.
*   **SSL Sertifikası:** `Certbot (Let's Encrypt)` kullanılarak siteye ücretsiz ve otomatik yenilenen HTTPS entegrasyonu.
*   **Güvenlik Duvarı (UFW):** Sunucuda sadece 80 (HTTP), 443 (HTTPS) ve 22 (SSH) portları dışarıya açılır. Veritabanı portu (5432) sadece iç ağa (localhost) kısıtlanır.

---

## AŞAMA 8: İzleme (Monitoring) ve Bakım

Sistem canlıya alındıktan sonra sağlığının takip edilmesi.

*   **Loglama:** Backend'de oluşan hataların (500 Server Error) `Winston` kütüphanesi ile bir dosyaya veya log sunucusuna kaydedilmesi.
*   **Uptime Takibi:** Sitenin çökme ihtimaline karşı `UptimeRobot` ile 5 dakikada bir kontrol ve çökme anında Telegram/Mail bildirimi.
*   **Performans İzleme:** Frontend için Sentry.io entegrasyonu yapılarak kullanıcıların tarayıcılarında oluşan hataların (Örn: React çökmeleri) raporlanması.
*   **Yedekleme (Backup):** Veritabanının her gece saat 03:00'te Cron Job ile `.sql` yedeğinin alınıp AWS S3'e veya farklı bir sunucuya şifrelenerek gönderilmesi.