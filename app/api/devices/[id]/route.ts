import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const device = await prisma.device.findUnique({
    where: { id: id },
    include: {
      tags: true,
      vlans: true,
      services: { select: { id: true, name: true, status: true, url: true } },
      backupJobs: true,
      attachments: true,
      virtualHosts: { select: { id: true, name: true, type: true, status: true } },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(device)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const current = await prisma.device.findUnique({ where: { id: id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.device.update({
    where: { id: id },
    data: {
      name: body.name?.trim() ?? current.name,
      brand: 'brand' in body ? (body.brand || null) : current.brand,
      model: 'model' in body ? (body.model || null) : current.model,
      hostname: 'hostname' in body ? (body.hostname || null) : current.hostname,
      managementIp: 'managementIp' in body ? (body.managementIp || null) : current.managementIp,
      mainIp: 'mainIp' in body ? (body.mainIp || null) : current.mainIp,
      macAddress: 'macAddress' in body ? (body.macAddress || null) : current.macAddress,
      serialNumber: 'serialNumber' in body ? (body.serialNumber || null) : current.serialNumber,
      location: 'location' in body ? (body.location || null) : current.location,
      rackRoom: 'rackRoom' in body ? (body.rackRoom || null) : current.rackRoom,
      role: 'role' in body ? (body.role || null) : current.role,
      os: 'os' in body ? (body.os || null) : current.os,
      ports: 'ports' in body ? (body.ports || null) : current.ports,
      status: body.status ?? current.status,
      favourite: typeof body.favourite === 'boolean' ? body.favourite : current.favourite,
      archived: typeof body.archived === 'boolean' ? body.archived : current.archived,
      notes: 'notes' in body ? (body.notes || null) : current.notes,
      setupNotes: 'setupNotes' in body ? (body.setupNotes || null) : current.setupNotes,
      troubleshootingNotes: 'troubleshootingNotes' in body ? (body.troubleshootingNotes || null) : current.troubleshootingNotes,
      extraInfo: 'extraInfo' in body ? (body.extraInfo || null) : current.extraInfo,
    },
  })

  await createAuditLog('UPDATE', 'Device', updated.id, updated.name, { deviceId: updated.id })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const device = await prisma.device.findUnique({ where: { id: id } })
  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (new URL(req.url).searchParams.get('permanent') === 'true') {
    await prisma.$transaction([
      prisma.service.updateMany({ where: { deviceId: id }, data: { deviceId: null } }),
      prisma.virtualHost.updateMany({ where: { deviceId: id }, data: { deviceId: null } }),
      prisma.backupJob.updateMany({ where: { deviceId: id }, data: { deviceId: null } }),
      prisma.attachment.deleteMany({ where: { deviceId: id } }),
      prisma.auditLog.deleteMany({ where: { deviceId: id } }),
      prisma.device.delete({ where: { id } }),
    ])
    return NextResponse.json({ ok: true })
  }

  await prisma.device.update({ where: { id: id }, data: { archived: true } })
  await createAuditLog('ARCHIVE', 'Device', device.id, device.name, { deviceId: device.id })
  return NextResponse.json({ ok: true })
}
