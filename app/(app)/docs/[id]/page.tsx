import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { TagList } from '@/components/shared/tag-badge'
import { DocEditForm } from './doc-edit-form'
import { formatDate } from '@/lib/utils'

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const page = await prisma.documentationPage.findUnique({ where: { id: id }, select: { title: true } })
  return { title: page?.title ?? 'Documentation' }
}

export default async function DocDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const page = await prisma.documentationPage.findUnique({
    where: { id: id, archived: false },
    include: {
      tags: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!page) notFound()

  return (
    <div className="flex flex-col min-h-full">
      <Header title={page.title} />

      <div className="page-container animate-fade-in space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <TagList tags={page.tags} />
            <p className="text-xs text-muted-foreground">Updated {formatDate(page.updatedAt)}</p>
          </div>
          <DocEditForm page={page} />
        </div>

        {page.content && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Notes</h2>
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">{page.content}</pre>
            </div>
          </div>
        )}

        {page.setupNotes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Setup Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{page.setupNotes}</p>
          </div>
        )}

        {page.troubleshootingNotes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Troubleshooting</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{page.troubleshootingNotes}</p>
          </div>
        )}

        {page.extraInfo && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Extra Info</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{page.extraInfo}</p>
          </div>
        )}

        {!page.content && !page.setupNotes && !page.troubleshootingNotes && !page.extraInfo && (
          <div className="section-card text-center py-12">
            <p className="text-muted-foreground text-sm">This page is empty. Click Edit to add content.</p>
          </div>
        )}
      </div>
    </div>
  )
}
