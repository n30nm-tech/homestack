import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkService, checkDevice } from '@/lib/uptime'

// Protect with a shared secret so only the cron job can trigger this
function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // no secret set — open (dev/simple setups)
  const header = req.headers.get('x-cron-secret')
  return header === secret
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Load everything that has a checkable endpoint
  const [services, devices] = await Promise.all([
    prisma.service.findMany({
      where: {
        archived: false,
        OR: [
          { url: { not: null } },
          { ip:  { not: null } },
        ],
      },
      select: { id: true, url: true, ip: true, port: true },
    }),
    prisma.device.findMany({
      where: {
        archived: false,
        OR: [
          { managementIp: { not: null } },
          { mainIp:       { not: null } },
        ],
      },
      select: { id: true, managementIp: true, mainIp: true },
    }),
  ])

  // Run all checks in parallel
  const serviceChecks = services.map(async svc => {
    const result = await checkService(svc)
    return { serviceId: svc.id, ...result }
  })

  const deviceChecks = devices.map(async dev => {
    const ip = dev.managementIp ?? dev.mainIp!
    const result = await checkDevice(ip)
    return { deviceId: dev.id, ...result }
  })

  const [serviceResults, deviceResults] = await Promise.all([
    Promise.all(serviceChecks),
    Promise.all(deviceChecks),
  ])

  // Store all results in one transaction
  const now = new Date()
  await prisma.$transaction([
    ...serviceResults.map(r =>
      prisma.uptimeCheck.create({
        data: { serviceId: r.serviceId, online: r.online, responseMs: r.responseMs, checkedAt: now },
      })
    ),
    ...deviceResults.map(r =>
      prisma.uptimeCheck.create({
        data: { deviceId: r.deviceId, online: r.online, responseMs: r.responseMs, checkedAt: now },
      })
    ),
    // Prune checks older than 30 days
    prisma.uptimeCheck.deleteMany({
      where: { checkedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
  ])

  return NextResponse.json({
    ok: true,
    checked: { services: serviceResults.length, devices: deviceResults.length },
    online: {
      services: serviceResults.filter(r => r.online).length,
      devices:  deviceResults.filter(r => r.online).length,
    },
  })
}
