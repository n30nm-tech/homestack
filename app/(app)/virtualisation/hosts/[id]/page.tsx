import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailField, DetailGrid } from '@/components/shared/detail-field'
import { AssignServiceButton } from '@/components/shared/assign-service-button'
import { VHOST_TYPE_LABELS, formatMB, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { GenericEditButton } from '@/components/shared/generic-edit-button'

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
      lxcs: { include: { services: { select: { id: true, name: true, status: true } } } },
      dockerHosts: { include: { services: { select: { id: true, name: true, status: true } } } },
      services: { select: { id: true, name: true, status: true } },
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

        {/* Services directly on this host */}
        {host.services.length > 0 && (
          <div className="section-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Services ({host.services.length})</h2>
              <AssignServiceButton relationField="virtualHostId" relationId={host.id} label={host.name} />
            </div>
            <div className="space-y-2">
              {host.services.map((svc: any) => (
                <div key={svc.id} className="flex items-center gap-3">
                  <Link href={`/services/${svc.id}`} className="text-sm hover:text-primary transition-colors">{svc.name}</Link>
                  <StatusBadge status={svc.status} />
                </div>
              ))}
            </div>
          </div>
        )}
        {host.services.length === 0 && (
          <div className="section-card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Services</h2>
              <AssignServiceButton relationField="virtualHostId" relationId={host.id} label={host.name} />
            </div>
            <p className="text-sm text-muted-foreground">No services directly assigned to this host.</p>
          </div>
        )}

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

        {host.lxcs.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">LXC Containers ({host.lxcs.length})</h2>
            <div className="space-y-2">
              {host.lxcs.map(lxc => (
                <div key={lxc.id} className="flex items-center gap-3">
                  <Link href={`/virtualisation/lxcs/${lxc.id}`} className="text-sm hover:text-primary transition-colors">{lxc.name}</Link>
                  <StatusBadge status={lxc.status} />
                  {lxc.services.length > 0 && (
                    <span className="text-xs text-muted-foreground">{lxc.services.length} service{lxc.services.length !== 1 ? 's' : ''}</span>
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
