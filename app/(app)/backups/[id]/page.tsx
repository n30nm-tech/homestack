import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { BackupStatusBadge } from '@/components/shared/status-badge'
import { DetailField, DetailGrid } from '@/components/shared/detail-field'
import { GenericEditButton } from '@/components/shared/generic-edit-button'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const job = await prisma.backupJob.findUnique({ where: { id: id }, select: { name: true } })
  return { title: job?.name ?? 'Backup Job' }
}

export default async function BackupDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const job = await prisma.backupJob.findUnique({
    where: { id: id, archived: false },
    include: {
      service: true,
      device: true,
      vm: true,
      lxc: true,
      dockerHost: true,
      virtualHost: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!job) notFound()

  const source = job.service ?? job.device ?? job.vm ?? job.lxc ?? job.dockerHost ?? job.virtualHost
  const sourceType = job.service ? 'service' : job.device ? 'device' : job.vm ? 'vm' : job.lxc ? 'lxc' : job.dockerHost ? 'dockerhost' : job.virtualHost ? 'host' : null
  const sourceHref = sourceType === 'service' ? `/services/${source?.id}` : sourceType === 'device' ? `/devices/${source?.id}` : sourceType === 'vm' ? `/virtualisation/vms/${source?.id}` : sourceType === 'lxc' ? `/virtualisation/lxcs/${source?.id}` : sourceType === 'dockerhost' ? `/virtualisation/docker/${source?.id}` : sourceType === 'host' ? `/virtualisation/hosts/${source?.id}` : null

  return (
    <div className="flex flex-col min-h-full">
      <Header title={job.name} />
      <div className="page-container animate-fade-in space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackupStatusBadge status={job.status} />
          </div>
          <GenericEditButton
            id={job.id}
            apiPath="/api/backups"
            redirectPath="/backups"
            label="Backup Job"
            currentData={job as any}
            fields={['name', 'description', 'destination', 'backupType', 'schedule', 'retention', 'tool', 'status', 'notes']}
          />
        </div>

        {job.description && (
          <p className="text-sm text-muted-foreground">{job.description}</p>
        )}

        <div className="section-card space-y-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <DetailGrid>
            <DetailField label="Status" value={<BackupStatusBadge status={job.status} />} />
            {source && sourceHref && (
              <DetailField label="Backs up" value={
                <Link href={sourceHref} className="text-primary hover:underline text-sm">{source.name}</Link>
              } />
            )}
            <DetailField label="Destination" value={job.destination} />
            <DetailField label="Type" value={job.backupType} />
            <DetailField label="Schedule" value={job.schedule} />
            <DetailField label="Retention" value={job.retention} />
            <DetailField label="Last run" value={formatDateTime(job.lastRun)} />
            <DetailField label="Tool" value={job.tool} />
          </DetailGrid>
        </div>

        {job.notes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}

        {job.auditLogs.length > 0 && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Change History</h2>
            <div className="space-y-2">
              {job.auditLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="w-32 shrink-0">{formatDateTime(log.createdAt)}</span>
                  <span className="capitalize">{log.action.toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
