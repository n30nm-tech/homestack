'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Shield, GitBranch, Wifi, Router, Server, HardDrive, Box, RefreshCw } from 'lucide-react'
import { iconUrl } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Sparkline = ('up' | 'down' | 'none')[]

interface UptimeItem {
  id: string
  name: string
  online: boolean | null
  responseMs: number | null
  avgMs: number | null
  checkedAt: string | null
  uptime24h: number | null
  uptime7d: number | null
  sparkline: Sparkline
}

interface ServiceItem extends UptimeItem {
  url: string | null
  icon: string | null
  category: string | null
}

interface DeviceItem extends UptimeItem {
  type: string
  ip: string | null
}

interface StatusData {
  services: ServiceItem[]
  devices: DeviceItem[]
  lastRun: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEVICE_ICONS: Record<string, React.ElementType> = {
  FIREWALL: Shield, ROUTER: Router, SWITCH: GitBranch,
  ACCESS_POINT: Wifi, SERVER: Server, NAS: HardDrive, OTHER: Box,
}

const DEVICE_COLORS: Record<string, string> = {
  FIREWALL: 'text-red-400', ROUTER: 'text-orange-400', SWITCH: 'text-blue-400',
  ACCESS_POINT: 'text-cyan-400', SERVER: 'text-green-400', NAS: 'text-amber-400', OTHER: 'text-zinc-400',
}

function StatusDot({ online }: { online: boolean | null }) {
  if (online === null) return <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 shrink-0" title="Never checked" />
  return online
    ? <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] shrink-0 animate-pulse" />
    : <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] shrink-0" />
}

function UptimePct({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>
  const color = value >= 99 ? 'text-green-400' : value >= 95 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-xs font-mono font-medium ${color}`}>{value}%</span>
}

function Sparkline({ data }: { data: Sparkline }) {
  return (
    <div className="flex gap-px items-end h-6" title="Last 24 hours (each bar = 1 hour, left = oldest)">
      {data.map((slot, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${
            slot === 'up'   ? 'bg-green-500 h-full' :
            slot === 'down' ? 'bg-red-500 h-full' :
                              'bg-zinc-700 h-2'
          }`}
        />
      ))}
    </div>
  )
}

function ResponseMs({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="text-xs text-muted-foreground">—</span>
  const color = ms < 200 ? 'text-green-400' : ms < 800 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-xs font-mono ${color}`}>{ms}ms</span>
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (secs < 60)  return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

// ── Row components ─────────────────────────────────────────────────────────────

function ServiceRow({ item }: { item: ServiceItem }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <StatusDot online={item.online} />

      {/* Icon + name */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {item.icon
          ? <img src={iconUrl(item.icon)} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
          : <div className="w-5 h-5 rounded bg-muted shrink-0" />
        }
        <Link href={`/services/${item.id}`} className="text-sm font-medium hover:text-primary transition-colors truncate">
          {item.name}
        </Link>
        {item.category && (
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{item.category}</span>
        )}
      </div>

      {/* Sparkline */}
      <div className="w-24 hidden md:block shrink-0">
        <Sparkline data={item.sparkline} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 shrink-0">
        <div className="hidden lg:flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg</span>
          <ResponseMs ms={item.avgMs} />
        </div>
        <div className="flex flex-col items-end w-14">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">24h</span>
          <UptimePct value={item.uptime24h} />
        </div>
        <div className="flex flex-col items-end w-14">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">7d</span>
          <UptimePct value={item.uptime7d} />
        </div>
      </div>
    </div>
  )
}

function DeviceRow({ item }: { item: DeviceItem }) {
  const Icon  = DEVICE_ICONS[item.type]  ?? Box
  const color = DEVICE_COLORS[item.type] ?? 'text-zinc-400'
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <StatusDot online={item.online} />

      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 ${color}`} />
        <Link href={`/devices/${item.id}`} className="text-sm font-medium hover:text-primary transition-colors truncate">
          {item.name}
        </Link>
        {item.ip && (
          <span className="text-xs font-mono text-muted-foreground shrink-0 hidden sm:block">{item.ip}</span>
        )}
      </div>

      <div className="w-24 hidden md:block shrink-0">
        <Sparkline data={item.sparkline} />
      </div>

      <div className="flex items-center gap-5 shrink-0">
        <div className="hidden lg:flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg</span>
          <ResponseMs ms={item.avgMs} />
        </div>
        <div className="flex flex-col items-end w-14">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">24h</span>
          <UptimePct value={item.uptime24h} />
        </div>
        <div className="flex flex-col items-end w-14">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">7d</span>
          <UptimePct value={item.uptime7d} />
        </div>
      </div>
    </div>
  )
}

