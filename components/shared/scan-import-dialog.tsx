'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScanLine, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HostInfo {
  hostname: string | null
  os: string | null
  ips: string[]
}

interface DockerServiceInfo {
  name: string
  containerName: string | null
  image: string | null
  runningStatus: string | null
  ports: string[]
  bindMounts: string[]
  namedVolumes: string[]
  envVarNames: string[]
}

interface AppInfo {
  appName: string
  stackFolder: string | null
  composeFile: string | null
  services: DockerServiceInfo[]
  envVarsFromDotenv: string[]
}

interface ScanResult {
  hostInfo: HostInfo
  apps: AppInfo[]
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function trimStr(s: string) { return s.trim() }
function isNone(s: string) { return s.toLowerCase() === 'none' }
// True if this raw line is an indented list item (2+ spaces then -)
function isListItem(raw: string) { return /^\s{2,}-/.test(raw) }
// True if an IP string looks like a real IP (not a docker/loopback one we want to skip)
function looksLikeIp(s: string) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(s.split('/')[0]) }

function parseHostInfo(block: string): HostInfo {
  const info: HostInfo = { hostname: null, os: null, ips: [] }
  let inIps = false

  for (const raw of block.split('\n')) {
    const line = raw.trim()
    if (!line) { inIps = false; continue }
    if (line.startsWith('#') || line.startsWith('=')) { inIps = false; continue }

    // Indented list item under IP Addresses
    if (isListItem(raw) && inIps) {
      const ip = line.replace(/^-\s*/, '').trim().split('/')[0]
      if (ip && !isNone(ip) && looksLikeIp(ip)) info.ips.push(ip)
      continue
    }

    // Non-indented list item or interface line — stop IP collection
    if (!isListItem(raw) && inIps && !line.startsWith('-')) { inIps = false }

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).replace(/^-\s*/, '').toLowerCase().trim()
    const val = line.slice(colonIdx + 1).trim()

    if (key === 'hostname')                                  { info.hostname = val || null; inIps = false }
    else if (key === 'os')                                   { info.os = val || null; inIps = false }
    else if (key === 'ip addresses' || key === 'ip address') { inIps = true }
    else if (inIps && val && looksLikeIp(val.split('/')[0])) { info.ips.push(val.split('/')[0]); inIps = false }
    else if (inIps && val)                                   { inIps = false } // non-IP value, stop
  }
  return info
}

function parseDockerService(block: string): DockerServiceInfo {
  const rawLines = block.split('\n')
  const svc: DockerServiceInfo = {
    name: trimStr(rawLines[0] ?? ''),
    containerName: null, image: null, runningStatus: null,
    ports: [], bindMounts: [], namedVolumes: [], envVarNames: [],
  }
  let section = ''

  for (const raw of rawLines.slice(1)) {
    const line = raw.trim()
    if (!line) continue

    // Indented list items (  - value) — may contain colons (ports, mounts)
    if (isListItem(raw)) {
      const val = line.replace(/^-\s*/, '').trim()
      if (val && !isNone(val)) {
        switch (section) {
          case 'ports':                    svc.ports.push(val); break
          case 'bind mounts':             svc.bindMounts.push(val); break
          case 'named volumes':           svc.namedVolumes.push(val); break
          case 'environment variable names': svc.envVarNames.push(val); break
        }
      }
      continue
    }

    // Top-level field: "- Key: value" or "- Section:"
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).replace(/^-\s*/, '').toLowerCase().trim()
    const val = line.slice(colonIdx + 1).trim()

    if (val) {
      section = '' // inline value — not entering a list section
      switch (key) {
        case 'container name':  svc.containerName = val; break
        case 'image':           svc.image = val; break
        case 'running status':  svc.runningStatus = val; break
      }
    } else {
      section = key // section header, list items follow
    }
  }
  return svc
}

