#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

log() { echo -e "${CYAN}[AUTOIN]${RESET} $1"; }
ok()  { echo -e "${GREEN}[OK]${RESET} $1"; }
warn(){ echo -e "${YELLOW}[!]${RESET} $1"; }
err() { echo -e "${RED}[ERROR]${RESET} $1"; }

cleanup() {
  echo ""
  log "Menghentikan semua service..."
  [ -n "$PID_BACKEND"  ] && kill "$PID_BACKEND"  2>/dev/null
  [ -n "$PID_FRONTEND" ] && kill "$PID_FRONTEND" 2>/dev/null
  [ -n "$PID_WA"       ] && kill "$PID_WA"       2>/dev/null
  ok "Semua service dihentikan."
  exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${CYAN}  AUTOIN — Multi-Channel Broadcast Platform${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ── Bersihkan proses lama ─────────────────────────────────
for PORT in 8001 4321 3001; do
  OLD_PID=$(lsof -ti tcp:$PORT 2>/dev/null)
  if [ -n "$OLD_PID" ]; then
    kill "$OLD_PID" 2>/dev/null
  fi
done
sleep 1

# ── Backend ──────────────────────────────────────────────
log "Memulai Backend (Laravel)..."

cd "$ROOT/backend"

if [ ! -f ".env" ]; then
  cp .env.example .env
  php artisan key:generate --quiet
  warn ".env dibuat dari .env.example"
fi

php artisan migrate --force --quiet 2>/dev/null
php artisan config:clear --quiet 2>/dev/null

export PHP_CLI_SERVER_WORKERS=5
php artisan serve --port=8001 --quiet > /tmp/autoin-backend.log 2>&1 &
PID_BACKEND=$!

sleep 2
if kill -0 "$PID_BACKEND" 2>/dev/null; then
  ok "Backend berjalan → http://localhost:8001"
else
  err "Backend gagal start. Cek /tmp/autoin-backend.log"
  cat /tmp/autoin-backend.log | tail -5
fi

# ── Frontend ─────────────────────────────────────────────
log "Memulai Frontend (Astro)..."

cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  log "Install dependencies frontend..."
  npm install --silent
fi

npm run dev -- --host 0.0.0.0 > /tmp/autoin-frontend.log 2>&1 &
PID_FRONTEND=$!

sleep 3
if kill -0 "$PID_FRONTEND" 2>/dev/null; then
  ok "Frontend berjalan → http://localhost:4321"
else
  err "Frontend gagal start. Cek /tmp/autoin-frontend.log"
  cat /tmp/autoin-frontend.log | tail -5
fi

# ── WhatsApp Service ─────────────────────────────────────
log "Memulai WhatsApp Service (Baileys)..."

cd "$ROOT/whatsapp-service"

if [ ! -d "node_modules" ]; then
  log "Install dependencies WhatsApp Service..."
  npm install --silent
fi

node --watch src/index.js > /tmp/autoin-wa.log 2>&1 &
PID_WA=$!
sleep 3
if curl -s http://localhost:3001/health | grep -q "ok"; then
  ok "WhatsApp Service berjalan → http://localhost:3001"
else
  warn "WhatsApp Service gagal start. Cek /tmp/autoin-wa.log"
  cat /tmp/autoin-wa.log | tail -5
  PID_WA=""
fi

# ── Summary ───────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${GREEN}Semua service siap!${RESET}"
echo ""
echo -e "  🌐 App       → ${CYAN}http://localhost:4321${RESET}"
echo -e "  📡 Dashboard → ${CYAN}http://localhost:4321/dashboard${RESET}"
echo -e "  🔧 API       → ${CYAN}http://localhost:8001/api${RESET}"
[ -n "$PID_WA" ] && \
echo -e "  💬 WhatsApp  → ${CYAN}http://localhost:3001${RESET}"
echo ""
echo -e "  Tekan ${YELLOW}Ctrl+C${RESET} untuk menghentikan semua service"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ── Logs ─────────────────────────────────────────────────
log "Menampilkan log backend (Ctrl+C untuk stop)..."
echo ""
tail -f /tmp/autoin-backend.log /tmp/autoin-frontend.log 2>/dev/null
