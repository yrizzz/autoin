# 🛠 AUTOIN — Technical Specification

## Lanjutan dari prd.md

---

# 📁 Project Structure

```
autoin/
├── frontend/          # Astro + React 19
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Shadcn UI components
│   │   │   ├── layout/      # Header, Sidebar, Footer
│   │   │   ├── broadcast/   # Broadcast form, history, scheduler
│   │   │   ├── channels/    # Channel connect cards
│   │   │   ├── dashboard/   # Overview widgets, analytics
│   │   │   └── landing/     # Hero, Features, Pricing, FAQ
│   │   ├── pages/
│   │   │   ├── index.astro       # Landing
│   │   │   ├── dashboard.astro   # Dashboard
│   │   │   ├── broadcast/
│   │   │   │   ├── index.astro   # Create broadcast
│   │   │   │   ├── schedule.astro
│   │   │   │   └── history.astro
│   │   │   ├── channels/
│   │   │   │   ├── index.astro
│   │   │   │   ├── whatsapp.astro
│   │   │   │   ├── telegram.astro
│   │   │   │   └── discord.astro
│   │   │   ├── billing.astro
│   │   │   ├── settings.astro
│   │   │   └── api/
│   │   │       └── index.astro
│   │   ├── layouts/
│   │   │   ├── BaseLayout.astro
│   │   │   └── DashboardLayout.astro
│   │   ├── stores/          # Nanostores / Zustand
│   │   ├── lib/
│   │   │   ├── api.ts       # API client
│   │   │   ├── auth.ts      # Google OAuth helpers
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts
│   ├── astro.config.mjs
│   ├── tailwind.config.ts
│   └── package.json
│
└── backend/           # Laravel 12
    ├── app/
    │   ├── Http/Controllers/
    │   │   ├── AuthController.php
    │   │   ├── BroadcastController.php
    │   │   ├── ChannelController.php
    │   │   ├── AnalyticsController.php
    │   │   └── BillingController.php
    │   ├── Models/
    │   │   ├── User.php
    │   │   ├── Channel.php
    │   │   ├── Broadcast.php
    │   │   ├── BroadcastTarget.php
    │   │   ├── BroadcastLog.php
    │   │   └── Subscription.php
    │   ├── Jobs/
    │   │   ├── SendBroadcastJob.php
    │   │   └── ProcessScheduledBroadcast.php
    │   ├── Services/
    │   │   ├── BroadcastService.php
    │   │   ├── TelegramService.php
    │   │   ├── DiscordService.php
    │   │   ├── WhatsAppService.php
    │   │   ├── SlackService.php
    │   │   ├── EmailService.php
    │   │   └── AIService.php
    │   └── Events/
    │       └── BroadcastStatusUpdated.php
    ├── database/
    │   └── migrations/
    └── routes/
        ├── api.php
        └── web.php
```

---

# 🗄 Database Schema — Detail

## users

```sql
CREATE TABLE users (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    avatar      TEXT,
    google_id   VARCHAR(255) UNIQUE,
    trial_count INT DEFAULT 5,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);
```

---

## channels

```sql
CREATE TABLE channels (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id      BIGINT NOT NULL REFERENCES users(id),
    name         VARCHAR(255) NOT NULL,
    platform     ENUM('whatsapp','telegram','discord','slack','smtp','resend','mailgun','webhook'),
    credentials  JSON NOT NULL,
    target_id    VARCHAR(255),  -- chat_id / channel_id / webhook_url
    status       ENUM('active','inactive','error') DEFAULT 'inactive',
    last_used_at TIMESTAMP NULL,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP
);
```

---

## broadcasts

```sql
CREATE TABLE broadcasts (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id      BIGINT NOT NULL REFERENCES users(id),
    title        VARCHAR(255),
    content      TEXT NOT NULL,
    media_url    TEXT NULL,
    media_type   ENUM('image','video','pdf','document') NULL,
    status       ENUM('draft','queued','sending','sent','failed','scheduled') DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    recurring    ENUM('none','daily','weekly','monthly') DEFAULT 'none',
    sent_at      TIMESTAMP NULL,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP
);
```

