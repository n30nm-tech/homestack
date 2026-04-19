import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archived = req.nextUrl.searchParams.get('archived') === 'true'
  const jobs = await prisma.backupJob.findMany({
    where: { archived },
    include: {
      service: { select: { id: true, name: true } },
      device: { select: { id: true, name: true } },
      vm: { select: { id: true, name: true } },
      virtualHost: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(jobs)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  const job = await prisma.backupJob.create({
    data: {
      name: body.name.trim(),
      description: body.description || null,
      destination: body.destination || null,
      backupType: body.backupType || null,
      schedule: body.schedule || null,
      retention: body.retention || null,
      tool: body.tool || null,
      notes: body.notes || null,
      serviceId: body.serviceId || null,
      deviceId: body.deviceId || null,
      vmId: body.vmId || null,
      virtualHostId: body.virtualHostId || null,
    },
  })
  await createAuditLog('CREATE', 'BackupJob', job.id, job.name, { backupJobId: job.id })
  return NextResponse.json(job, { status: 201 })
}
