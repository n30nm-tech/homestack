import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await prisma.documentationPage.findUnique({
    where: { id: id },
    include: { tags: true, attachments: true, auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(page)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const current = await prisma.documentationPage.findUnique({ where: { id: id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.documentationPage.update({
    where: { id: id },
    data: {
      title: body.title?.trim() ?? current.title,
      content: 'content' in body ? (body.content || null) : current.content,
      setupNotes: 'setupNotes' in body ? (body.setupNotes || null) : current.setupNotes,
      troubleshootingNotes: 'troubleshootingNotes' in body ? (body.troubleshootingNotes || null) : current.troubleshootingNotes,
      extraInfo: 'extraInfo' in body ? (body.extraInfo || null) : current.extraInfo,
      archived: typeof body.archived === 'boolean' ? body.archived : current.archived,
    },
  })
  await createAuditLog('UPDATE', 'DocumentationPage', updated.id, updated.title, { docPageId: updated.id })
  return NextResponse.json(updated)
}
