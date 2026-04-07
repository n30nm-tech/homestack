import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const host = await prisma.virtualHost.findUnique({
    where: { id: id },
    include: {
      tags: true,
      device: true,
      vms: { include: { services: { select: { id: true, name: true, status: true } } } },
      lxcs: { include: { services: { select: { id: true, name: true, status: true } } } },
      dockerHosts: { include: { services: { select: { id: true, name: true, status: true } } } },
      services: { select: { id: true, name: true, status: true } },
      backupJobs: true,
      attachments: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!host) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(host)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const current = await prisma.virtualHost.findUnique({ where: { id: id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.virtualHost.update({
    where: { id: id },
    data: {
      name: body.name?.trim() ?? current.name,
      hostname: 'hostname' in body ? (body.hostname || null) : current.hostname,
      ip: 'ip' in body ? (body.ip || null) : current.ip,
      os: 'os' in body ? (body.os || null) : current.os,
      version: 'version' in body ? (body.version || null) : current.version,
      cpu: 'cpu' in body ? (body.cpu ? parseInt(body.cpu) : null) : current.cpu,
      ram: 'ram' in body ? (body.ram ? parseInt(body.ram) : null) : current.ram,
      storage: 'storage' in body ? (body.storage || null) : current.storage,
      status: body.status ?? current.status,
      favourite: typeof body.favourite === 'boolean' ? body.favourite : current.favourite,
      archived: typeof body.archived === 'boolean' ? body.archived : current.archived,
      deviceId: 'deviceId' in body ? (body.deviceId || null) : current.deviceId,
      notes: 'notes' in body ? (body.notes || null) : current.notes,
      setupNotes: 'setupNotes' in body ? (body.setupNotes || null) : current.setupNotes,
      troubleshootingNotes: 'troubleshootingNotes' in body ? (body.troubleshootingNotes || null) : current.troubleshootingNotes,
      extraInfo: 'extraInfo' in body ? (body.extraInfo || null) : current.extraInfo,
    },
  })

  await createAuditLog('UPDATE', 'VirtualHost', updated.id, updated.name, { virtualHostId: updated.id })
  return NextResponse.json(updated)
}
