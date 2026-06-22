#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Autoin — VPS Deploy Script
#  Run on server: bash deploy.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CYAN="\e[36m"; GREEN="\e[32m"; YELLOW="\e[33m"; RED="\e[31m"; RESET="\e[0m"

log()  { echo -e "${CYAN}[DEPLOY]${RESET} $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET} $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
err()  { echo -e "${RED}[ERR]${RESET} $*"; exit 1; }

# ── 1. Pull latest code ─────────────────────────────────
log "Pulling latest code from git..."
cd "$ROOT"
git pull origin main || err "git pull failed"
ok "Code updated"

# ── 2. Backend (Laravel) ────────────────────────────────
log "Updating backend dependencies..."
cd "$ROOT/backend"

composer install --no-dev --optimize-autoloader --no-interaction --quiet
php artisan migrate --force --quiet
php artisan config:clear --quiet
php artisan config:cache --quiet
php artisan route:cache --quiet
php artisan view:cache --quiet
ok "Backend ready"

# ── 3. Frontend (Astro) ─────────────────────────────────
log "Building frontend..."
cd "$ROOT/frontend"

npm ci --silent
npm run build
ok "Frontend built"

# ── 4. WhatsApp service ─────────────────────────────────
log "Updating WA service dependencies..."
cd "$ROOT/whatsapp-service"
npm ci --silent
ok "WA service ready"

# ── 5. Restart services via PM2 ─────────────────────────
log "Restarting services..."

if ! command -v pm2 &>/dev/null; then
  warn "PM2 not found, installing globally..."
  npm install -g pm2 --quiet
fi

cd "$ROOT"
pm2 startOrRestart ecosystem.config.cjs --update-env 2>/dev/null || \
  pm2 start ecosystem.config.cjs

pm2 save
ok "Services restarted via PM2"

# ── 6. Done ─────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${GREEN}Deploy selesai!${RESET}"
echo ""
echo -e "  🌐 Frontend  → ${CYAN}http://SERVER_IP:4322${RESET}"
echo -e "  🔧 Backend   → ${CYAN}http://SERVER_IP:8000${RESET}"
echo -e "  💬 WA Svc    → ${CYAN}http://SERVER_IP:3001${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
