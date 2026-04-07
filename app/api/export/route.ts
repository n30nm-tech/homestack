import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateFullMarkdownExport, generateServiceMarkdown } from '@/lib/export'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') ?? 'full'
  const id = searchParams.get('id')

  let content: string
  let filename: string

  if (type === 'service' && id) {
    content = await generateServiceMarkdown(id)
    filename = `homestack-service-${id}.md`
  } else {
    content = await generateFullMarkdownExport()
    filename = `homestack-export-${new Date().toISOString().slice(0, 10)}.md`
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
