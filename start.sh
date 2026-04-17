#!/bin/bash
set -e

cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

print() { echo -e "${GREEN}▶${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
fail()  { echo -e "${RED}✗${NC}  $1"; exit 1; }
header(){ echo -e "\n${BOLD}$1${NC}"; }

header "HomeStack"
echo "  Self-hosted homelab management"
echo ""

# ── Check Node ────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install from https://nodejs.org (v20+)"
fi
NODE_VER=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  fail "Node.js v18+ required (found v$NODE_VER)"
fi

# ── Check PostgreSQL ──────────────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  warn "psql not found — trying to start Docker-based Postgres instead..."
  USE_DOCKER_DB=1
else
  USE_DOCKER_DB=0
fi

# ── .env setup ────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  print ".env created from .env.example"
fi

# ── Dependencies ──────────────────────────────────────────────────────────────
if [ ! -d node_modules ]; then
  print "Installing dependencies…"
  npm install --silent
else
  print "Dependencies OK"
fi

# ── Start Postgres (if using Docker for DB) ───────────────────────────────────
if [ "$USE_DOCKER_DB" -eq 1 ]; then
  if ! command -v docker &>/dev/null; then
    fail "Neither psql nor docker found.\n  Option A: Install PostgreSQL → https://postgresapp.com\n  Option B: Install Docker → https://docker.com"
  fi

  print "Starting PostgreSQL via Docker…"
  docker run -d \
    --name homestack-db \
    -e POSTGRES_DB=homestack \
    -e POSTGRES_USER=homestack \
    -e POSTGRES_PASSWORD=homestack \
    -p 5432:5432 \
    --restart unless-stopped \
    postgres:16-alpine \
    2>/dev/null || docker start homestack-db 2>/dev/null || true

  print "Waiting for Postgres to be ready…"
  for i in $(seq 1 20); do
    if docker exec homestack-db pg_isready -U homestack -q 2>/dev/null; then
      break
    fi
    sleep 1
    [ "$i" -eq 20 ] && fail "Postgres did not start in time"
  done
  print "Postgres ready"

  # Ensure .env uses docker db
  grep -q "DATABASE_URL" .env || echo 'DATABASE_URL="postgresql://homestack:homestack@localhost:5432/homestack"' >> .env
  sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL="postgresql://homestack:homestack@localhost:5432/homestack"|' .env && rm -f .env.bak
else
  # Use local postgres — don't overwrite DATABASE_URL if already set
  if ! grep -q "^DATABASE_URL=" .env 2>/dev/null || grep -q 'DATABASE_URL=""' .env 2>/dev/null; then
    echo 'DATABASE_URL="postgresql://homestack:homestack@localhost:5432/homestack"' >> .env
  fi
  sudo -u postgres psql -c "CREATE DATABASE homestack;" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE USER homestack WITH PASSWORD 'homestack';" 2>/dev/null || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE homestack TO homestack;" 2>/dev/null || true
  sudo -u postgres psql -c "ALTER DATABASE homestack OWNER TO homestack;" 2>/dev/null || true
  print "Using local PostgreSQL"
fi

# ── Generate Prisma client ─────────────────────────────────────────────────────
print "Generating Prisma client…"
npx prisma generate 2>&1 | grep -v "tip\|Tip\|prism\|Prisma schema\|Environment" || true

# ── Database migration ────────────────────────────────────────────────────────
print "Applying database schema…"
npx prisma db push --skip-generate 2>&1 | grep -E "(sync|error|Error)" || true

# ── Seed demo data (only if DB is empty) ─────────────────────────────────────
USER_COUNT=$(psql "$DATABASE_URL" -tAc 'SELECT count(*) FROM "User";' 2>/dev/null || echo "0")
if [ "$USER_COUNT" = "0" ]; then
  print "Seeding demo data…"
  npx tsx prisma/seed.ts 2>&1 | grep -E "(✅|❌|Login|🔐|Seed)" || true
else
  print "Database has data — skipping seed (run 'npx tsx prisma/seed.ts' manually to reseed)"
fi

# ── Build (production) ───────────────────────────────────────────────────────
print "Building app…"
npm run build

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✓ HomeStack is ready${NC}"
echo ""
echo -e "  ${BOLD}URL:${NC}      http://localhost:3000"
echo -e "  ${BOLD}Login:${NC}    admin@homestack.local"
echo -e "  ${BOLD}Password:${NC} homestack"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop"
echo ""

# ── Free port 3000 ───────────────────────────────────────────────────────────
fuser -k 3000/tcp 2>/dev/null || true

# ── Start production server ───────────────────────────────────────────────────
npm start
