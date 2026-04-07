import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archived = req.nextUrl.searchParams.get('archived') === 'true'
  const vlans = await prisma.vLAN.findMany({ where: { archived }, include: { devices: { select: { id: true, name: true } } }, orderBy: { vlanId: 'asc' } })
  return NextResponse.json(vlans)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (!body.vlanId) return NextResponse.json({ error: 'VLAN ID is required.' }, { status: 400 })
  const vlan = await prisma.vLAN.create({
    data: {
      name: body.name.trim(),
      vlanId: parseInt(body.vlanId),
      subnet: body.subnet || null,
      gateway: body.gateway || null,
      purpose: body.purpose || null,
      dhcpRange: body.dhcpRange || null,
      dnsServer: body.dnsServer || null,
      internetAccess: body.internetAccess !== 'false',
      notes: body.notes || null,
    },
  })
  await createAuditLog('CREATE', 'VLAN', vlan.id, vlan.name, { vlanId: vlan.id })
  return NextResponse.json(vlan, { status: 201 })
}