---

## broadcast_targets

```sql
CREATE TABLE broadcast_targets (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    broadcast_id BIGINT NOT NULL REFERENCES broadcasts(id),
    channel_id   BIGINT NOT NULL REFERENCES channels(id)
);
```

---

## broadcast_logs

```sql
CREATE TABLE broadcast_logs (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    broadcast_id BIGINT NOT NULL REFERENCES broadcasts(id),
    channel_id   BIGINT NOT NULL REFERENCES channels(id),
    status       ENUM('pending','success','failed') DEFAULT 'pending',
    response     JSON NULL,
    error        TEXT NULL,
    sent_at      TIMESTAMP NULL,
    created_at   TIMESTAMP
);
```

---

## subscriptions

```sql
CREATE TABLE subscriptions (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id      BIGINT NOT NULL REFERENCES users(id),
    plan         ENUM('free','daily','monthly','yearly'),
    started_at   TIMESTAMP,
    expires_at   TIMESTAMP NULL,
    payment_id   VARCHAR(255) NULL,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP
);
```

---

# 🔌 API Endpoints

## Auth

```
GET  /auth/google          → redirect ke Google OAuth
GET  /auth/google/callback → handle callback, return JWT
POST /auth/logout          → invalidate token
GET  /auth/me              → info user saat ini
```

---

## Channels

```
GET    /api/channels              → list semua channel user
POST   /api/channels              → tambah channel baru
GET    /api/channels/:id          → detail channel
PUT    /api/channels/:id          → update channel
DELETE /api/channels/:id          → hapus channel
POST   /api/channels/:id/test     → test koneksi channel
```

---

## Broadcasts

```
GET    /api/broadcasts            → list broadcast (paginated)
POST   /api/broadcasts            → buat broadcast baru
GET    /api/broadcasts/:id        → detail broadcast
PUT    /api/broadcasts/:id        → update broadcast
DELETE /api/broadcasts/:id        → hapus broadcast
POST   /api/broadcasts/:id/send   → send now
POST   /api/broadcasts/:id/cancel → cancel scheduled
GET    /api/broadcasts/:id/logs   → delivery logs
```

---

## Analytics

```
GET /api/analytics/overview       → stats keseluruhan
GET /api/analytics/broadcasts     → grafik broadcast per hari
GET /api/analytics/channels       → performa per channel
```

---

## Billing

```
GET  /api/billing/plans           → list paket
POST /api/billing/purchase        → beli plan
GET  /api/billing/history         → riwayat pembayaran
GET  /api/billing/active          → subscription aktif
```

---

## AI

```
POST /api/ai/rewrite    → { content, tone: 'formal|casual|marketing|professional' }
POST /api/ai/generate   → { type: 'caption|promo|announcement|reminder', context }
POST /api/ai/optimize   → { content } → saran perbaikan
```

---

# ⚡ Broadcast Flow (Technical)

```
User klik "Send Broadcast"
    ↓
POST /api/broadcasts/:id/send
    ↓
BroadcastController@send
    ↓
Validasi subscription / trial
    ↓
Buat broadcast_logs (status: pending) per channel
    ↓
Dispatch SendBroadcastJob ke Queue
    ↓
Return response: { status: 'queued', broadcast_id }
    ↓
[QUEUE WORKER]
SendBroadcastJob::handle()
    ↓
Loop setiap channel target:
    - Resolve Service (Telegram/Discord/WA/etc)
    - Kirim pesan
    - Update broadcast_log status
    - Fire BroadcastStatusUpdated event
    ↓
[WEBSOCKET via Reverb]
Frontend menerima update real-time
    ↓
Update UI: ✅ Delivered / ❌ Failed
```

---

# 🔐 Security

## Authentication

- JWT token dari Google OAuth
- Token disimpan di HttpOnly cookie
- Refresh token flow

## API Security

- Rate limiting: 60 req/menit per user
- API Key untuk developer (HMAC SHA256)
- Webhook signature verification

## Channel Credentials

- Credentials diencrypt di database (AES-256)
- Tidak pernah dikirim ke frontend dalam bentuk plaintext

---

# 🎨 Component Design

