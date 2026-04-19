import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailField, DetailGrid } from '@/components/shared/detail-field'
import { AssignServiceButton } from '@/components/shared/assign-service-button'
import { VHOST_TYPE_LABELS, formatMB, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { GenericEditButton } from '@/components/shared/generic-edit-button'
import { Container } from 'lucide-react'

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const host = await prisma.virtualHost.findUnique({ where: { id: id }, select: { name: true } })
  return { title: host?.name ?? 'Host' }
}

export default async function HostDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const host = await prisma.virtualHost.findUnique({
    where: { id: id, archived: false },
    include: {
      device: true,
      tags: true,
      vms: { include: { services: { select: { id: true, name: true, status: true } } } },
      services: { where: { archived: false }, select: { id: true, name: true, status: true, containerId: true, hasDocker: true } },
      backupJobs: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!host) notFound()

  return (
    <div className="flex flex-col min-h-full">
      <Header title={host.name} backHref="/virtualisation" />
      <div className="page-container animate-fade-in space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">{VHOST_TYPE_LABELS[host.type]}</span>
            <StatusBadge status={host.status} />
          </div>
          <GenericEditButton id={host.id} apiPath="/api/virtualisation/hosts" redirectPath="/virtualisation" label="Host" currentData={host} fields={['name','hostname','ip','os','version','cpu','ram','storage','notes','setupNotes','troubleshootingNotes','extraInfo','status']} />
        </div>

        <div className="section-card space-y-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <DetailGrid>
            <DetailField label="Platform" value={VHOST_TYPE_LABELS[host.type]} />
            <DetailField label="Status" value={<StatusBadge status={host.status} />} />
            <DetailField label="IP" value={host.ip} mono />
            <DetailField label="Hostname" value={host.hostname} mono />
            <DetailField label="OS" value={host.os} />
            <DetailField label="Version" value={host.version} />
            {host.cpu && <DetailField label="CPUs" value={String(host.cpu)} />}
            {host.ram && <DetailField label="RAM" value={formatMB(host.ram)} />}
            <DetailField label="Storage" value={host.storage} />
            {host.device && (
              <DetailField label="Physical host" value={
                <Link href={`/devices/${host.device.id}`} className="text-primary hover:underline text-sm">{host.device.name}</Link>
              } />
            )}
          </DetailGrid>
        </div>

        {/* Services (LXC containers on this host) */}
        <div className="section-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Services ({host.services.length})</h2>
            <AssignServiceButton relationField="virtualHostId" relationId={host.id} label={host.name} />
          </div>
          {host.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services on this host yet.</p>
          ) : (
            <div className="space-y-2">
              {host.services.map(svc => (
                <div key={svc.id} className="flex items-center gap-3">
                  <Link href={`/services/${svc.id}`} className="text-sm hover:text-primary transition-colors">{svc.name}</Link>
                  {svc.containerId && <span className="text-xs text-muted-foreground font-mono">CT{svc.containerId}</span>}
                  {svc.hasDocker && (
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Container className="w-2.5 h-2.5" />Docker
                    </span>
                  )}
                  <StatusBadge status={svc.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {host.vms.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Virtual Machines ({host.vms.length})</h2>
            <div className="space-y-2">
              {host.vms.map(vm => (
                <div key={vm.id} className="flex items-center gap-3">
                  <Link href={`/virtualisation/vms/${vm.id}`} className="text-sm hover:text-primary transition-colors">{vm.name}</Link>
                  <StatusBadge status={vm.status} />
                  {vm.services.length > 0 && (
                    <span className="text-xs text-muted-foreground">{vm.services.length} service{vm.services.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {host.backupJobs.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Backup Jobs</h2>
            <div className="space-y-2">
              {host.backupJobs.map(job => (
                <Link key={job.id} href={`/backups/${job.id}`} className="text-sm hover:text-primary transition-colors block">{job.name}</Link>
              ))}
            </div>
          </div>
        )}

        {host.notes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{host.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
