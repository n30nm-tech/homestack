import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { VHOST_TYPE_LABELS, formatMB } from '@/lib/utils'
import Link from 'next/link'
import { Cpu, Server, Box, Container } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Virtualisation' }

export default async function VirtualisationPage() {
  const [hosts, vms, lxcs, dockerHosts] = await Promise.all([
    prisma.virtualHost.findMany({
      where: { archived: false },
      include: {
        device: { select: { id: true, name: true } },
        vms: { select: { id: true, name: true, status: true } },
        lxcs: { select: { id: true, name: true, status: true } },
      },
      orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
    }),
    prisma.vM.findMany({ where: { archived: false }, include: { host: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }),
    prisma.lXC.findMany({ where: { archived: false }, include: { host: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }),
    prisma.dockerHost.findMany({ where: { archived: false }, include: { vm: { select: { id: true, name: true } }, lxc: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Virtualisation" description={`${hosts.length} hosts, ${vms.length} VMs, ${lxcs.length} LXCs, ${dockerHosts.length} Docker hosts`} />

      <div className="page-container animate-fade-in space-y-8">
        {/* Hosts */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Virtualisation Hosts</h2>
            <span className="text-xs text-muted-foreground ml-1">{hosts.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hosts.map(host => (
              <Link key={host.id} href={`/virtualisation/hosts/${host.id}`} className="section-card hover:border-border/80 transition-colors space-y-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium group-hover:text-primary transition-colors truncate">{host.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {VHOST_TYPE_LABELS[host.type]}
                      {host.device && ` — ${host.device.name}`}
                    </p>
                  </div>
                  <StatusBadge status={host.status} className="shrink-0" />
                </div>
                {host.ip && <p className="text-xs font-mono text-muted-foreground">{host.ip}</p>}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{host.vms.length} VMs</span>
                  <span>{host.lxcs.length} LXCs</span>
                </div>
              </Link>
            ))}
            {hosts.length === 0 && <p className="text-sm text-muted-foreground col-span-3">No hosts yet.</p>}
          </div>
        </section>

        {/* VMs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Virtual Machines</h2>
            <span className="text-xs text-muted-foreground ml-1">{vms.length}</span>
          </div>
          {vms.length > 0 ? (
            <div className="section-card overflow-hidden p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Host</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">IP</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Specs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vms.map(vm => (
                    <tr key={vm.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/virtualisation/vms/${vm.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                          {vm.name}
                        </Link>
                        {vm.vmid && <span className="ml-2 text-xs text-muted-foreground font-mono">VM{vm.vmid}</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell"><StatusBadge status={vm.status} /></td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <Link href={`/virtualisation/hosts/${vm.host.id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{vm.host.name}</Link>
                      </td>
                      <td className="px-5 py-3.5 hidden xl:table-cell"><span className="text-sm font-mono text-muted-foreground">{vm.ip ?? '—'}</span></td>
                      <td className="px-5 py-3.5 hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {vm.cpu && `${vm.cpu} vCPU`}
                          {vm.ram && ` · ${formatMB(vm.ram)}`}
                          {vm.disk && ` · ${vm.disk}GB`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground">No VMs yet.</p>}
        </section>

        {/* LXCs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">LXC Containers</h2>
            <span className="text-xs text-muted-foreground ml-1">{lxcs.length}</span>
          </div>
          {lxcs.length > 0 ? (
            <div className="section-card overflow-hidden p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Host</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lxcs.map(lxc => (
                    <tr key={lxc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/virtualisation/lxcs/${lxc.id}`} className="text-sm font-medium hover:text-primary transition-colors">{lxc.name}</Link>
                        {lxc.ctid && <span className="ml-2 text-xs text-muted-foreground font-mono">CT{lxc.ctid}</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell"><StatusBadge status={lxc.status} /></td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <Link href={`/virtualisation/hosts/${lxc.host.id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{lxc.host.name}</Link>
                      </td>
                      <td className="px-5 py-3.5 hidden xl:table-cell"><span className="text-sm font-mono text-muted-foreground">{lxc.ip ?? '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground">No LXCs yet.</p>}
        </section>

        {/* Docker Hosts */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Container className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Docker Hosts</h2>
            <span className="text-xs text-muted-foreground ml-1">{dockerHosts.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dockerHosts.map(dh => (
              <Link key={dh.id} href={`/virtualisation/docker/${dh.id}`} className="section-card hover:border-border/80 transition-colors space-y-2 group">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium group-hover:text-primary transition-colors">{dh.name}</h3>
                  <StatusBadge status={dh.status} className="shrink-0" />
                </div>
                {dh.ip && <p className="text-xs font-mono text-muted-foreground">{dh.ip}</p>}
                {(dh.vm || dh.lxc) && (
                  <p className="text-xs text-muted-foreground">
                    Runs on: {dh.vm?.name ?? dh.lxc?.name}
                  </p>
                )}
              </Link>
            ))}
            {dockerHosts.length === 0 && <p className="text-sm text-muted-foreground col-span-3">No Docker hosts yet.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
