import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, diffRecords } from '@/lib/audit'
import { Status } from '@prisma/client'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = await prisma.service.findUnique({
    where: { id: id },
    include: {
      tags: true,
      device: true,
      virtualHost: true,
      vm: { include: { host: true } },
      dnsRecords: true,
      reverseProxies: true,
      backupJobs: true,
      attachments: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!service) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(service)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const current = await prisma.service.findUnique({ where: { id: id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.service.update({
    where: { id: id },
    data: {
      name: body.name?.trim() ?? current.name,
      url: 'url' in body ? (body.url || null) : current.url,
      description: 'description' in body ? (body.description || null) : current.description,
      ip: 'ip' in body ? (body.ip || null) : current.ip,
      port: 'port' in body ? (body.port ? parseInt(body.port) : null) : current.port,
      category: 'category' in body ? (body.category || null) : current.category,
      status: (body.status as Status) ?? current.status,
      favourite: typeof body.favourite === 'boolean' ? body.favourite : current.favourite,
      archived: typeof body.archived === 'boolean' ? body.archived : current.archived,
      icon: 'icon' in body ? (body.icon || null) : current.icon,
      containerId: 'containerId' in body ? (body.containerId || null) : current.containerId,
      hasDocker: typeof body.hasDocker === 'boolean' ? body.hasDocker : current.hasDocker,
      deviceId: 'deviceId' in body ? (body.deviceId || null) : current.deviceId,
      virtualHostId: 'virtualHostId' in body ? (body.virtualHostId || null) : current.virtualHostId,
      vmId: 'vmId' in body ? (body.vmId || null) : current.vmId,
      containerImage:  'containerImage'  in body ? (body.containerImage  || null) : current.containerImage,
      stackFolder:     'stackFolder'     in body ? (body.stackFolder     || null) : current.stackFolder,
      composeFilePath: 'composeFilePath' in body ? (body.composeFilePath || null) : current.composeFilePath,
      bindMounts:      'bindMounts'      in body ? (body.bindMounts      || null) : current.bindMounts,
      dockerCompose: 'dockerCompose' in body ? (body.dockerCompose || null) : current.dockerCompose,
      envVars: 'envVars' in body ? (body.envVars || null) : current.envVars,
      setupSteps: 'setupSteps' in body ? (body.setupSteps || null) : current.setupSteps,
      runCommands: 'runCommands' in body ? (body.runCommands || null) : current.runCommands,
      reverseProxyConfig: 'reverseProxyConfig' in body ? (body.reverseProxyConfig || null) : current.reverseProxyConfig,
      notes: 'notes' in body ? (body.notes || null) : current.notes,
      setupNotes: 'setupNotes' in body ? (body.setupNotes || null) : current.setupNotes,
      troubleshootingNotes: 'troubleshootingNotes' in body ? (body.troubleshootingNotes || null) : current.troubleshootingNotes,
      extraInfo: 'extraInfo' in body ? (body.extraInfo || null) : current.extraInfo,
    },
  })

  const changes = diffRecords(current as Record<string, unknown>, updated as Record<string, unknown>)
  await createAuditLog('UPDATE', 'Service', updated.id, updated.name, { serviceId: updated.id }, Object.keys(changes).length ? changes : undefined)

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = await prisma.service.findUnique({ where: { id: id } })
  if (!service) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (new URL(req.url).searchParams.get('permanent') === 'true') {
    await prisma.$transaction([
      prisma.dNSRecord.updateMany({ where: { serviceId: id }, data: { serviceId: null } }),
      prisma.reverseProxy.updateMany({ where: { serviceId: id }, data: { serviceId: null } }),
      prisma.backupJob.updateMany({ where: { serviceId: id }, data: { serviceId: null } }),
      prisma.attachment.deleteMany({ where: { serviceId: id } }),
      prisma.auditLog.deleteMany({ where: { serviceId: id } }),
      prisma.service.delete({ where: { id } }),
    ])
    return NextResponse.json({ ok: true })
  }

  await prisma.service.update({ where: { id: id }, data: { archived: true } })
  await createAuditLog('ARCHIVE', 'Service', service.id, service.name, { serviceId: service.id })
  return NextResponse.json({ ok: true })
}
