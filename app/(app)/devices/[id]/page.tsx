import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { TagList } from '@/components/shared/tag-badge'
import { DetailField, DetailGrid } from '@/components/shared/detail-field'
import { DeviceEditForm } from './device-edit-form'
import { DEVICE_TYPE_LABELS, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const device = await prisma.device.findUnique({ where: { id: id }, select: { name: true } })
  return { title: device?.name ?? 'Device' }
}

export default async function DeviceDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const device = await prisma.device.findUnique({
    where: { id: id, archived: false },
    include: {
      tags: true,
      vlans: true,
      services: { select: { id: true, name: true, status: true, url: true } },
      virtualHosts: { select: { id: true, name: true, type: true, status: true } },
      backupJobs: { select: { id: true, name: true, status: true } },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!device) notFound()

  return (
    <div className="flex flex-col min-h-full">
      <Header title={device.name} />

      <div className="page-container animate-fade-in space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">{DEVICE_TYPE_LABELS[device.type]}</span>
              <StatusBadge status={device.status} />
              <TagList tags={device.tags} />
            </div>
          </div>
          <DeviceEditForm device={device} />
        </div>

        <div className="section-card space-y-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <DetailGrid>
            <DetailField label="Type" value={DEVICE_TYPE_LABELS[device.type]} />
            <DetailField label="Status" value={<StatusBadge status={device.status} />} />
            {(device.brand || device.model) && <DetailField label="Hardware" value={[device.brand, device.model].filter(Boolean).join(' ')} />}
            <DetailField label="Hostname" value={device.hostname} mono />
            <DetailField label="Management IP" value={device.managementIp} mono />
            <DetailField label="Main IP" value={device.mainIp} mono />
            <DetailField label="MAC Address" value={device.macAddress} mono />
            <DetailField label="Serial Number" value={device.serialNumber} mono />
            <DetailField label="Location" value={device.location} />
            <DetailField label="Rack / Room" value={device.rackRoom} />
            <DetailField label="Role" value={device.role} />
            <DetailField label="OS / Firmware" value={device.os} />
            <DetailField label="Ports" value={device.ports} />
          </DetailGrid>
        </div>

        {device.vlans.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">VLANs</h2>
            <div className="space-y-2">
              {device.vlans.map(vlan => (
                <div key={vlan.id} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">VLAN {vlan.vlanId}</span>
                  <span>{vlan.name}</span>
                  {vlan.subnet && <span className="text-muted-foreground font-mono text-xs">{vlan.subnet}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {device.virtualHosts.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Virtualisation Hosts</h2>
            <div className="space-y-2">
              {device.virtualHosts.map(host => (
                <div key={host.id} className="flex items-center gap-3">
                  <Link href={`/virtualisation/hosts/${host.id}`} className="text-sm hover:text-primary transition-colors">{host.name}</Link>
                  <StatusBadge status={host.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {device.services.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Services</h2>
            <div className="space-y-2">
              {device.services.map(svc => (
                <div key={svc.id} className="flex items-center gap-3">
                  <Link href={`/services/${svc.id}`} className="text-sm hover:text-primary transition-colors">{svc.name}</Link>
                  <StatusBadge status={svc.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {device.backupJobs.length > 0 && (
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold">Backup Jobs</h2>
            <div className="space-y-2">
              {device.backupJobs.map(job => (
                <div key={job.id} className="flex items-center gap-3">
                  <Link href={`/backups/${job.id}`} className="text-sm hover:text-primary transition-colors">{job.name}</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {device.notes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{device.notes}</p>
          </div>
        )}

        {device.setupNotes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Setup Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{device.setupNotes}</p>
          </div>
        )}

        {device.troubleshootingNotes && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Troubleshooting</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{device.troubleshootingNotes}</p>
          </div>
        )}

        {device.auditLogs.length > 0 && (
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold">Change History</h2>
            <div className="space-y-2">
              {device.auditLogs.map(log => (
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
