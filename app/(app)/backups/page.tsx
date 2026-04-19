import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { BackupStatusBadge } from '@/components/shared/status-badge'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'Backups' }

export default async function BackupsPage() {
  const jobs = await prisma.backupJob.findMany({
    where: { archived: false },
    include: {
      service: { select: { id: true, name: true } },
      device: { select: { id: true, name: true } },
      vm: { select: { id: true, name: true } },
      virtualHost: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })

  function getSourceName(job: typeof jobs[0]) {
    return job.service?.name ?? job.device?.name ?? job.vm?.name ?? job.virtualHost?.name ?? '—'
  }

  function getSourceHref(job: typeof jobs[0]) {
    if (job.service) return `/services/${job.service.id}`
    if (job.device) return `/devices/${job.device.id}`
    if (job.vm) return `/virtualisation/vms/${job.vm.id}`
    if (job.virtualHost) return `/virtualisation/hosts/${job.virtualHost.id}`
    return null
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Backups" description={`${jobs.length} backup jobs`} />

      <div className="page-container animate-fade-in">
        {jobs.length === 0 ? (
          <div className="section-card text-center py-16">
            <p className="text-muted-foreground text-sm">No backup jobs yet. Use Add New to create one.</p>
          </div>
        ) : (
          <div className="section-card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Job</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Backs up</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Schedule</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Last run</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map(job => {
                  const sourceName = getSourceName(job)
                  const sourceHref = getSourceHref(job)
                  return (
                    <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/backups/${job.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                          {job.name}
                        </Link>
                        {job.tool && <p className="text-xs text-muted-foreground mt-0.5">{job.tool}</p>}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        {sourceHref ? (
                          <Link href={sourceHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{sourceName}</Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">{sourceName}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{job.schedule ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3.5 hidden xl:table-cell">
                        <span className="text-sm text-muted-foreground">{formatDateTime(job.lastRun)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <BackupStatusBadge status={job.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
