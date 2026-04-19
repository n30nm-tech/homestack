import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE all non-user data (for clearing demo data)
export async function DELETE(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete in dependency order
  await prisma.auditLog.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.backupJob.deleteMany()
  await prisma.reverseProxy.deleteMany()
  await prisma.dNSRecord.deleteMany()
  await prisma.service.deleteMany()
  await prisma.vM.deleteMany()
  await prisma.virtualHost.deleteMany()
  await prisma.vLAN.deleteMany()
  await prisma.device.deleteMany()
  await prisma.documentationPage.deleteMany()
  await prisma.tag.deleteMany()

  return NextResponse.json({ ok: true, message: 'All demo data cleared.' })
}
