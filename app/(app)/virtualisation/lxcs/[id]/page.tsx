import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailField, DetailGrid } from '@/components/shared/detail-field'
import { GenericEditButton } from '@/components/shared/generic-edit-button'
import { formatMB } from '@/lib/utils'
import Link from 'next/link'
import { Container } from 'lucide-react'

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
      services: { select: { id: true, name: true, status: true, url: true, stackFolder: true, composeFilePath: true, containerImage: true } },
      dockerHosts: true,
      backupJobs: true,
    },
  })

  if (!lxc) notFound()

  // Group Docker services by stack folder when hasDocker is true
  const dockerServices = lxc.services.filter(s => s.stackFolder || s.containerImage || s.composeFilePath)
  const plainServices = lxc.services.filter(s => !s.stackFolder && !s.containerImage && !s.composeFilePath)

  const servicesByStack = dockerServices.reduce<Record<string, typeof dockerServices>>((acc, svc) => {
    const key = svc.stackFolder ?? '(no stack folder)'
    if (!acc[key]) acc[key] = []
    acc[key].push(svc)
    return acc
  }, {})

  return (
    <div className="flex flex-col min-h-full">
      <Header title={lxc.name} backHref="/virtualisation" />
      <div className="page-container animate-fade-in space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={lxc.status} />
            {lxc.hasDocker && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
                <Container className="w-3.5 h-3.5" />
                Docker Host
              </span>
            )}
          </div>
          <GenericEditButton
            id={lxc.id}
            apiPath="/api/virtualisation/lxcs"
            redirectPath="/virtualisation"
            label="LXC"
            currentData={lxc as any}
            fields={['name','ctid','hostname','ip','os','cpu','ram','disk','status','hasDocker','dockerDataPath','notes','setupNotes','troubleshootingNotes','extraInfo']}
          />
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

        {/* ── Docker section ─────────────────────────────────────────────── */}
        {lxc.hasDocker && (
          <div className="space-y-4">
            {/* Banner */}
            <div className="flex items-center gap-3 rounded-xl border border-blue-500/25 bg-blue-500/5 px-5 py-4">
              <Container className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-300">This LXC runs Docker</p>
                {lxc.dockerDataPath
                  ? <p className="text-xs font-mono text-blue-400/70 mt-0.5">Stacks root: {lxc.dockerDataPath}</p>
                  : <p className="text-xs text-blue-400/50 mt-0.5">No stack root path set — edit to add one</p>
                }
              </div>
            </div>

            {/* Services grouped by compose stack */}
            {dockerServices.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Docker Services ({dockerServices.length})</h2>
                {Object.entries(servicesByStack).map(([stack, svcs]) => (
                  <div key={stack} className="section-card space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono font-medium text-muted-foreground">{stack}</p>
                      {svcs[0]?.composeFilePath && (
                        <span className="text-xs text-muted-foreground/60">— {svcs[0].composeFilePath}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {svcs.map(svc => (
                        <div key={svc.id} className="flex items-center gap-3">
                          <Link href={`/services/${svc.id}`} className="text-sm hover:text-primary transition-colors flex-1">{svc.name}</Link>
                          {svc.containerImage && (
                            <span className="text-xs font-mono text-muted-foreground/70 hidden sm:block truncate max-w-48">{svc.containerImage}</span>
                          )}
                          <StatusBadge status={svc.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dockerServices.length === 0 && (
              <div className="section-card">
                <p className="text-sm text-muted-foreground">No Docker services linked yet. Add services and set their Stack Folder to see them grouped here.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Plain services (non-Docker) ─────────────────────────────────── */}
        {plainServices.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Services</h2>
            <div className="space-y-2">
              {plainServices.map(svc => (
                <div key={svc.id} className="flex items-center gap-3">
                  <Link href={`/services/${svc.id}`} className="text-sm hover:text-primary transition-colors">{svc.name}</Link>
                  <StatusBadge status={svc.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Legacy standalone Docker Hosts ──────────────────────────────── */}
        {lxc.dockerHosts.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Linked Docker Hosts</h2>
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
