import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, diffRecords } from '@/lib/audit'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const host = await prisma.dockerHost.findUnique({
    where: { id: id },
    include: { tags: true, vm: { include: { host: true } }, lxc: { include: { host: true } }, virtualHost: true, services: { select: { id: true, name: true, status: true, url: true, category: true } }, backupJobs: true, attachments: true, auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  if (!host) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(host)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const current = await prisma.dockerHost.findUnique({ where: { id: id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.dockerHost.update({
    where: { id: id },
    data: {
      name: body.name?.trim() ?? current.name,
      hostname: 'hostname' in body ? (body.hostname || null) : current.hostname,
      ip: 'ip' in body ? (body.ip || null) : current.ip,
      status: body.status ?? current.status,
      favourite: typeof body.favourite === 'boolean' ? body.favourite : current.favourite,
      archived: typeof body.archived === 'boolean' ? body.archived : current.archived,
      vmId: 'vmId' in body ? (body.vmId || null) : current.vmId,
      lxcId: 'lxcId' in body ? (body.lxcId || null) : current.lxcId,
      virtualHostId: 'virtualHostId' in body ? (body.virtualHostId || null) : current.virtualHostId,
      notes:                'notes'                in body ? (body.notes                || null) : current.notes,
      setupNotes:           'setupNotes'           in body ? (body.setupNotes           || null) : current.setupNotes,
      troubleshootingNotes: 'troubleshootingNotes' in body ? (body.troubleshootingNotes || null) : current.troubleshootingNotes,
      extraInfo:            'extraInfo'            in body ? (body.extraInfo            || null) : current.extraInfo,
    },
  })
  const changes_dh = diffRecords(current as Record<string, unknown>, updated as Record<string, unknown>)
  await createAuditLog('UPDATE', 'DockerHost', updated.id, updated.name, { dockerHostId: updated.id }, Object.keys(changes_dh).length ? changes_dh : undefined)
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const host = await prisma.dockerHost.findUnique({ where: { id } })
  if (!host) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (new URL(req.url).searchParams.get('permanent') === 'true') {
    await prisma.$transaction([
      prisma.service.updateMany({ where: { dockerHostId: id }, data: { dockerHostId: null } }),
      prisma.backupJob.updateMany({ where: { dockerHostId: id }, data: { dockerHostId: null } }),
      prisma.attachment.deleteMany({ where: { dockerHostId: id } }),
      prisma.auditLog.deleteMany({ where: { dockerHostId: id } }),
      prisma.dockerHost.delete({ where: { id } }),
    ])
    return NextResponse.json({ ok: true })
  }

  const updated = await prisma.dockerHost.update({ where: { id }, data: { archived: true } })
  await createAuditLog('ARCHIVE', 'DockerHost', updated.id, updated.name, { dockerHostId: updated.id })
  return NextResponse.json({ ok: true })
}
