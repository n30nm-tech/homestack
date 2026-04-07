import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { Status, DeviceType } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const archived = req.nextUrl.searchParams.get('archived') === 'true'

  const devices = await prisma.device.findMany({
    where: { archived },
    include: { tags: true, vlans: { select: { id: true, name: true, vlanId: true } } },
    orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
  })

  return NextResponse.json(devices)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (!body.type) return NextResponse.json({ error: 'Device type is required.' }, { status: 400 })

  const device = await prisma.device.create({
    data: {
      name: body.name.trim(),
      type: body.type as DeviceType,
      brand: body.brand || null,
      model: body.model || null,
      hostname: body.hostname || null,
      managementIp: body.managementIp || null,
      mainIp: body.mainIp || null,
      macAddress: body.macAddress || null,
      serialNumber: body.serialNumber || null,
      location: body.location || null,
      rackRoom: body.rackRoom || null,
      role: body.role || null,
      os: body.os || null,
      status: (body.status as Status) || 'UNKNOWN',
    },
  })

  await createAuditLog('CREATE', 'Device', device.id, device.name, { deviceId: device.id })

  return NextResponse.json(device, { status: 201 })
}
