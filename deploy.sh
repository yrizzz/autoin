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

# 1. Pull latest code
log "Git pull..."
cd "$ROOT"
git pull origin main
ok "Code up to date"

# 2. Backend
log "Backend — install & migrate..."
cd "$ROOT/backend"
composer install --no-dev --optimize-autoloader --no-interaction --quiet
php artisan migrate --force --quiet
php artisan config:cache --quiet
php artisan route:cache --quiet
php artisan view:cache --quiet
ok "Backend ready"

# 3. Frontend
log "Frontend — build..."
cd "$ROOT/frontend"
npm ci --silent
npm run build --silent 2>/dev/null || true
ok "Frontend built"

# 4. WA Service
log "WA Service — install deps..."
cd "$ROOT/whatsapp-service"
npm ci --silent
ok "WA service ready"

# 5. Restart via PM2
log "Restart semua service via PM2..."
cd "$ROOT"
if pm2 list 2>/dev/null | grep -q "autoin"; then
  pm2 restart ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save --force >/dev/null
ok "Services restarted"

# ─────────────────────────────────────────────────────────
#  Summary
# ─────────────────────────────────────────────────────────
sep
echo -e "  ${GREEN}${BOLD}Deploy selesai!${RESET}"
echo ""
pm2 status
echo ""
echo -e "  🌐 Frontend  → ${CYAN}http://$(curl -s ifconfig.me 2>/dev/null || echo SERVER_IP):4322${RESET}"
echo -e "  🔧 API       → ${CYAN}http://$(curl -s ifconfig.me 2>/dev/null || echo SERVER_IP):8001${RESET}"
echo -e "  💬 WA Svc    → ${CYAN}http://localhost:3001${RESET} (internal)"
sep
