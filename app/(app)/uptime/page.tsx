import { Header } from '@/components/layout/header'
import { UptimeClient } from './uptime-client'

export const metadata = { title: 'Uptime' }

// Always fetch fresh — no caching for this page
export const dynamic = 'force-dynamic'

async function getStatus() {
  // Reuse the same logic as the API but called server-side directly
  const { prisma } = await import('@/lib/prisma')

  const DAY    = 24 * 60 * 60 * 1000
  const since7d = new Date(Date.now() - 7 * DAY)
  const since24h = new Date(Date.now() - DAY)

  function uptimePct(checks: { online: boolean }[]): number | null {
    if (checks.length === 0) return null
    return Math.round((checks.filter(c => c.online).length / checks.length) * 1000) / 10
  }

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
      slots[23 - i] = inSlot.filter(c => c.online).length / inSlot.length >= 0.5 ? 'up' : 'down'
    }
    return slots
  }

  function summarise(checks: { online: boolean; responseMs: number | null; checkedAt: Date }[]) {
    const latest    = checks[0] ?? null
    const checks24h = checks.filter(c => c.checkedAt >= since24h)
    const onlineChecks = checks24h.filter(c => c.responseMs != null && c.online)
    const avgMs = onlineChecks.length
      ? Math.round(onlineChecks.reduce((s, c) => s + (c.responseMs ?? 0), 0) / onlineChecks.length)
      : null
    return {
      online:     latest?.online ?? null,
      responseMs: latest?.responseMs ?? null,
      avgMs,
      checkedAt:  latest?.checkedAt?.toISOString() ?? null,
      uptime24h:  uptimePct(checks24h),
      uptime7d:   uptimePct(checks),
      sparkline:  buildSparkline(checks),
    }
  }

  const [services, devices, lastCheck] = await Promise.all([
    prisma.service.findMany({
      where: { archived: false, OR: [{ url: { not: null } }, { ip: { not: null } }] },
      select: {
        id: true, name: true, url: true, ip: true, port: true, icon: true, category: true,
        uptimeChecks: { where: { checkedAt: { gte: since7d } }, orderBy: { checkedAt: 'desc' }, select: { online: true, responseMs: true, checkedAt: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.device.findMany({
      where: { archived: false, OR: [{ managementIp: { not: null } }, { mainIp: { not: null } }] },
      select: {
        id: true, name: true, type: true, managementIp: true, mainIp: true,
        uptimeChecks: { where: { checkedAt: { gte: since7d } }, orderBy: { checkedAt: 'desc' }, select: { online: true, responseMs: true, checkedAt: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.uptimeCheck.findFirst({ orderBy: { checkedAt: 'desc' }, select: { checkedAt: true } }),
  ])

  return {
    services: services.map((s: any) => ({ id: s.id, name: s.name, url: s.url, icon: s.icon, category: s.category, ...summarise(s.uptimeChecks ?? []) })),
    devices:  devices.map((d: any)  => ({ id: d.id, name: d.name, type: d.type, ip: d.managementIp ?? d.mainIp, ...summarise(d.uptimeChecks ?? []) })),
    lastRun:  lastCheck?.checkedAt.toISOString() ?? null,
  }
}

export default async function UptimePage() {
  const initial = await getStatus()
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Uptime" description="Live status and history for services and devices" />
      <div className="page-container animate-fade-in">
        <UptimeClient initial={initial} />
      </div>
    </div>
  )
}