function parseAppBlock(block: string): AppInfo {
  const app: AppInfo = { appName: '', stackFolder: null, composeFile: null, services: [], envVarsFromDotenv: [] }

  // App name from first line "APP: immich" — preserve original case
  const firstLine = block.split('\n')[0]
  if (/^APP:/i.test(firstLine)) app.appName = trimStr(firstLine.replace(/^APP:\s*/i, ''))

  // Split by ## headings
  for (const sec of block.split(/^## /m)) {
    const secTitle = sec.split('\n')[0].toLowerCase().trim()
    const body = sec.split('\n').slice(1).join('\n')

    if (secTitle === 'overview') {
      for (const raw of body.split('\n')) {
        const line = raw.trim()
        const ci = line.indexOf(':')
        if (ci === -1) continue
        const key = line.slice(0, ci).replace(/^-\s*/, '').toLowerCase().trim()
        const val = line.slice(ci + 1).trim()
        if (!val) continue
        if (key === 'app name' && !app.appName) app.appName = val
        if (key === 'stack folder') app.stackFolder = val
        if (key === 'compose file' || key === 'compose file path') app.composeFile = val
      }
    }

    if (secTitle === 'docker services') {
      for (const ds of body.split(/^### /m).filter(s => s.trim())) {
        const svc = parseDockerService(ds)
        if (svc.name) app.services.push(svc)
      }
    }

    if (secTitle === 'stack-level info') {
      let inVars = false
      for (const raw of body.split('\n')) {
        const line = raw.trim()
        if (!line) continue
        const lc = line.toLowerCase()
        if (lc.includes('variables from .env') || lc.includes('variables from dotenv')) { inVars = true; continue }
        if (line.startsWith('##') || line.startsWith('- All')) { inVars = false }
        if (inVars) {
          const val = line.replace(/^-\s*/, '').trim()
          if (val && !isNone(val)) app.envVarsFromDotenv.push(val)
        }
      }
    }
  }

  return app
}

function parseScanOutput(raw: string): ScanResult {
  const result: ScanResult = { hostInfo: { hostname: null, os: null, ips: [] }, apps: [] }
  if (!raw.trim()) return result

  const chunks = raw.split(/={10,}/).map(c => c.trim()).filter(Boolean)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const firstLine = chunk.split('\n')[0].trim()
    const upperFirst = firstLine.toUpperCase()

    if (upperFirst === 'HOST INFO') {
      result.hostInfo = parseHostInfo(chunks[i + 1] ?? '')
    } else if (/^APP:/i.test(firstLine)) {
      // Preserve original case for app name
      const appName = firstLine.replace(/^APP:\s*/i, '').trim()
      const body = chunks[i + 1] ?? ''
      const app = parseAppBlock(`APP: ${appName}\n${body}`)
      if (!app.appName) app.appName = appName
      result.apps.push(app)
    }
  }

  // Fallback: scan for inline APP: blocks
  if (result.apps.length === 0) {
    for (const block of raw.split(/^APP:\s*/m).slice(1)) {
      const app = parseAppBlock(`APP: ${block}`)
      if (app.appName || app.stackFolder) result.apps.push(app)
    }
  }

  return result
}

// Pick the "primary" docker service for a given app (the one with a port, or the first)
function primaryService(app: AppInfo): DockerServiceInfo | null {
  if (app.services.length === 0) return null
  const withPort = app.services.find(s => s.ports.length > 0)
  const matchingName = app.services.find(s =>
    s.name.toLowerCase().includes(app.appName.toLowerCase()) ||
    (s.containerName ?? '').toLowerCase().includes(app.appName.toLowerCase())
  )
  return withPort ?? matchingName ?? app.services[0]
}

function extractHostPort(portStr: string): number | null {
  const m = portStr.match(/^(\d+):/)
  return m ? parseInt(m[1], 10) : null
}

// ─── Preview card ─────────────────────────────────────────────────────────────

function AppPreviewCard({ app, selected, onToggle }: { app: AppInfo; selected: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const primary = primaryService(app)
  const allPorts = app.services.flatMap(s => s.ports)
  const mainPort = allPorts.length > 0 ? extractHostPort(allPorts[0]) : null
  const allImages = [...new Set(app.services.map(s => s.image).filter(Boolean))]
  const allBindMounts = [...new Set(app.services.flatMap(s => s.bindMounts))]
  const allEnvVars = [...new Set([...app.envVarsFromDotenv, ...app.services.flatMap(s => s.envVarNames)])]

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      selected ? 'border-primary/50 bg-primary/5' : 'border-border'
    )}>
      <button
        className="flex items-start gap-3 w-full p-3.5 text-left"
        onClick={onToggle}
      >
        <div className={cn(
          'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
          selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
        )}>
          {selected && <div className="w-2 h-2 rounded-sm bg-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{app.appName || '(unnamed)'}</p>
          {app.stackFolder && <p className="text-xs font-mono text-muted-foreground mt-0.5">{app.stackFolder}</p>}
          <div className="flex flex-wrap gap-2 mt-1.5">
            {mainPort && <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">:{mainPort}</span>}
            {app.services.length > 0 && <span className="text-xs text-muted-foreground">{app.services.length} container{app.services.length !== 1 ? 's' : ''}</span>}
            {allEnvVars.length > 0 && <span className="text-xs text-muted-foreground">{allEnvVars.length} env vars</span>}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setExpanded(x => !x) }}
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-2 border-t border-border pt-3">
          {allImages.length > 0 && (
            <div><span className="text-xs text-muted-foreground">Images: </span><span className="text-xs font-mono">{allImages.join(', ')}</span></div>
          )}
          {allPorts.length > 0 && (
            <div><span className="text-xs text-muted-foreground">Ports: </span><span className="text-xs font-mono">{allPorts.join(', ')}</span></div>
          )}
          {allBindMounts.length > 0 && (
            <div><span className="text-xs text-muted-foreground">Mounts: </span><span className="text-xs font-mono">{allBindMounts.join(', ')}</span></div>
          )}
          {allEnvVars.length > 0 && (
            <div><span className="text-xs text-muted-foreground">Env vars: </span><span className="text-xs font-mono">{allEnvVars.join(', ')}</span></div>
          )}
          {app.services.length > 1 && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Containers:</p>
              {app.services.map(s => (
                <p key={s.name} className="text-xs font-mono ml-2">{s.name} {s.runningStatus ? `— ${s.runningStatus}` : ''}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface ScanImportDialogProps {
  linkVmId?: string
  linkVirtualHostId?: string
}

export function ScanImportDialog({ linkVmId, linkVirtualHostId }: ScanImportDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string[]>([])

  function handlePaste(text: string) {
    setRaw(text)
    setDone([])
    setError('')
    if (text.trim()) {
      const parsed = parseScanOutput(text)
      setResult(parsed)
      setSelected(new Set(parsed.apps.map((_, i) => i)))
    } else {
      setResult(null)
      setSelected(new Set())
    }
  }

  function toggleApp(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function importSelected() {
    if (!result || selected.size === 0) return
    setSaving(true)
    setError('')
    const created: string[] = []

    for (const idx of Array.from(selected)) {
      const app = result.apps[idx]
      const primary = primaryService(app)
      const allPorts = app.services.flatMap(s => s.ports)
      const mainPort = allPorts.length > 0 ? extractHostPort(allPorts[0]) : null
      const allBindMounts = [...new Set(app.services.flatMap(s => s.bindMounts))]
      const allEnvVars = [...new Set([...app.envVarsFromDotenv, ...app.services.flatMap(s => s.envVarNames)])]

      const ip = result.hostInfo.ips.find(ip =>
        !ip.startsWith('172.') && !ip.startsWith('127.')
      ) ?? result.hostInfo.ips[0] ?? null

      const body: Record<string, unknown> = {
        name: app.appName || app.stackFolder?.split('/').pop() || 'Imported App',
        status: 'ACTIVE',
        ip: ip,
        port: mainPort ?? undefined,
        stackFolder: app.stackFolder ?? undefined,
        composeFilePath: app.composeFile ?? undefined,
        containerImage: primary?.image ?? undefined,
        bindMounts: allBindMounts.length > 0 ? allBindMounts.join('\n') : undefined,
        envVars: allEnvVars.length > 0 ? allEnvVars.map(k => `${k}=`).join('\n') : undefined,
        setupNotes: primary?.runningStatus ? `Container status: ${primary.runningStatus}` : undefined,
      }

      // Link to parent
      if (linkVmId) body.vmId = linkVmId
      else if (linkVirtualHostId) body.virtualHostId = linkVirtualHostId

      try {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setError(`Failed to create "${body.name}": ${d.error ?? 'unknown error'}`)
          setSaving(false)
          return
        }
        created.push(body.name as string)
      } catch {
        setError(`Network error creating "${body.name}"`)
        setSaving(false)
        return
      }
    }

    setDone(created)
    setSaving(false)
    router.refresh()
  }

  function handleClose() {
    setOpen(false)
    setRaw('')
    setResult(null)
    setSelected(new Set())
    setDone([])
    setError('')
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ScanLine className="w-3.5 h-3.5" />
        Import from scan
      </Button>

      <Dialog open={open} onOpenChange={o => !o && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from host scan</DialogTitle>
            <DialogDescription>
              Paste the output of your homelab scan script. HomeStack will detect each app and create service entries automatically.
            </DialogDescription>
          </DialogHeader>

          {done.length > 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <div>
                <p className="font-medium">Import complete</p>
                <p className="text-sm text-muted-foreground mt-1">Created: {done.join(', ')}</p>
              </div>
              <Button onClick={handleClose}>Close</Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Paste area */}
              <Textarea
                className="font-mono text-xs h-48"
                placeholder={`Paste your scan output here…\n\nHOST INFO\n================================\n- Hostname: myserver\n- OS: Ubuntu 24.04\n- IP Addresses:\n  - 10.10.1.100\n\nAPP: myapp\n================================\n## Overview\n- Stack Folder: /root/myapp\n...`}
                value={raw}
                onChange={e => handlePaste(e.target.value)}
              />

              {/* Host info */}
              {result && (result.hostInfo.hostname || result.hostInfo.ips.length > 0) && (
                <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detected host</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {result.hostInfo.hostname && <span className="font-mono">{result.hostInfo.hostname}</span>}
                    {result.hostInfo.os && <span className="text-muted-foreground">{result.hostInfo.os}</span>}
                    {result.hostInfo.ips.length > 0 && <span className="font-mono text-muted-foreground">{result.hostInfo.ips[0]}</span>}
                  </div>
                </div>
              )}

              {/* Apps */}
              {result && result.apps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Found {result.apps.length} app{result.apps.length !== 1 ? 's' : ''}</p>
                    <button
                      onClick={() => setSelected(
                        selected.size === result.apps.length
                          ? new Set()
                          : new Set(result.apps.map((_, i) => i))
                      )}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selected.size === result.apps.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {result.apps.map((app, i) => (
                      <AppPreviewCard
                        key={i}
                        app={app}
                        selected={selected.has(i)}
                        onToggle={() => toggleApp(i)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {result && result.apps.length === 0 && raw.trim() && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No apps detected. Make sure the output contains <code className="font-mono text-xs bg-muted px-1 rounded">APP: name</code> sections.
                </p>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={importSelected}
                  disabled={saving || selected.size === 0}
                >
                  {saving ? `Importing…` : `Import ${selected.size} app${selected.size !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
