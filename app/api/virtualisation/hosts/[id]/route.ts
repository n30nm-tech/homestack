import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, diffRecords } from '@/lib/audit'

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
      services: { select: { id: true, name: true, status: true, ctid: true, hasDocker: true } },
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

  const changes_vh = diffRecords(current as Record<string, unknown>, updated as Record<string, unknown>)
  await createAuditLog('UPDATE', 'VirtualHost', updated.id, updated.name, { virtualHostId: updated.id }, Object.keys(changes_vh).length ? changes_vh : undefined)
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const host = await prisma.virtualHost.findUnique({ where: { id }, include: { vms: { select: { id: true } } } })
  if (!host) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (new URL(req.url).searchParams.get('permanent') === 'true') {
    if (host.vms.length > 0)
      return NextResponse.json({ error: 'Archive or delete all VMs on this host first.' }, { status: 409 })
    await prisma.$transaction([
      prisma.service.updateMany({ where: { virtualHostId: id }, data: { virtualHostId: null } }),
      prisma.backupJob.updateMany({ where: { virtualHostId: id }, data: { virtualHostId: null } }),
      prisma.attachment.deleteMany({ where: { virtualHostId: id } }),
      prisma.auditLog.deleteMany({ where: { virtualHostId: id } }),
      prisma.virtualHost.delete({ where: { id } }),
    ])
    return NextResponse.json({ ok: true })
  }

  const updated = await prisma.virtualHost.update({ where: { id }, data: { archived: true } })
  await createAuditLog('ARCHIVE', 'VirtualHost', updated.id, updated.name, { virtualHostId: updated.id })
  return NextResponse.json({ ok: true })
}
