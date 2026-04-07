import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const search = { contains: q, mode: 'insensitive' as const }

  const [services, devices, vms, lxcs, virtualHosts, dockerHosts, vlans, dnsRecords, proxies, backups, docs] =
    await Promise.all([
      prisma.service.findMany({
        where: { archived: false, OR: [{ name: search }, { description: search }, { category: search }, { url: search }] },
        select: { id: true, name: true, status: true, category: true },
        take: 5,
      }),
      prisma.device.findMany({
        where: { archived: false, OR: [{ name: search }, { hostname: search }, { brand: search }, { model: search }, { role: search }] },
        select: { id: true, name: true, status: true, type: true },
        take: 5,
      }),
      prisma.vM.findMany({
        where: { archived: false, OR: [{ name: search }, { hostname: search }, { ip: search }] },
        select: { id: true, name: true, status: true, ip: true },
        take: 4,
      }),
      prisma.lXC.findMany({
        where: { archived: false, OR: [{ name: search }, { hostname: search }, { ip: search }] },
        select: { id: true, name: true, status: true, ip: true },
        take: 4,
      }),
      prisma.virtualHost.findMany({
        where: { archived: false, OR: [{ name: search }, { hostname: search }, { ip: search }] },
        select: { id: true, name: true, status: true, type: true },
        take: 3,
      }),
      prisma.dockerHost.findMany({
        where: { archived: false, OR: [{ name: search }, { hostname: search }, { ip: search }] },
        select: { id: true, name: true, status: true, ip: true },
        take: 3,
      }),
      prisma.vLAN.findMany({
        where: { archived: false, OR: [{ name: search }, { subnet: search }, { purpose: search }] },
        select: { id: true, name: true, vlanId: true, subnet: true },
        take: 3,
      }),
      prisma.dNSRecord.findMany({
        where: { archived: false, OR: [{ recordName: search }, { domain: search }, { ip: search }] },
        select: { id: true, recordName: true, domain: true, ip: true },
        take: 3,
      }),
      prisma.reverseProxy.findMany({
        where: { archived: false, OR: [{ name: search }, { domain: search }] },
        select: { id: true, name: true, domain: true },
        take: 3,
      }),
      prisma.backupJob.findMany({
        where: { archived: false, OR: [{ name: search }, { description: search }, { destination: search }] },
        select: { id: true, name: true, status: true, description: true },
        take: 3,
      }),
      prisma.documentationPage.findMany({
        where: { archived: false, OR: [{ title: search }, { content: search }] },
        select: { id: true, title: true },
        take: 3,
      }),
    ])

  const results = [
    ...services.map(s => ({ id: s.id, type: 'service' as const, name: s.name, subtitle: s.category ?? undefined, status: s.status, href: `/services/${s.id}` })),
    ...devices.map(d => ({ id: d.id, type: 'device' as const, name: d.name, subtitle: d.type, status: d.status, href: `/devices/${d.id}` })),
    ...virtualHosts.map(h => ({ id: h.id, type: 'virtualHost' as const, name: h.name, subtitle: h.type, status: h.status, href: `/virtualisation/hosts/${h.id}` })),
    ...vms.map(v => ({ id: v.id, type: 'vm' as const, name: v.name, subtitle: v.ip ?? undefined, status: v.status, href: `/virtualisation/vms/${v.id}` })),
    ...lxcs.map(l => ({ id: l.id, type: 'lxc' as const, name: l.name, subtitle: l.ip ?? undefined, status: l.status, href: `/virtualisation/lxcs/${l.id}` })),
    ...dockerHosts.map(d => ({ id: d.id, type: 'dockerHost' as const, name: d.name, subtitle: d.ip ?? undefined, status: d.status, href: `/virtualisation/docker/${d.id}` })),
    ...vlans.map(v => ({ id: v.id, type: 'vlan' as const, name: `VLAN ${v.vlanId} — ${v.name}`, subtitle: v.subnet ?? undefined, href: `/network` })),
    ...dnsRecords.map(r => ({ id: r.id, type: 'dns' as const, name: `${r.recordName}.${r.domain ?? ''}`, subtitle: r.ip ?? undefined, href: `/network` })),
    ...proxies.map(p => ({ id: p.id, type: 'proxy' as const, name: p.name, subtitle: p.domain ?? undefined, href: `/network` })),
    ...backups.map(b => ({ id: b.id, type: 'backup' as const, name: b.name, subtitle: b.description ?? undefined, href: `/backups/${b.id}` })),
    ...docs.map(d => ({ id: d.id, type: 'doc' as const, name: d.title, href: `/docs/${d.id}` })),
  ]

  return NextResponse.json({ results })
}
