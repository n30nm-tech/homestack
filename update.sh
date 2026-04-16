#!/bin/bash
set -e

cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

print() { echo -e "${GREEN}▶${NC} $1"; }
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
npx prisma db push --skip-generate 2>&1 | grep -E "(sync|error|Error)" || true

echo ""
echo -e "${GREEN}${BOLD}✓ HomeStack updated${NC}"
echo ""
echo -e "  Restart the app to apply changes:"
echo -e "  ${BOLD}./start.sh${NC}"
echo ""
