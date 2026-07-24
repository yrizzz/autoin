#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Autoin — VPS All-in-One Deploy Script
#  Pertama kali: bash deploy.sh --setup
#  Update biasa: bash deploy.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CYAN="\e[36m"; GREEN="\e[32m"; YELLOW="\e[33m"; RED="\e[31m"; RESET="\e[0m"
BOLD="\e[1m"

log()  { echo -e "${CYAN}▶${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}!${RESET} $*"; }
err()  { echo -e "${RED}✗${RESET} $*"; exit 1; }
sep()  { echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }

SETUP_MODE=false
[[ "${1:-}" == "--setup" ]] && SETUP_MODE=true

sep
echo -e "  ${BOLD}Autoin Deploy${RESET} — $(date '+%Y-%m-%d %H:%M:%S')"
sep

# ─────────────────────────────────────────────────────────
#  MODE: SETUP (jalankan sekali saat pertama kali di VPS)
# ─────────────────────────────────────────────────────────
if $SETUP_MODE; then
  log "Mode SETUP — install semua dependencies..."

  # Node.js 20
  if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]]; then
    log "Install Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ok "Node.js $(node -v) installed"
  else
    ok "Node.js $(node -v) already installed"
  fi

  # PHP 8.2
  if ! command -v php &>/dev/null; then
    log "Install PHP 8.2..."
    sudo apt-get install -y software-properties-common
    sudo add-apt-repository ppa:ondrej/php -y
    sudo apt-get update -q
    sudo apt-get install -y php8.2 php8.2-cli php8.2-mysql php8.2-curl \
      php8.2-mbstring php8.2-xml php8.2-zip php8.2-bcmath php8.2-gd
    ok "PHP $(php -v | head -1) installed"
  else
    ok "PHP $(php -v | head -1 | awk '{print $2}') already installed"
  fi

  # Composer
  if ! command -v composer &>/dev/null; then
    log "Install Composer..."
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    ok "Composer installed"
  else
    ok "Composer $(composer -V --no-ansi | head -1 | awk '{print $3}') already installed"
  fi

  # PM2
  if ! command -v pm2 &>/dev/null; then
    log "Install PM2..."
    sudo npm install -g pm2 --quiet
    ok "PM2 installed"
  else
    ok "PM2 already installed"
  fi

  # FFmpeg
  if ! command -v ffmpeg &>/dev/null; then
    log "Install FFmpeg..."
    sudo apt-get update -q
    sudo apt-get install -y ffmpeg
    ok "FFmpeg installed"
  else
    ok "FFmpeg already installed"
  fi

  # Log directory
  sudo mkdir -p /var/log/autoin
  sudo chown -R "$USER":"$USER" /var/log/autoin
  ok "Log directory /var/log/autoin ready"

  # Setup backend .env
  if [ ! -f "$ROOT/backend/.env" ]; then
    warn "backend/.env tidak ada — copy dari .env.example"
    cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
    cd "$ROOT/backend" && php artisan key:generate --quiet
    warn "Edit $ROOT/backend/.env sebelum lanjut (DB, Google OAuth, dll)"
    echo ""
    echo -e "  ${YELLOW}Edit .env lalu jalankan lagi: bash deploy.sh${RESET}"
    exit 0
  fi

  # Setup WA service .env
  if [ ! -f "$ROOT/whatsapp-service/.env" ]; then
    echo "BACKEND_URL=http://localhost:8001" > "$ROOT/whatsapp-service/.env"
    echo "INTERNAL_SECRET=autoin-wa-secret"  >> "$ROOT/whatsapp-service/.env"
    ok "whatsapp-service/.env dibuat"
  fi

  # PM2 startup (auto-restart after reboot)
  pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null | tail -1 | bash 2>/dev/null || true
  ok "PM2 startup configured"
fi

# ─────────────────────────────────────────────────────────
#  DEPLOY (jalankan setiap update)
# ─────────────────────────────────────────────────────────

# 1. Pull latest code & check for changes in whatsapp-service
log "Checking for updates..."
cd "$ROOT"
CHANGED_WA=true
WA_ENV_HASH=""

if [ -f "$ROOT/whatsapp-service/.env" ]; then
  WA_ENV_HASH=$(md5sum "$ROOT/whatsapp-service/.env" 2>/dev/null || sha1sum "$ROOT/whatsapp-service/.env" 2>/dev/null || echo "")
fi

if [ -d "$ROOT/.git" ] && git rev-parse HEAD &>/dev/null; then
  git pull origin main
  
  LAST_WA_COMMIT_FILE="$ROOT/.last_wa_commit"
  CURRENT_WA_COMMIT=$(git log -1 --format="%H" -- whatsapp-service 2>/dev/null || echo "")
  
  if [ -f "$LAST_WA_COMMIT_FILE" ]; then
    LAST_WA_COMMIT=$(cat "$LAST_WA_COMMIT_FILE")
    if [ "$CURRENT_WA_COMMIT" = "$LAST_WA_COMMIT" ]; then
      CHANGED_WA=false
      log "No changes detected in whatsapp-service source code."
    else
      log "Changes detected in whatsapp-service source code."
    fi
  else
    log "No previous deploy record found. Forcing whatsapp-service restart."
  fi
  echo "$CURRENT_WA_COMMIT" > "$LAST_WA_COMMIT_FILE"
