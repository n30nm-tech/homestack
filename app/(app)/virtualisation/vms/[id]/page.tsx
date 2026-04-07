import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailField, DetailGrid } from '@/components/shared/detail-field'
import { GenericEditButton } from '@/components/shared/generic-edit-button'
import { formatMB } from '@/lib/utils'
import Link from 'next/link'

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const vm = await prisma.vM.findUnique({ where: { id: id }, select: { name: true } })
  return { title: vm?.name ?? 'VM' }
}

export default async function VMDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const vm = await prisma.vM.findUnique({
    where: { id: id, archived: false },
    include: {
      host: true,
      tags: true,
      services: { select: { id: true, name: true, status: true, url: true } },
      dockerHosts: true,
      backupJobs: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!vm) notFound()

  return (
    <div className="flex flex-col min-h-full">
      <Header title={vm.name} />
      <div className="page-container animate-fade-in space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3"><StatusBadge status={vm.status} /></div>
          <GenericEditButton id={vm.id} apiPath="/api/virtualisation/vms" redirectPath="/virtualisation" label="VM" currentData={vm as any} fields={['name','vmid','hostname','ip','os','cpu','ram','disk','status','notes','setupNotes','troubleshootingNotes','extraInfo']} />
        </div>

        <div className="section-card space-y-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <DetailGrid>
            <DetailField label="VM ID" value={vm.vmid ? `VM${vm.vmid}` : null} mono />
            <DetailField label="Status" value={<StatusBadge status={vm.status} />} />
            <DetailField label="Runs on" value={<Link href={`/virtualisation/hosts/${vm.host.id}`} className="text-primary hover:underline text-sm">{vm.host.name}</Link>} />
            <DetailField label="IP" value={vm.ip} mono />
            <DetailField label="Hostname" value={vm.hostname} mono />
            <DetailField label="OS" value={vm.os} />
            {vm.cpu && <DetailField label="vCPUs" value={String(vm.cpu)} />}
            {vm.ram && <DetailField label="RAM" value={formatMB(vm.ram)} />}
            {vm.disk && <DetailField label="Disk" value={`${vm.disk} GB`} />}
          </DetailGrid>
        </div>

        {vm.services.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Services</h2>
            <div className="space-y-2">
              {vm.services.map(svc => (
                <div key={svc.id} className="flex items-center gap-3">
                  <Link href={`/services/${svc.id}`} className="text-sm hover:text-primary transition-colors">{svc.name}</Link>
                  <StatusBadge status={svc.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {vm.dockerHosts.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Docker Hosts</h2>
            <div className="space-y-2">
              {vm.dockerHosts.map(dh => (
                <div key={dh.id} className="flex items-center gap-3">
                  <Link href={`/virtualisation/docker/${dh.id}`} className="text-sm hover:text-primary transition-colors">{dh.name}</Link>
                  <StatusBadge status={dh.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {vm.backupJobs.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Backup Jobs</h2>
            <div className="space-y-2">
              {vm.backupJobs.map(job => (
                <Link key={job.id} href={`/backups/${job.id}`} className="text-sm hover:text-primary transition-colors block">{job.name}</Link>
              ))}
            </div>
          </div>
        )}

        {vm.notes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vm.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
