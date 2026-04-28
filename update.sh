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

header "HomeStack — Update"
echo ""

print "Pulling latest changes from GitHub…"
git pull

print "Installing/updating dependencies…"
npm install --silent

print "Regenerating Prisma client…"
npx prisma generate 2>&1 | grep -v "tip\|Tip\|Prisma schema\|Environment" || true

print "Applying any schema changes…"
npx prisma db push --skip-generate 2>&1 | grep -E "(sync|error|Error|successfully)" || true

print "Rebuilding app…"
npm run build

print "Restarting app…"
# Kill any stale next/node processes on port 3000
fuser -k 3000/tcp 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

# Use PM2 if available, otherwise nohup
if command -v pm2 &>/dev/null; then
  pm2 delete homestack 2>/dev/null || true
  pm2 start "npm start" --name homestack --update-env
  pm2 save
else
  nohup npm start > /tmp/homestack.log 2>&1 &
  echo "  Started (PID $!). Logs: tail -f /tmp/homestack.log"
  echo "  Install PM2 for better process management: npm install -g pm2"
fi

echo ""
echo -e "${GREEN}${BOLD}✓ HomeStack updated and running${NC}"
echo ""

BUILD_NUM=$(node -e "const e=require('./next.config.mjs');console.log('')" 2>/dev/null || git rev-list --count HEAD)
HASH=$(git rev-parse --short HEAD)
echo -e "  ${BOLD}Build:${NC}    #${BUILD_NUM} (${HASH})"
echo -e "  ${BOLD}URL:${NC}      http://localhost:3000"
echo ""
