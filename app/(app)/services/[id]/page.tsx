import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { TagList } from '@/components/shared/tag-badge'
import { DetailField, DetailGrid } from '@/components/shared/detail-field'
import { CodeBlock } from '@/components/shared/code-block'
import { ServiceEditForm } from './service-edit-form'
import { ServiceImportDialog } from './service-import-dialog'
import { formatDateTime, getHostingSummary, ensureUrl } from '@/lib/utils'
import Link from 'next/link'
import { ExternalLink, Star, Download } from 'lucide-react'
import { iconUrl } from '@/lib/utils'

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const service = await prisma.service.findUnique({ where: { id: id }, select: { name: true } })
  return { title: service?.name ?? 'Service' }
}

export default async function ServiceDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const service = await prisma.service.findUnique({
    where: { id: id, archived: false },
    include: {
      tags: true,
      device: true,
      virtualHost: true,
      vm: { include: { host: true } },
      lxc: { include: { host: true } },
      dockerHost: { include: { vm: true, lxc: true, virtualHost: true } },
      dnsRecords: true,
      reverseProxies: true,
      backupJobs: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!service) notFound()

  const exportUrl = `/api/export?type=service&id=${service.id}`

  return (
    <div className="flex flex-col min-h-full">
      <Header title={service.name} />

      <div className="page-container animate-fade-in space-y-6">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              {service.icon && (
                <img src={iconUrl(service.icon)} alt="" className="w-8 h-8 rounded object-contain" />
              )}
              <StatusBadge status={service.status} />
              {service.favourite && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" /> Favourite
                </span>
              )}
              <TagList tags={service.tags} />
            </div>
            {service.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{service.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {service.url && (
              <a
                href={ensureUrl(service.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-secondary text-sm font-medium hover:bg-muted transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            )}
            <a
              href={exportUrl}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-secondary text-sm font-medium hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </a>
            <ServiceImportDialog serviceId={service.id} />
            <ServiceEditForm service={service} />
          </div>
        </div>

        {/* Details */}
        <div className="section-card space-y-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <DetailGrid>
            {service.url && (
              <DetailField label="URL" value={
                <a href={ensureUrl(service.url)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                  {service.url} <ExternalLink className="w-3 h-3" />
                </a>
              } />
            )}
            <DetailField label="Status" value={<StatusBadge status={service.status} />} />
            {service.ip && <DetailField label="IP Address" value={service.ip} mono />}
            {service.port && <DetailField label="Port" value={String(service.port)} mono />}
            {service.category && <DetailField label="Category" value={service.category} />}
          </DetailGrid>
        </div>

        {/* Hosting */}
        <div className="section-card space-y-5">
          <h2 className="text-sm font-semibold">Hosting</h2>
          <DetailGrid>
            <DetailField label="Hosted on" value={getHostingSummary(service)} />
            {service.dockerHost && (
              <DetailField label="Docker host" value={
                <Link href={`/virtualisation/docker/${service.dockerHost.id}`} className="text-primary hover:underline text-sm">
                  {service.dockerHost.name}
                </Link>
              } />
            )}
            {service.lxc && (
              <DetailField label="LXC" value={
                <Link href={`/virtualisation/lxcs/${service.lxc.id}`} className="text-primary hover:underline text-sm">
                  {service.lxc.name} (CT{service.lxc.ctid}) on {service.lxc.host.name}
                </Link>
              } />
            )}
            {service.vm && (
              <DetailField label="VM" value={
                <Link href={`/virtualisation/vms/${service.vm.id}`} className="text-primary hover:underline text-sm">
                  {service.vm.name} (VM{service.vm.vmid}) on {service.vm.host.name}
                </Link>
              } />
            )}
            {service.device && (
              <DetailField label="Device" value={
                <Link href={`/devices/${service.device.id}`} className="text-primary hover:underline text-sm">
                  {service.device.name}
                </Link>
              } />
            )}
          </DetailGrid>
        </div>

        {/* Linked items */}
        {(service.reverseProxies.length > 0 || service.dnsRecords.length > 0 || service.backupJobs.length > 0) && (
          <div className="section-card space-y-5">
            <h2 className="text-sm font-semibold">Linked</h2>
            <DetailGrid>
              {service.reverseProxies.length > 0 && (
                <DetailField label="Published via" value={service.reverseProxies.map(rp => rp.name).join(', ')} />
              )}
              {service.dnsRecords.length > 0 && (
                <DetailField label="DNS records" value={service.dnsRecords.map(r => `${r.recordName}.${r.domain ?? ''}`).join(', ')} />
              )}
              {service.backupJobs.length > 0 && (
                <DetailField label="Backup jobs" value={service.backupJobs.map(b => b.name).join(', ')} />
              )}
            </DetailGrid>
          </div>
        )}

        {/* Container metadata */}
        {(service.containerImage || service.stackFolder || service.composeFilePath || service.bindMounts) && (
          <div className="section-card space-y-5">
            <h2 className="text-sm font-semibold">Container</h2>
            <DetailGrid>
              {service.containerImage  && <DetailField label="Image"        value={service.containerImage}  mono />}
              {service.stackFolder     && <DetailField label="Stack folder"  value={service.stackFolder}     mono />}
              {service.composeFilePath && <DetailField label="Compose file"  value={service.composeFilePath} mono />}
            </DetailGrid>
            {service.bindMounts && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Bind mounts</p>
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{service.bindMounts}</pre>
              </div>
            )}
          </div>
        )}

        {/* Config sections */}
        {service.dockerCompose && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Docker Compose</h2>
            <CodeBlock code={service.dockerCompose} language="yaml" filename="docker-compose.yml" />
          </div>
        )}

        {service.envVars && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Environment Variables</h2>
            <CodeBlock code={service.envVars} language="env" filename=".env" />
          </div>
        )}

        {service.setupSteps && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Setup Steps</h2>
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">{service.setupSteps}</pre>
            </div>
          </div>
        )}

        {service.runCommands && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Commands</h2>
            <CodeBlock code={service.runCommands} language="bash" />
          </div>
        )}

        {service.reverseProxyConfig && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Reverse Proxy Config</h2>
            <CodeBlock code={service.reverseProxyConfig} language="nginx" filename="nginx.conf" />
          </div>
        )}

        {/* Notes */}
        {service.notes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.notes}</p>
          </div>
        )}

        {service.setupNotes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Setup Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.setupNotes}</p>
          </div>
        )}

        {service.troubleshootingNotes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Troubleshooting</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.troubleshootingNotes}</p>
          </div>
        )}

        {service.extraInfo && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Extra Info</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.extraInfo}</p>
          </div>
        )}

        {/* Audit log */}
        {service.auditLogs.length > 0 && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Change History</h2>
            <div className="space-y-3">
              {service.auditLogs.map(log => {
                const changes = log.changes as Record<string, { from: unknown; to: unknown }> | null
                return (
                  <div key={log.id} className="text-xs space-y-1">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="w-32 shrink-0 tabular-nums">{formatDateTime(log.createdAt)}</span>
                      <span className="capitalize font-medium text-foreground">{log.action.toLowerCase()}</span>
                    </div>
                    {changes && Object.keys(changes).length > 0 && (
                      <div className="ml-[8.5rem] space-y-0.5">
                        {Object.entries(changes).map(([field, { from, to }]) => (
                          <div key={field} className="flex items-baseline gap-1.5 text-muted-foreground">
                            <span className="font-medium text-foreground/70 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            {from !== null && from !== '' && <span className="line-through opacity-60">{String(from)}</span>}
                            {from !== null && from !== '' && <span>→</span>}
                            <span>{to !== null && to !== '' ? String(to) : <em>cleared</em>}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
