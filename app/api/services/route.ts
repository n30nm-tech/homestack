import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { Status } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const archived = searchParams.get('archived') === 'true'

  const services = await prisma.service.findMany({
    where: { archived },
    include: {
      tags: true,
      device: { select: { id: true, name: true } },
      virtualHost: { select: { id: true, name: true } },
      vm: { select: { id: true, name: true } },
      lxc: { select: { id: true, name: true } },
      dockerHost: { select: { id: true, name: true } },
    },
    orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
  })

  return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const service = await prisma.service.create({
    data: {
      name: body.name.trim(),
      url: body.url || null,
      description: body.description || null,
      ip: body.ip || null,
      port: body.port ? parseInt(body.port) : null,
      category: body.category || null,
      status: (body.status as Status) || 'UNKNOWN',
      icon: body.icon || null,
    },
  })

  await createAuditLog('CREATE', 'Service', service.id, service.name, { serviceId: service.id })

  return NextResponse.json(service, { status: 201 })
}
