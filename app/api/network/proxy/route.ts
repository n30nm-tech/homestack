import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archived = req.nextUrl.searchParams.get('archived') === 'true'
  const proxies = await prisma.reverseProxy.findMany({ where: { archived }, include: { service: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } })
  return NextResponse.json(proxies)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  const proxy = await prisma.reverseProxy.create({
    data: {
      name: body.name.trim(),
      domain: body.domain || null,
      serviceId: body.serviceId || null,
      targetIp: body.targetIp || null,
      targetPort: body.targetPort ? parseInt(body.targetPort) : null,
      ssl: body.ssl !== false,
      notes: body.notes || null,
    },
  })
  await createAuditLog('CREATE', 'ReverseProxy', proxy.id, proxy.name, { reverseProxyId: proxy.id })
  return NextResponse.json(proxy, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'ID required.' }, { status: 400 })
  const updated = await prisma.reverseProxy.update({
    where: { id: body.id },
    data: {
      name: body.name || undefined,
      domain: 'domain' in body ? (body.domain || null) : undefined,
      serviceId: 'serviceId' in body ? (body.serviceId || null) : undefined,
      targetIp: 'targetIp' in body ? (body.targetIp || null) : undefined,
      targetPort: 'targetPort' in body ? (body.targetPort ? parseInt(body.targetPort) : null) : undefined,
      ssl: typeof body.ssl === 'boolean' ? body.ssl : undefined,
      notes: 'notes' in body ? (body.notes || null) : undefined,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await prisma.reverseProxy.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}
