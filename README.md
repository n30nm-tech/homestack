# HomeStack

A self-hosted homelab management system. Dark-mode-only, Apple-inspired, and designed to be the single source of truth for your homelab.

## Features

- **Dashboard** — favourites-first service overview, system health, recent backups
- **Services** — full service inventory with Docker Compose, env vars, setup steps, reverse proxy config
- **Devices** — physical hardware: firewalls, switches, APs, servers, NAS
- **Virtualisation** — Proxmox/ESXi hosts, VMs, LXCs, Docker hosts with relationship tracking
- **Network** — VLANs, DNS records, reverse proxy entries
- **Backups** — backup job inventory linked to any item
- **Documentation** — standalone docs pages with structured note sections
- **Global search** — instant search across all record types
- **Add New wizard** — guided creation for all item types
- **Export** — Markdown export per page or full homelab handbook
- **Audit trail** — change history on every item
- **Archive/retire** — soft delete by default

---

## Deploy on LXC (recommended)

The easiest way to self-host HomeStack is Docker Compose inside an LXC container.

### Prerequisites

- Proxmox LXC or any Linux container/VM with Docker installed
- At least 512 MB RAM, 2 GB disk

### Install Docker on the LXC

```bash
curl -fsSL https://get.docker.com | sh
```

### Deploy HomeStack

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/homestack.git
cd homestack

# 2. Configure
cp .env.example .env
nano .env   # set NEXTAUTH_SECRET, ADMIN_PASSWORD, POSTGRES_PASSWORD

# 3. Generate a proper secret
openssl rand -base64 32   # paste result into NEXTAUTH_SECRET in .env

# 4. Start
docker compose up -d

# 5. Open
# http://<lxc-ip>:3000
# Login: admin@homestack.local / homestack (or whatever you set)
```

### Access from your network

By default the app listens on port 3000 on all interfaces. To change the port:

```bash
# In .env
PORT=8080
```

Then restart: `docker compose up -d`

### Updates

```bash
git pull
docker compose build
docker compose up -d
```

### Stop / remove

```bash
docker compose down          # stop, keep data
docker compose down -v       # stop + wipe database
```

---

## Development (local Mac/Linux)

```bash
# Prerequisites: Node 20+, PostgreSQL

./start.sh    # installs deps, sets up DB, seeds demo data, starts dev server
# or manually:
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | — |
| `NEXTAUTH_SECRET` | Auth signing secret (`openssl rand -base64 32`) | — |
| `NEXTAUTH_URL` | Public URL of the app | `http://localhost:3000` |
| `ADMIN_EMAIL` | Initial admin login email | `admin@homestack.local` |
| `ADMIN_PASSWORD` | Initial admin login password | `homestack` |
| `POSTGRES_PASSWORD` | Docker Compose DB password | `homestack` |
| `PORT` | Docker host port | `3000` |

---

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui
- PostgreSQL · Prisma ORM
- NextAuth v5 · bcryptjs
- Docker · Docker Compose
