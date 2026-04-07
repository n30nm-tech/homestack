import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(tags)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  const tag = await prisma.tag.upsert({
    where: { name: body.name.trim().toLowerCase() },
    update: { color: body.color || undefined },
    create: { name: body.name.trim().toLowerCase(), color: body.color || null },
  })
  return NextResponse.json(tag, { status: 201 })
}
