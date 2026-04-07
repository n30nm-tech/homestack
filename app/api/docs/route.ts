import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archived = req.nextUrl.searchParams.get('archived') === 'true'
  const pages = await prisma.documentationPage.findMany({ where: { archived }, include: { tags: true }, orderBy: { title: 'asc' } })
  return NextResponse.json(pages)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
  const page = await prisma.documentationPage.create({
    data: {
      title: body.title.trim(),
      content: body.content || null,
      setupNotes: body.setupNotes || null,
      troubleshootingNotes: body.troubleshootingNotes || null,
      extraInfo: body.extraInfo || null,
    },
  })
  await createAuditLog('CREATE', 'DocumentationPage', page.id, page.title, { docPageId: page.id })
  return NextResponse.json(page, { status: 201 })
}
