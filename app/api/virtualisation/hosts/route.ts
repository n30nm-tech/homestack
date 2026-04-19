import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { VirtualHostType, Status } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const archived = req.nextUrl.searchParams.get('archived') === 'true'

  const hosts = await prisma.virtualHost.findMany({
    where: { archived },
    include: {
      tags: true,
      device: { select: { id: true, name: true } },
      vms: { select: { id: true, name: true, status: true } },
      services: { select: { id: true, name: true, status: true, ctid: true } },
    },
    orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
  })

  return NextResponse.json(hosts)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (!body.type) return NextResponse.json({ error: 'Type is required.' }, { status: 400 })

  const host = await prisma.virtualHost.create({
    data: {
      name: body.name.trim(),
      type: body.type as VirtualHostType,
      hostname: body.hostname || null,
      ip: body.ip || null,
      os: body.os || null,
      version: body.version || null,
      status: (body.status as Status) || 'UNKNOWN',
      deviceId: body.deviceId || null,
    },
  })

  await createAuditLog('CREATE', 'VirtualHost', host.id, host.name, { virtualHostId: host.id })
  return NextResponse.json(host, { status: 201 })
}
