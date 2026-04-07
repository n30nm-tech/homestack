import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archived = req.nextUrl.searchParams.get('archived') === 'true'
  const records = await prisma.dNSRecord.findMany({ where: { archived }, include: { service: { select: { id: true, name: true } } }, orderBy: { recordName: 'asc' } })
  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.recordName?.trim()) return NextResponse.json({ error: 'Record name is required.' }, { status: 400 })
  const record = await prisma.dNSRecord.create({
    data: {
      recordName: body.recordName.trim(),
      domain: body.domain || null,
      ip: body.ip || null,
      serviceId: body.serviceId || null,
      notes: body.notes || null,
    },
  })
  await createAuditLog('CREATE', 'DNSRecord', record.id, record.recordName, { dnsRecordId: record.id })
  return NextResponse.json(record, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'ID required.' }, { status: 400 })
  const updated = await prisma.dNSRecord.update({
    where: { id: body.id },
    data: {
      recordName: body.recordName || undefined,
      domain: 'domain' in body ? (body.domain || null) : undefined,
      ip: 'ip' in body ? (body.ip || null) : undefined,
      serviceId: 'serviceId' in body ? (body.serviceId || null) : undefined,
      notes: 'notes' in body ? (body.notes || null) : undefined,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await prisma.dNSRecord.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}
