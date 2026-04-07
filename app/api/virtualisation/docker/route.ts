import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { Status } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archived = req.nextUrl.searchParams.get('archived') === 'true'
  const hosts = await prisma.dockerHost.findMany({
    where: { archived },
    include: { tags: true, vm: { select: { id: true, name: true } }, lxc: { select: { id: true, name: true } }, services: { select: { id: true, name: true, status: true } } },
    orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
  })
  return NextResponse.json(hosts)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  const host = await prisma.dockerHost.create({
    data: {
      name: body.name.trim(),
      hostname: body.hostname || null,
      ip: body.ip || null,
      status: (body.status as Status) || 'UNKNOWN',
      vmId: body.vmId || null,
      lxcId: body.lxcId || null,
      virtualHostId: body.virtualHostId || null,
    },
  })
  await createAuditLog('CREATE', 'DockerHost', host.id, host.name, { dockerHostId: host.id })
  return NextResponse.json(host, { status: 201 })
}
