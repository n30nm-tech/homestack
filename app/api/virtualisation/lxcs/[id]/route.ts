import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const lxc = await prisma.lXC.findUnique({
    where: { id: id },
    include: { tags: true, host: true, services: { select: { id: true, name: true, status: true, url: true } }, dockerHosts: true, backupJobs: true, attachments: true, auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  if (!lxc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(lxc)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const current = await prisma.lXC.findUnique({ where: { id: id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.lXC.update({
    where: { id: id },
    data: {
      name: body.name?.trim() ?? current.name,
      ctid: 'ctid' in body ? (body.ctid || null) : current.ctid,
      hostname: 'hostname' in body ? (body.hostname || null) : current.hostname,
      ip: 'ip' in body ? (body.ip || null) : current.ip,
      os: 'os' in body ? (body.os || null) : current.os,
      cpu: 'cpu' in body ? (body.cpu ? parseInt(body.cpu) : null) : current.cpu,
      ram: 'ram' in body ? (body.ram ? parseInt(body.ram) : null) : current.ram,
      disk: 'disk' in body ? (body.disk ? parseInt(body.disk) : null) : current.disk,
      status: body.status ?? current.status,
      favourite: typeof body.favourite === 'boolean' ? body.favourite : current.favourite,
      archived: typeof body.archived === 'boolean' ? body.archived : current.archived,
      hostId: body.hostId ?? current.hostId,
      notes: 'notes' in body ? (body.notes || null) : current.notes,
    },
  })
  await createAuditLog('UPDATE', 'LXC', updated.id, updated.name, { lxcId: updated.id })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const updated = await prisma.lXC.update({ where: { id }, data: { archived: true } })
  await createAuditLog('DELETE', 'LXC', updated.id, updated.name, { lxcId: updated.id })
  return NextResponse.json({ ok: true })
}