// ── Main client component ──────────────────────────────────────────────────────

export function UptimeClient({ initial }: { initial: StatusData }) {
  const [data, setData]         = useState<StatusData>(initial)
  const [loading, setLoading]   = useState(false)
  const [countdown, setCountdown] = useState(60)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/uptime/status')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
      setCountdown(60)
    }
  }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { refresh(); return 60 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [refresh])

  const totalOnline  = [...data.services, ...data.devices].filter(i => i.online === true).length
  const totalMonitored = [...data.services, ...data.devices].filter(i => i.online !== null).length
  const allItems     = [...data.services, ...data.devices]
  const overallUptime = allItems.length
    ? Math.round(allItems.reduce((s, i) => s + (i.uptime24h ?? 100), 0) / allItems.length * 10) / 10
    : null

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="section-card flex flex-wrap items-center gap-6">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Online now</p>
          <p className="text-2xl font-semibold mt-0.5">
            {totalOnline}
            <span className="text-base text-muted-foreground font-normal"> / {totalMonitored}</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">24h uptime</p>
          <p className={`text-2xl font-semibold mt-0.5 ${overallUptime === null ? 'text-muted-foreground' : overallUptime >= 99 ? 'text-green-400' : overallUptime >= 95 ? 'text-amber-400' : 'text-red-400'}`}>
            {overallUptime !== null ? `${overallUptime}%` : '—'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Last poll: {timeAgo(data.lastRun)}</p>
            <p className="text-[11px] text-muted-foreground">Refresh in {countdown}s</p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-4 px-5 py-2 text-[10px] text-muted-foreground uppercase tracking-wider">
        <div className="w-2.5 shrink-0" />
        <div className="flex-1">Name</div>
        <div className="w-24 hidden md:block shrink-0">Last 24h</div>
        <div className="flex items-center gap-5 shrink-0">
          <div className="hidden lg:block w-12 text-right">Avg</div>
          <div className="w-14 text-right">24h</div>
          <div className="w-14 text-right">7d</div>
        </div>
      </div>

      {/* Services section */}
      {data.services.length > 0 && (
        <div className="section-card overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold">Services <span className="text-muted-foreground font-normal">({data.services.length})</span></p>
          </div>
          {data.services.map(item => <ServiceRow key={item.id} item={item} />)}
        </div>
      )}

      {/* Devices section */}
      {data.devices.length > 0 && (
        <div className="section-card overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold">Devices <span className="text-muted-foreground font-normal">({data.devices.length})</span></p>
          </div>
          {data.devices.map(item => <DeviceRow key={item.id} item={item} />)}
        </div>
      )}

      {data.services.length === 0 && data.devices.length === 0 && (
        <div className="section-card text-center py-16">
          <p className="text-sm text-muted-foreground">No monitorable items found. Add a URL or IP to a service or device.</p>
        </div>
      )}

      {/* Cron hint — only shows if never polled */}
      {data.lastRun === null && (
        <div className="section-card border-amber-500/20 bg-amber-500/5 space-y-2">
          <p className="text-sm font-medium text-amber-400">No checks run yet</p>
          <p className="text-xs text-muted-foreground">
            Trigger the first check manually, then set up a cron job on your LXC to poll every 2 minutes:
          </p>
          <code className="block text-xs font-mono bg-muted rounded-lg px-4 py-3 text-foreground">
            # Trigger once now{'\n'}
            curl -X POST http://localhost:3000/api/uptime/run{'\n\n'}
            # Add to crontab (crontab -e){'\n'}
            */2 * * * * curl -s -X POST http://localhost:3000/api/uptime/run
          </code>
        </div>
      )}
    </div>
  )
}
