import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { BackupStatusBadge } from '@/components/shared/status-badge'
import { iconUrl } from '@/components/shared/icon-picker'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Server, Boxes, Cpu, HardDrive,
  Star, Box, ArrowUpRight, Activity,
  AlertTriangle,
} from 'lucide-react'

export const metadata = { title: 'Dashboard' }

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return 'Never run'
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60)    return 'Just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default async function DashboardPage() {
  const [services, devices, virtualHosts, backupJobs] = await Promise.all([
    prisma.service.findMany({
      where: { archived: false },
      include: { device: true, virtualHost: true, vm: true, lxc: true, dockerHost: true },
      orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
    }),
    prisma.device.findMany({
      where: { archived: false },
      select: { id: true, status: true },
    }),
    prisma.virtualHost.findMany({
      where: { archived: false },
      include: {
        vms:  { where: { archived: false }, select: { id: true, name: true, status: true, vmid: true, ip: true } },
        lxcs: { where: { archived: false }, select: { id: true, name: true, status: true, ctid: true, ip: true } },
      },
      orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
    }),
    prisma.backupJob.findMany({
      where: { archived: false },
      select: { id: true, name: true, status: true, lastRun: true },
      take: 6,
      orderBy: { lastRun: 'desc' },
    }),
  ])

  const vms  = virtualHosts.flatMap(h => h.vms)
  const lxcs = virtualHosts.flatMap(h => h.lxcs)

  const activeServices    = services.filter(s => s.status === 'ACTIVE').length
  const warningServices   = services.filter(s => s.status === 'WARNING').length
  const offlineServices   = services.filter(s => s.status === 'OFFLINE').length
  const unknownServices   = services.filter(s => s.status === 'UNKNOWN').length
  const buildingServices  = services.filter(s => s.status === 'BUILD_IN_PROGRESS').length
  const favouriteServices = services.filter(s => s.favourite)

  const onlineDevices     = devices.filter(d => d.status === 'ACTIVE').length
  const successfulBackups = backupJobs.filter(b => b.status === 'SUCCESS').length
  const failedBackups     = backupJobs.filter(b => b.status === 'FAILED').length

  const servicesByHost = services.reduce<Record<string, typeof services>>((acc, svc) => {
    const key = svc.dockerHost?.name ?? svc.lxc?.name ?? svc.vm?.name
      ?? svc.virtualHost?.name ?? svc.device?.name ?? 'Unassigned'
    if (!acc[key]) acc[key] = []
    acc[key].push(svc)
    return acc
  }, {})

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Dashboard" description="Your homelab at a glance" />

      <div className="page-container animate-fade-in">

        {/* ── KPI Row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

          <Link href="/services" className="kpi-card group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Boxes className="w-5 h-5 text-blue-400" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-transparent group-hover:text-muted-foreground transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-5xl font-bold tracking-tight tabular-nums leading-none">{services.length}</p>
              <p className="text-sm text-muted-foreground mt-2">Services</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeServices} active{warningServices > 0 && ` · ${warningServices} warning`}
              </p>
            </div>
          </Link>

          <Link href="/devices" className="kpi-card group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Server className="w-5 h-5 text-emerald-400" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-transparent group-hover:text-muted-foreground transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-5xl font-bold tracking-tight tabular-nums leading-none">{devices.length}</p>
              <p className="text-sm text-muted-foreground mt-2">Devices</p>
              <p className="text-xs text-muted-foreground mt-0.5">{onlineDevices} online</p>
            </div>
          </Link>

          <Link href="/virtualisation" className="kpi-card group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Cpu className="w-5 h-5 text-violet-400" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-transparent group-hover:text-muted-foreground transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-5xl font-bold tracking-tight tabular-nums leading-none">{vms.length + lxcs.length}</p>
              <p className="text-sm text-muted-foreground mt-2">VMs &amp; LXCs</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {virtualHosts.length} {virtualHosts.length === 1 ? 'host' : 'hosts'}
              </p>
            </div>
          </Link>

          <Link href="/backups" className="kpi-card group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <HardDrive className="w-5 h-5 text-amber-400" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-transparent group-hover:text-muted-foreground transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-5xl font-bold tracking-tight tabular-nums leading-none">{backupJobs.length}</p>
              <p className="text-sm text-muted-foreground mt-2">Backup Jobs</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {successfulBackups} successful{failedBackups > 0 && ` · ${failedBackups} failed`}
              </p>
            </div>
          </Link>

        </div>

        {/* ── Main 2-col Grid ──────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* ─── LEFT COLUMN (7/12) ────────────────────── */}
          <div className="xl:col-span-7 space-y-6">

            {/* Favourites */}
            {favouriteServices.length > 0 && (
              <div className="dash-section">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-semibold">Favourites</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">{favouriteServices.length}</span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {favouriteServices.map(svc => (
                    <ServiceRow key={svc.id} service={svc} />
                  ))}
                </div>
              </div>
            )}

            {/* Virtualisation */}
            {virtualHosts.length > 0 && (
              <div className="dash-section">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
                  <Cpu className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-sm font-semibold">Virtualisation</span>
                  <span className="text-xs text-muted-foreground tabular-nums ml-1">{virtualHosts.length}</span>
                  <Link href="/virtualisation" className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {virtualHosts.map(host => (
                    <Link
                      key={host.id}
                      href={`/virtualisation/hosts/${host.id}`}
                      className="group flex flex-col gap-3 p-4 rounded-xl border border-white/[0.05] bg-white/[0.02]
                                 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-150"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{host.name}</p>
                          {host.ip && <p className="text-xs font-mono text-muted-foreground mt-0.5">{host.ip}</p>}
                        </div>
                        <StatusBadge status={host.status} />
                      </div>
                      <div className="flex items-center gap-4 pt-2.5 border-t border-white/[0.05] text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3" />{host.vms.length} VM{host.vms.length !== 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1.5"><Box className="w-3 h-3" />{host.lxcs.length} LXC{host.lxcs.length !== 1 ? 's' : ''}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Services */}
            <div className="dash-section">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
                <Boxes className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-sm font-semibold">All Services</span>
                <span className="text-xs text-muted-foreground tabular-nums ml-1">{services.length}</span>
                <Link href="/services" className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all →
                </Link>
              </div>
              {services.length === 0 ? (
                <EmptyState icon={<Boxes className="w-8 h-8 text-muted-foreground/40" />} title="No services yet" description="Click Add New to register your first service." />
              ) : (
                <div className="p-4 space-y-5">
                  {Object.entries(servicesByHost).map(([host, svcs]) => (
                    <div key={host}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="section-heading">{host}</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {svcs.map(svc => <ServiceRow key={svc.id} service={svc} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ─── RIGHT COLUMN (5/12) ───────────────────── */}
          <div className="xl:col-span-5 space-y-6">

            {/* System Health */}
            <div className="dash-section">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-sm font-semibold">System Health</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {activeServices} / {services.length} active
                </span>
              </div>
              <div className="p-5">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No services to monitor.</p>
                ) : (
                  <>
                    {/* Segmented bar */}
                    <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.05] flex mb-5">
                      {activeServices > 0 && (
                        <div className="bg-emerald-500 h-full" style={{ width: `${(activeServices / services.length) * 100}%` }} />
                      )}
                      {warningServices > 0 && (
                        <div className="bg-amber-500 h-full" style={{ width: `${(warningServices / services.length) * 100}%` }} />
                      )}
                      {buildingServices > 0 && (
                        <div className="bg-blue-500 h-full" style={{ width: `${(buildingServices / services.length) * 100}%` }} />
                      )}
                      {offlineServices > 0 && (
                        <div className="bg-zinc-600 h-full" style={{ width: `${(offlineServices / services.length) * 100}%` }} />
                      )}
                    </div>

                    {/* Status rows */}
                    <div className="space-y-3">
                      {[
                        { label: 'Active',   dot: 'bg-emerald-400', count: activeServices   },
                        { label: 'Warning',  dot: 'bg-amber-400',   count: warningServices  },
                        { label: 'Building', dot: 'bg-blue-400',    count: buildingServices },
                        { label: 'Offline',  dot: 'bg-zinc-500',    count: offlineServices  },
                        { label: 'Unknown',  dot: 'bg-zinc-600',    count: unknownServices  },
                      ].filter(r => r.count > 0).map(({ label, dot, count }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
                          <span className="flex-1 text-sm text-muted-foreground">{label}</span>
                          <span className="text-sm font-semibold tabular-nums">{count}</span>
                          <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">
                            {Math.round((count / services.length) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Alert hint */}
                    {(warningServices > 0 || offlineServices > 0) && (
                      <div className="mt-5 pt-4 border-t border-border flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          {warningServices + offlineServices} service{warningServices + offlineServices !== 1 ? 's' : ''} need attention
                        </p>
                        <Link href="/services" className="ml-auto text-xs text-primary hover:opacity-80 transition-opacity">
                          Review →
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Recent Backups */}
            <div className="dash-section">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-sm font-semibold">Recent Backups</span>
                <Link href="/backups" className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all →
                </Link>
              </div>
              {backupJobs.length === 0 ? (
                <EmptyState icon={<HardDrive className="w-7 h-7 text-muted-foreground/40" />} title="No backup jobs" description="Configure backup jobs to protect your data." />
              ) : (
                <div className="divide-y divide-border">
                  {backupJobs.map(job => (
                    <Link
                      key={job.id}
                      href={`/backups/${job.id}`}
                      className="flex items-center gap-3 px-5 py-3 group hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{job.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{timeAgo(job.lastRun)}</p>
                      </div>
                      <BackupStatusBadge status={job.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shared inline components ── */

function ServiceRow({ service }: {
  service: {
    id: string
    name: string
    status: import('@prisma/client').Status
    category: string | null
    favourite: boolean
    icon: string | null
  }
}) {
  return (
    <Link
      href={`/services/${service.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent
                 hover:bg-white/[0.03] hover:border-white/[0.06] group transition-all duration-150"
    >
      {service.icon && (
        <img src={iconUrl(service.icon)} alt="" className="w-6 h-6 rounded object-contain shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{service.name}</p>
          {service.favourite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
        </div>
        {service.category && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.category}</p>
        )}
      </div>
      <StatusBadge status={service.status} />
    </Link>
  )
}

function EmptyState({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
      <div className="mb-1 opacity-60">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-[200px]">{description}</p>
    </div>
  )
}
