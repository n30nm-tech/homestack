import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DAY  = 24 * 60 * 60 * 1000
const NOW  = () => new Date()
const AGO  = (ms: number) => new Date(Date.now() - ms)

function uptimePct(checks: { online: boolean }[]): number | null {
  if (checks.length === 0) return null
  return Math.round((checks.filter(c => c.online).length / checks.length) * 1000) / 10
}

// Build a 24-slot sparkline (each slot = 1 hour of the last 24h)
function buildSparkline(checks: { online: boolean; checkedAt: Date }[]): ('up' | 'down' | 'none')[] {
  const slots: ('up' | 'down' | 'none')[] = Array(24).fill('none')
  const now = Date.now()
  for (let i = 0; i < 24; i++) {
    const slotEnd   = now - i * 60 * 60 * 1000
    const slotStart = slotEnd - 60 * 60 * 1000
    const inSlot = checks.filter(c => {
      const t = c.checkedAt.getTime()
      return t >= slotStart && t < slotEnd
    })
    if (inSlot.length === 0) { slots[23 - i] = 'none'; continue }
    const pct = inSlot.filter(c => c.online).length / inSlot.length
    slots[23 - i] = pct >= 0.5 ? 'up' : 'down'
  }
  return slots
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since24h = AGO(DAY)
  const since7d  = AGO(7 * DAY)

  const [services, devices] = await Promise.all([
    prisma.service.findMany({
      where: {
        archived: false,
        OR: [{ url: { not: null } }, { ip: { not: null } }],
      },
      select: {
        id: true, name: true, url: true, ip: true, port: true, icon: true, category: true,
        uptimeChecks: {
          where:   { checkedAt: { gte: since7d } },
          orderBy: { checkedAt: 'desc' },
          select:  { online: true, responseMs: true, checkedAt: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.device.findMany({
      where: {
        archived: false,
        OR: [{ managementIp: { not: null } }, { mainIp: { not: null } }],
      },
      select: {
        id: true, name: true, type: true, managementIp: true, mainIp: true,
        uptimeChecks: {
          where:   { checkedAt: { gte: since7d } },
          orderBy: { checkedAt: 'desc' },
          select:  { online: true, responseMs: true, checkedAt: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  function summarise(checks: { online: boolean; responseMs: number | null; checkedAt: Date }[]) {
    const latest     = checks[0] ?? null
    const checks24h  = checks.filter(c => c.checkedAt >= since24h)
    const avgMs      = checks24h.filter(c => c.responseMs != null && c.online)
                         .reduce((s, c, _, a) => s + (c.responseMs ?? 0) / a.length, 0)
    return {
      online:     latest?.online ?? null,
      responseMs: latest?.responseMs ?? null,
      avgMs:      checks24h.length ? Math.round(avgMs) : null,
      checkedAt:  latest?.checkedAt ?? null,
      uptime24h:  uptimePct(checks24h),
      uptime7d:   uptimePct(checks),
      sparkline:  buildSparkline(checks),
    }
  }

  return NextResponse.json({
    services: services.map((s: any) => ({ id: s.id, name: s.name, url: s.url, icon: s.icon, category: s.category, ...summarise(s.uptimeChecks ?? []) })),
    devices:  devices.map((d: any)  => ({ id: d.id, name: d.name, type: d.type, ip: d.managementIp ?? d.mainIp, ...summarise(d.uptimeChecks ?? []) })),
    lastRun:  await (prisma as any).uptimeCheck.findFirst({ orderBy: { checkedAt: 'desc' }, select: { checkedAt: true } }).then((r: any) => r?.checkedAt ?? null),
  })
}
