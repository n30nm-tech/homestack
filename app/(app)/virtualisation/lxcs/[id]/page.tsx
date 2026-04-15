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
  const lxc = await prisma.lXC.findUnique({ where: { id: id }, select: { name: true } })
  return { title: lxc?.name ?? 'LXC' }
}

export default async function LXCDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const lxc = await prisma.lXC.findUnique({
    where: { id: id, archived: false },
    include: {
      host: true,
      tags: true,
      services: { select: { id: true, name: true, status: true, url: true } },
      dockerHosts: true,
      backupJobs: true,
    },
  })

  if (!lxc) notFound()

  return (
    <div className="flex flex-col min-h-full">
      <Header title={lxc.name} />
      <div className="page-container animate-fade-in space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3"><StatusBadge status={lxc.status} /></div>
          <GenericEditButton id={lxc.id} apiPath="/api/virtualisation/lxcs" redirectPath="/virtualisation" label="LXC" currentData={lxc as any} fields={['name','ctid','hostname','ip','os','cpu','ram','disk','status','notes','setupNotes','troubleshootingNotes','extraInfo']} />
        </div>

        <div className="section-card space-y-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <DetailGrid>
            <DetailField label="CT ID" value={lxc.ctid ? `CT${lxc.ctid}` : null} mono />
            <DetailField label="Status" value={<StatusBadge status={lxc.status} />} />
            <DetailField label="Runs on" value={<Link href={`/virtualisation/hosts/${lxc.host.id}`} className="text-primary hover:underline text-sm">{lxc.host.name}</Link>} />
            <DetailField label="IP" value={lxc.ip} mono />
            <DetailField label="Hostname" value={lxc.hostname} mono />
            <DetailField label="OS" value={lxc.os} />
            {lxc.cpu && <DetailField label="vCPUs" value={String(lxc.cpu)} />}
            {lxc.ram && <DetailField label="RAM" value={formatMB(lxc.ram)} />}
            {lxc.disk && <DetailField label="Disk" value={`${lxc.disk} GB`} />}
          </DetailGrid>
        </div>

        {lxc.services.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Services</h2>
            <div className="space-y-2">
              {lxc.services.map(svc => (
                <div key={svc.id} className="flex items-center gap-3">
                  <Link href={`/services/${svc.id}`} className="text-sm hover:text-primary transition-colors">{svc.name}</Link>
                  <StatusBadge status={svc.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {lxc.dockerHosts.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Docker Hosts</h2>
            <div className="space-y-2">
              {lxc.dockerHosts.map(dh => (
                <div key={dh.id} className="flex items-center gap-3">
                  <Link href={`/virtualisation/docker/${dh.id}`} className="text-sm hover:text-primary transition-colors">{dh.name}</Link>
                  <StatusBadge status={dh.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {lxc.notes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lxc.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
