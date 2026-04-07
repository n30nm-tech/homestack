import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { TagList } from '@/components/shared/tag-badge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { FileText, Download } from 'lucide-react'

export const metadata = { title: 'Documentation' }

export default async function DocsPage() {
  const pages = await prisma.documentationPage.findMany({
    where: { archived: false },
    include: { tags: true },
    orderBy: { title: 'asc' },
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Documentation" description={`${pages.length} pages`} />

      <div className="page-container animate-fade-in space-y-4">
        {/* Export full docs */}
        <div className="flex justify-end">
          <a
            href="/api/export"
            className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-secondary text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            Export all as Markdown
          </a>
        </div>

        {pages.length === 0 ? (
          <div className="section-card text-center py-16">
            <p className="text-muted-foreground text-sm">No documentation pages yet. Use Add New to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pages.map(page => (
              <Link
                key={page.id}
                href={`/docs/${page.id}`}
                className="section-card hover:border-border/80 transition-colors space-y-3 group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-sm font-medium group-hover:text-primary transition-colors">{page.title}</h3>
                    {page.content && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {page.content.replace(/[#*`]/g, '').substring(0, 120)}…
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Updated {formatDate(page.updatedAt)}</p>
                  </div>
                </div>
                {page.tags.length > 0 && <TagList tags={page.tags} />}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
