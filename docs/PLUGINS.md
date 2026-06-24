# AUTOIN — Sistem Plugin / Extension

Plugin membuat **command ber-prefix** (mis. `.xprofile budi`) yang menjalankan **script JS milik user**
di sandbox, lalu membalas otomatis di WhatsApp. Dokumen ini = referensi teknis. Panduan untuk
pengguna ada di halaman in-app **`/plugin-docs`**.

## Arsitektur

```
Pesan WA masuk
  └─ whatsapp-service/src/sessions.js  _autoreply(sessionId, chatId, text, raw)
       └─ POST {BACKEND}/api/internal/chatbot/match  { session_id, text, sender, platform }
            backend ChatbotRuleController::matchInternal
              1) PLUGIN PASS  : cari Plugin user yg prefix+command cocok (Plugin::matchCommand)
                                → { type:'plugin', plugin:{id,name,code,timeout_ms}, args, raw_args }
              2) RULE PASS    : auto-reply biasa → { type:'reply', reply, media_url, ... }
       └─ type==='plugin' → runPlugin(code, ctx) di worker_thread + vm (sandbox)
                            → { text, mediaUrl, mediaType } → this.send(...)  (quote pesan asal)
```

- **PHP** = matching command + penyimpanan. **Node** = eksekusi sandbox.
- Plugin selalu dicek **sebelum** rule chatbot biasa.

## Komponen

| Lapisan | File |
| --- | --- |
| Migration | `backend/database/migrations/2026_06_24_100000_create_plugins_table.php` |
| Model | `backend/app/Models/Plugin.php` (`matchCommand`, relasi `user`) |
| Controller | `backend/app/Http/Controllers/PluginController.php` (CRUD, `test`, `reportInternal`, admin*) |
| Match | `backend/app/Http/Controllers/ChatbotRuleController.php` (plugin pass) |
| Routes | `backend/routes/api.php` |
| Limit paket | `backend/app/Services/PlanLimits.php` (key `plugins`) |
| Sandbox | `whatsapp-service/src/pluginRunner.js` + `pluginWorker.js` |
| Autoreply | `whatsapp-service/src/sessions.js` (`_runPluginReply`) |
| Endpoint Tes | `whatsapp-service/src/index.js` (`POST /plugins/run`) |
| UI user | `frontend/src/components/plugins/Plugins.tsx`, `pages/plugins.astro` |
| UI admin | `frontend/src/components/admin/AdminPlugins.tsx`, `pages/admin-plugins.astro` |
| Docs | `frontend/src/components/docs/PluginDocs.tsx`, `pages/plugin-docs.astro` |

## Skema `plugins`

`user_id, name, prefix (./!#), command, description?, usage?, code (longText),
is_active, timeout_ms (1000–15000), last_error?, last_run_at?, timestamps`

## Kontrak script (base script)

User menulis **body handler**; di-wrap jadi `(async () => { <code> })()` dalam vm context.
Wajib `return`.

```js
// Global tersedia: ctx, helpers
// ctx     : { args:string[], rawArgs, text, sender, chatId, sessionId }
// helpers : { getJson(url,opts?), getText(url,opts?), getBuffer(url,opts?),
//             post(url,body,opts?), log(...args) }
// return  : string  |  { text?, mediaUrl?, mediaType? }   (mediaType: image|video|audio|document)
```

Contoh `.xprofile` lengkap ada di `frontend/.../Plugins.tsx` (`DEFAULT_CODE`) dan di `/plugin-docs`.

## API

User (auth `auth:api`):
- `GET    /api/plugins`
- `POST   /api/plugins`
- `PUT    /api/plugins/{plugin}`
- `DELETE /api/plugins/{plugin}`
- `POST   /api/plugins/{plugin}/test`  body `{ args?:string[], code?:string }` → `{ ok, output, logs, error }`

Admin (email `arisedyhandoko@gmail.com`):
- `GET    /api/admin/plugins` → `{ stats, plugins:[...with user] }`
- `POST   /api/admin/plugins/{plugin}/toggle`
- `POST   /api/admin/plugins/{plugin}/test`
- `DELETE /api/admin/plugins/{plugin}`

Internal (header `X-Internal-Secret`):
- `POST /api/internal/plugins/report`  `{ plugin_id, error|null }` → catat `last_error`/`last_run_at`

WA service (header `x-api-secret`):
- `POST /plugins/run`  `{ code, ctx, timeout_ms }` → `{ ok, output, logs, error }`

## Keamanan

- Eksekusi di **worker_thread** terisolasi (`env:{}`, `resourceLimits` memori), bisa di-`terminate()`.
- vm context tanpa `require`/`process`/`fs`. Hanya `ctx`, `helpers`, builtin aman.
- Timeout vm (sync) + hard-kill worker (async). Default 8s, clamp ≤15s.
- `helpers.*` hanya http/https; anti-SSRF (blok IP privat/localhost/metadata via DNS lookup).
- Cap: ≤10 request, respons ≤5 MB, teks balasan ≤8.000 char.
- Catatan: vm+worker bukan jaminan anti kode jahat 100%. Hardening lanjutan = `isolated-vm`
  atau container per-tenant; bisa tambah gate approval owner sebelum plugin aktif.

## Deploy

1. `php artisan migrate` (tabel `plugins`).
2. **Restart whatsapp-service** (pm2/ecosystem) agar `pluginRunner`/`pluginWorker`/perubahan
   `sessions.js` & `index.js` terbaca.
3. Build frontend (Astro) — halaman `/plugins`, `/admin-plugins`, `/plugin-docs`.

## Uji cepat

```bash
# Sandbox langsung (tanpa WA)
node -e "import('./whatsapp-service/src/pluginRunner.js').then(async m=>{ \
  console.log(await m.runPlugin(\"return 'pong';\", {args:[]}, {timeoutMs:3000})); })"
```
Live: simpan plugin `.xprofile` di dashboard → **Tes** → lalu kirim `.xprofile <username>` dari WhatsApp.