else
  git pull origin main
fi
ok "Code up to date"

# 2. Backend — auto-configure production .env
log "Backend — install & migrate..."
cd "$ROOT/backend"

# Ensure all required Laravel storage subdirectories exist
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/framework/cache
mkdir -p storage/app/public
mkdir -p storage/logs
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

composer install --no-dev --optimize-autoloader --no-interaction --quiet
php artisan migrate --force --quiet

# Auto-update production URLs in .env
BACKEND_PROD_URL="https://api.autoin.my.id"
FRONTEND_PROD_URL="https://autoin.my.id"
GOOGLE_CB_URL="${BACKEND_PROD_URL}/auth/google/callback"

_env_set() {
  local key="$1" val="$2" file="${3:-$ROOT/backend/.env}"
  touch "$file"
  if grep -qE "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

_env_set APP_ENV       "production"
_env_set APP_DEBUG     "false"
_env_set DB_HOST       "127.0.0.1"
_env_set APP_URL       "$BACKEND_PROD_URL"
_env_set FRONTEND_URL  "$FRONTEND_PROD_URL"
_env_set GOOGLE_REDIRECT_URI "$GOOGLE_CB_URL"
_env_set WHATSAPP_SERVICE_URL "http://127.0.0.1:3001"
_env_set WHATSAPP_SERVICE_SECRET "autoin-wa-secret"
_env_set INTERNAL_SECRET "autoin-wa-secret"

# Auto-update WA service .env to point to internal Laravel host (localhost/127.0.0.1:8001 is much faster/safer than public proxy)
_env_set BACKEND_URL   "http://127.0.0.1:8001" "$ROOT/whatsapp-service/.env"
_env_set INTERNAL_SECRET "autoin-wa-secret" "$ROOT/whatsapp-service/.env"

php artisan config:cache --quiet
php artisan route:cache --quiet
php artisan view:cache --quiet
ok "Backend ready (APP_URL=${BACKEND_PROD_URL})"

# 3. Frontend — build with correct API URL baked in
log "Frontend — build..."
cd "$ROOT/frontend"
npm ci --silent
PUBLIC_API_URL="$BACKEND_PROD_URL" npm run build 2>/dev/null || { warn "Build warning, continuing..."; true; }
ok "Frontend built (PUBLIC_API_URL=${BACKEND_PROD_URL})"

# 4. WA Service
log "WA Service — install deps..."
cd "$ROOT/whatsapp-service"
npm ci --silent
ok "WA service ready"

# 5. Pastikan vendor ada sebelum PM2 start
if [ ! -f "$ROOT/backend/vendor/bin/phpunit" ]; then
  log "vendor/ belum ada, jalankan composer install dulu..."
  cd "$ROOT/backend"
  composer install --no-dev --optimize-autoloader --no-interaction
  ok "composer install selesai"
fi

# 6. Restart via PM2
log "Restart semua service via PM2..."
cd "$ROOT"

# Check if whatsapp-service/.env was changed during this deploy
if [ -f "$ROOT/whatsapp-service/.env" ]; then
  NEW_WA_ENV_HASH=$(md5sum "$ROOT/whatsapp-service/.env" 2>/dev/null || sha1sum "$ROOT/whatsapp-service/.env" 2>/dev/null || echo "")
  if [ "$WA_ENV_HASH" != "$NEW_WA_ENV_HASH" ]; then
    CHANGED_WA=true
    log "Changes detected in whatsapp-service/.env."
  fi
# Delete autoin-scheduler from PM2 if it was previously registered (saves 90%+ CPU compared to schedule:work daemon)
pm2 delete autoin-scheduler 2>/dev/null || true

if [ "$CHANGED_WA" = true ]; then
  log "whatsapp-service has changes or is not running. Restarting all services..."
  pm2 delete ecosystem.config.cjs 2>/dev/null || true
  pm2 start ecosystem.config.cjs
else
  log "whatsapp-service has no changes. Only restarting app services..."
  pm2 restart autoin-backend || pm2 start ecosystem.config.cjs
  pm2 restart autoin-frontend || pm2 start ecosystem.config.cjs
fi

# Ensure Laravel Cron Job is registered in system crontab instead of 24/7 PM2 daemon
CRON_JOB="* * * * * cd $ROOT/backend && php artisan schedule:run >> /dev/null 2>&1"
if ! crontab -l 2>/dev/null | grep -q "autoin/backend"; then
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab - 2>/dev/null || true
  log "Crontab for autoin Laravel scheduler registered."
fi

pm2 save --force >/dev/null
ok "Services started"

# ─────────────────────────────────────────────────────────
#  Summary
# ─────────────────────────────────────────────────────────
sep
echo -e "  ${GREEN}${BOLD}Deploy selesai!${RESET}"
echo ""
pm2 status
echo ""
echo -e "  🌐 Frontend  → ${CYAN}${FRONTEND_PROD_URL}${RESET}"
echo -e "  🔧 API       → ${CYAN}${BACKEND_PROD_URL}${RESET}"
echo -e "  💬 WA Svc    → ${CYAN}http://localhost:3001${RESET} (internal)"
sep
