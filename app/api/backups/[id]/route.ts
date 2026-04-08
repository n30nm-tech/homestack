import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const job = await prisma.backupJob.findUnique({
    where: { id: id },
    include: {
      service: true, device: true, vm: true, lxc: true, dockerHost: true, virtualHost: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const current = await prisma.backupJob.findUnique({ where: { id: id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.backupJob.update({
    where: { id: id },
    data: {
      name: body.name?.trim() ?? current.name,
      description: 'description' in body ? (body.description || null) : current.description,
      destination: 'destination' in body ? (body.destination || null) : current.destination,
      backupType: 'backupType' in body ? (body.backupType || null) : current.backupType,
      schedule: 'schedule' in body ? (body.schedule || null) : current.schedule,
      retention: 'retention' in body ? (body.retention || null) : current.retention,
      lastRun: 'lastRun' in body ? (body.lastRun ? new Date(body.lastRun) : null) : current.lastRun,
      status: body.status ?? current.status,
      tool: 'tool' in body ? (body.tool || null) : current.tool,
      notes: 'notes' in body ? (body.notes || null) : current.notes,
      archived: typeof body.archived === 'boolean' ? body.archived : current.archived,
    },
  })
  await createAuditLog('UPDATE', 'BackupJob', updated.id, updated.name, { backupJobId: updated.id })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const updated = await prisma.backupJob.update({ where: { id }, data: { archived: true } })
  await createAuditLog('DELETE', 'BackupJob', updated.id, updated.name, { backupJobId: updated.id })
  return NextResponse.json({ ok: true })
}