## BroadcastForm

Input:
- Judul (optional)
- Pesan (textarea dengan counter)
- Media upload (image/video/pdf)
- Pilih channel (multi-select checkboxes)
- Jadwal (datetime picker, optional)
- Recurring (select, optional)

Actions:
- Save Draft
- Schedule
- Send Now

---

## ChannelCard

Tampil:
- Icon platform
- Nama channel
- Status badge (Active / Error / Inactive)
- Last used

Actions:
- Test Connection
- Edit
- Delete

---

## BroadcastHistoryRow

Tampil:
- Judul / preview pesan
- Tanggal kirim
- Channel targets (icon list)
- Status keseluruhan
- Success/Failed count

Action:
- View Logs
- Resend

---

# 📦 Environment Variables

## Frontend (.env)

```env
PUBLIC_API_URL=http://localhost:8000
PUBLIC_WS_URL=ws://localhost:8080
PUBLIC_GOOGLE_CLIENT_ID=xxx
```

## Backend (.env)

```env
APP_NAME=AUTOIN
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=autoin
DB_USERNAME=postgres
DB_PASSWORD=secret

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

REVERB_APP_ID=autoin
REVERB_APP_KEY=xxx
REVERB_APP_SECRET=xxx
REVERB_HOST=localhost
REVERB_PORT=8080

AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_DEFAULT_REGION=ap-southeast-1
AWS_BUCKET=autoin-media

OPENAI_API_KEY=xxx

QUEUE_CONNECTION=redis

ENCRYPTION_KEY=xxx
```

---

# 🚀 Development Plan

## Phase 1 — Foundation (Week 1-2)

- [ ] Init Laravel 12 backend
- [ ] Setup PostgreSQL + Redis
- [ ] Google OAuth (Socialite)
- [ ] JWT Auth middleware
- [ ] User model & migration
- [ ] Init Astro + React 19 frontend
- [ ] Tailwind v4 + Shadcn setup
- [ ] Base layout + routing
- [ ] Landing page static

---

## Phase 2 — Core Features (Week 3-4)

- [ ] Channel CRUD API
- [ ] Channel connect UI (Telegram, Discord, Webhook)
- [ ] Broadcast CRUD API
- [ ] Broadcast form UI
- [ ] Queue worker setup
- [ ] Send Telegram broadcast
- [ ] Send Discord broadcast
- [ ] Broadcast logs

---

## Phase 3 — Advanced (Week 5-6)

- [ ] Scheduling & Recurring
- [ ] Analytics API + Charts
- [ ] WhatsApp integration
- [ ] Email (SMTP/Resend)
- [ ] Webhook integration
- [ ] Real-time status via Reverb

---

## Phase 4 — Billing & AI (Week 7-8)

- [ ] Subscription model
- [ ] Midtrans/Xendit payment
- [ ] Trial quota enforcement
- [ ] AI Rewrite (OpenAI)
- [ ] AI Campaign Generator
- [ ] API Key management

---

## Phase 5 — Polish & Launch (Week 9-10)

- [ ] Dashboard analytics charts
- [ ] Mobile responsive
- [ ] Error handling & retry
- [ ] Rate limiting
- [ ] Encryption for credentials
- [ ] Deploy: Railway / Fly.io
- [ ] Domain setup
- [ ] Smoke testing

---

# ⚙️ Setup Commands

## Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
php artisan queue:work
php artisan reverb:start
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

# 📋 Checklist MVP

- [ ] Google Login
- [ ] Connect Telegram Bot
- [ ] Connect Discord Webhook
- [ ] Connect Custom Webhook
- [ ] Create Broadcast
- [ ] Select Multiple Channels
- [ ] Send Broadcast
- [ ] View Delivery Status
- [ ] Broadcast History
- [ ] Trial Quota (5x gratis)
- [ ] Daily Pass Purchase
- [ ] Basic Analytics
- [ ] Landing Page

---

# 🏁 MVP Launch Target

Platform: Vercel (frontend) + Railway (backend + postgres + redis)

Target: 14 hari development sprint

Minimum channel untuk launch: Telegram + Discord + Webhook
