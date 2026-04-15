'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/status-badge'
import { TagList } from '@/components/shared/tag-badge'
import { DEVICE_TYPE_LABELS } from '@/lib/utils'
import { DeviceType } from '@prisma/client'
import {
  Shield, GitBranch, Wifi, Router, Server, HardDrive, Box,
  LayoutGrid, List,
} from 'lucide-react'

type Device = {
  id: string
  name: string
  type: DeviceType
  brand: string | null
  model: string | null
  managementIp: string | null
  location: string | null
  status: string
  favourite: boolean
  tags: { id: string; name: string; colour: string | null }[]
}

// ── Per-type config ──────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<DeviceType, { icon: React.ElementType; bg: string; text: string; border: string }> = {
  FIREWALL:     { icon: Shield,    bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20' },
  ROUTER:       { icon: Router,    bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  SWITCH:       { icon: GitBranch, bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  ACCESS_POINT: { icon: Wifi,      bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   border: 'border-cyan-500/20' },
  SERVER:       { icon: Server,    bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20' },
  NAS:          { icon: HardDrive, bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
  OTHER:        { icon: Box,       bg: 'bg-zinc-500/10',   text: 'text-zinc-400',   border: 'border-zinc-500/20' },
}

const TYPE_ORDER: DeviceType[] = ['FIREWALL', 'ROUTER', 'SWITCH', 'ACCESS_POINT', 'SERVER', 'NAS', 'OTHER']

function DeviceCard({ device }: { device: Device }) {
  const cfg = TYPE_CONFIG[device.type]
  const Icon = cfg.icon
  return (
    <Link
      href={`/devices/${device.id}`}
      className="section-card hover:border-border/80 transition-colors group flex gap-4 items-start"
    >
      {/* Type icon */}
      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${cfg.bg} ${cfg.border} border`}>
        <Icon className={`w-4.5 h-4.5 ${cfg.text}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-medium group-hover:text-primary transition-colors truncate">{device.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {DEVICE_TYPE_LABELS[device.type]}
              {device.brand && ` — ${device.brand}`}
              {device.model && ` ${device.model}`}
            </p>
          </div>
          <StatusBadge status={device.status as any} className="shrink-0" />
        </div>
        {device.managementIp && (
          <p className="text-xs font-mono text-muted-foreground">{device.managementIp}</p>
        )}
        {device.location && (
          <p className="text-xs text-muted-foreground">{device.location}</p>
        )}
        {device.tags.length > 0 && <TagList tags={device.tags} />}
      </div>
    </Link>
  )
}

export function DevicesClient({ devices }: { devices: Device[] }) {
  const [grouped, setGrouped] = useState(true)

  // Build groups in a fixed order, only including types that have devices
  const groups = TYPE_ORDER
    .map(type => ({ type, items: devices.filter(d => d.type === type) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setGrouped(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${grouped ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="w-3.5 h-3.5" /> Grouped
          </button>
          <button
            onClick={() => setGrouped(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors border-l border-border ${!grouped ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> All
          </button>
        </div>
      </div>

      {grouped ? (
        // Grouped view
        <div className="space-y-8">
          {groups.map(({ type, items }) => {
            const cfg = TYPE_CONFIG[type]
            const Icon = cfg.icon
            return (
              <section key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${cfg.bg} ${cfg.border} border`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                  </div>
                  <h2 className="text-sm font-semibold">{DEVICE_TYPE_LABELS[type]}</h2>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {items.map(device => <DeviceCard key={device.id} device={device} />)}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        // Flat grid
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map(device => <DeviceCard key={device.id} device={device} />)}
        </div>
      )}
    </div>
  )
}
