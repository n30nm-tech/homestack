import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailField, DetailGrid } from '@/components/shared/detail-field'
import { GenericEditButton } from '@/components/shared/generic-edit-button'
import Link from 'next/link'
import { ensureUrl } from '@/lib/utils'

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const dh = await prisma.dockerHost.findUnique({ where: { id: id }, select: { name: true } })
  return { title: dh?.name ?? 'Docker Host' }
}

export default async function DockerHostDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const dh = await prisma.dockerHost.findUnique({
    where: { id: id, archived: false },
    include: {
      vm: { include: { host: true } },
      lxc: { include: { host: true } },
      virtualHost: true,
      services: { select: { id: true, name: true, status: true, url: true, category: true } },
      backupJobs: true,
    },
  })

  if (!dh) notFound()

  // Group services by category
  const servicesByCategory = dh.services.reduce<Record<string, typeof dh.services>>((acc, svc) => {
    const key = svc.category ?? 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(svc)
    return acc
  }, {})

  return (
    <div className="flex flex-col min-h-full">
      <Header title={dh.name} />
      <div className="page-container animate-fade-in space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3"><StatusBadge status={dh.status} /></div>
          <GenericEditButton id={dh.id} apiPath="/api/virtualisation/docker" redirectPath="/virtualisation" label="Docker Host" currentData={dh as any} fields={['name','hostname','ip','status','notes']} />
        </div>

        <div className="section-card space-y-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <DetailGrid>
            <DetailField label="Status" value={<StatusBadge status={dh.status} />} />
            <DetailField label="IP" value={dh.ip} mono />
            <DetailField label="Hostname" value={dh.hostname} mono />
            {dh.vm && (
              <DetailField label="Runs on VM" value={
                <Link href={`/virtualisation/vms/${dh.vm.id}`} className="text-primary hover:underline text-sm">
                  {dh.vm.name} on {dh.vm.host.name}
                </Link>
              } />
            )}
            {dh.lxc && (
              <DetailField label="Runs on LXC" value={
                <Link href={`/virtualisation/lxcs/${dh.lxc.id}`} className="text-primary hover:underline text-sm">
                  {dh.lxc.name} on {dh.lxc.host.name}
                </Link>
              } />
            )}
            {dh.virtualHost && (
              <DetailField label="Runs on Host" value={
                <Link href={`/virtualisation/hosts/${dh.virtualHost.id}`} className="text-primary hover:underline text-sm">
                  {dh.virtualHost.name}
                </Link>
              } />
            )}
          </DetailGrid>
        </div>

        {dh.services.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Services ({dh.services.length})</h2>
            {Object.entries(servicesByCategory).map(([category, svcs]) => (
              <div key={category} className="section-card space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{category}</p>
                <div className="space-y-2">
                  {svcs.map(svc => (
                    <div key={svc.id} className="flex items-center gap-3">
                      <Link href={`/services/${svc.id}`} className="text-sm hover:text-primary transition-colors flex-1">{svc.name}</Link>
                      <StatusBadge status={svc.status} />
                      {svc.url && (
                        <a href={ensureUrl(svc.url)} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{svc.url}</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {dh.notes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dh.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
