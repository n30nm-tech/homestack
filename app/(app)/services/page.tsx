import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { TagList } from '@/components/shared/tag-badge'
import { getHostingSummary, ensureUrl } from '@/lib/utils'
import Link from 'next/link'
import { ExternalLink, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { iconUrl } from '@/components/shared/icon-picker'

export const metadata = { title: 'Services' }

export default async function ServicesPage() {
  await auth()

  const services = await prisma.service.findMany({
    where: { archived: false },
    include: {
      tags: true,
      device: { select: { id: true, name: true } },
      virtualHost: { select: { id: true, name: true } },
      vm: { select: { id: true, name: true } },
      lxc: { select: { id: true, name: true } },
      dockerHost: { select: { id: true, name: true } },
    },
    orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Services" description={`${services.length} services`} />

      <div className="page-container animate-fade-in">
        {services.length === 0 ? (
          <div className="section-card text-center py-16">
            <p className="text-muted-foreground text-sm">No services yet. Use Add New to create one.</p>
          </div>
        ) : (
          <div className="section-card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Hosted on</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Category</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.map(svc => (
                  <tr key={svc.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {svc.icon
                          ? <img src={iconUrl(svc.icon)} alt="" className="w-6 h-6 rounded object-contain shrink-0" />
                          : svc.favourite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        }
                        {svc.icon && svc.favourite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                        <div className="min-w-0">
                          <Link
                            href={`/services/${svc.id}`}
                            className="text-sm font-medium hover:text-primary transition-colors"
                          >
                            {svc.name}
                          </Link>
                          {svc.tags.length > 0 && (
                            <div className="mt-1">
                              <TagList tags={svc.tags} />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <StatusBadge status={svc.status} />
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">{getHostingSummary(svc)}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <span className="text-sm text-muted-foreground">{svc.category ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {svc.url && (
                        <a
                          href={ensureUrl(svc.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
