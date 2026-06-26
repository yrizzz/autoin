// PM2 Ecosystem Config — Autoin Production
// Usage: pm2 start ecosystem.config.cjs
// Auto-restart: pm2 startup && pm2 save

const path = require('path');
const ROOT = __dirname;

module.exports = {
  apps: [
    // ── Laravel Backend ──────────────────────────────────
    {
      name: 'autoin-backend',
      cwd: path.join(ROOT, 'backend'),
      script: 'artisan',          // artisan file at backend root (not vendor symlink)
      args: 'serve --host=0.0.0.0 --port=8001',
      interpreter: 'php',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        APP_ENV: 'production',
      },
      out_file: '/var/log/autoin/backend.log',
      error_file: '/var/log/autoin/backend-err.log',
      merge_logs: true,
    },

    // ── WhatsApp Node.js Service ─────────────────────────
    {
      name: 'autoin-wa',
      cwd: path.join(ROOT, 'whatsapp-service'),
      script: 'src/index.js',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      out_file: '/var/log/autoin/wa.log',
      error_file: '/var/log/autoin/wa-err.log',
      merge_logs: true,
    },

    // ── Astro Frontend (preview built output) ─────────────
    {
      name: 'autoin-frontend',
      cwd: path.join(ROOT, 'frontend'),
      // SSR Node standalone server (hasil `npm run build` → dist/server/entry.mjs).
      // Adapter @astrojs/node membaca HOST & PORT dari env.
      script: 'dist/server/entry.mjs',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: '4322',
        // INTERNAL_API_URL: alamat backend server-to-server (proxy BFF, src/pages/api/[...path].ts).
        // Server-only — TIDAK pernah dibakar ke bundle client; browser tak melihat URL ini.
        INTERNAL_API_URL: 'http://127.0.0.1:8001',
        // PUBLIC_API_URL tetap dibakar saat build (npm run build) — kini hanya dipakai untuk
        // redirect OAuth (/auth/google) dan URL tampilan media, bukan untuk panggilan data.
      },
      out_file: '/var/log/autoin/frontend.log',
      error_file: '/var/log/autoin/frontend-err.log',
      merge_logs: true,
    },

    // ── Laravel Scheduler Daemon ──────────────────────────
    {
      name: 'autoin-scheduler',
      cwd: path.join(ROOT, 'backend'),
      script: 'artisan',
      args: 'schedule:work',
      interpreter: 'php',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        APP_ENV: 'production',
      },
      out_file: '/var/log/autoin/scheduler.log',
      error_file: '/var/log/autoin/scheduler-err.log',
      merge_logs: true,
    },
  ],
};
