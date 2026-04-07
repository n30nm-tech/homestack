import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { Status } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archived = req.nextUrl.searchParams.get('archived') === 'true'
  const vms = await prisma.vM.findMany({
    where: { archived },
    include: { tags: true, host: { select: { id: true, name: true, type: true } }, services: { select: { id: true, name: true, status: true } } },
    orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
  })
  return NextResponse.json(vms)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  // If no hostId, we need a placeholder — find any host or skip the constraint
  let hostId = body.hostId
  if (!hostId) {
    const firstHost = await prisma.virtualHost.findFirst()
    if (!firstHost) return NextResponse.json({ error: 'No virtualisation host found. Create a host first.' }, { status: 400 })
    hostId = firstHost.id
  }

  const vm = await prisma.vM.create({
    data: {
      name: body.name.trim(),
      vmid: body.vmid || null,
      hostname: body.hostname || null,
      ip: body.ip || null,
      os: body.os || null,
      cpu: body.cpu ? parseInt(body.cpu) : null,
      ram: body.ram ? parseInt(body.ram) : null,
      disk: body.disk ? parseInt(body.disk) : null,
      status: (body.status as Status) || 'UNKNOWN',
      hostId,
    },
  })
  await createAuditLog('CREATE', 'VM', vm.id, vm.name, { vmId: vm.id })
  return NextResponse.json(vm, { status: 201 })
}
