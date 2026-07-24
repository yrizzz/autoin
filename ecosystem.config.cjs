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
      max_memory_restart: '150M',
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
      max_memory_restart: '450M',
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
      script: 'node_modules/.bin/astro',
      args: 'preview --port 4322 --host 0.0.0.0',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: '/var/log/autoin/frontend.log',
      error_file: '/var/log/autoin/frontend-err.log',
      merge_logs: true,
    },
  ],
};
