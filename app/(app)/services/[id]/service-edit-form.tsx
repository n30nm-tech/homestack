'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit, Star, Archive, Trash2, Upload, Sparkles, Check } from 'lucide-react'
import { IconPicker } from '@/components/shared/icon-picker'
import { cn } from '@/lib/utils'

interface NamedItem { id: string; name: string }

interface ServiceEditFormProps {
  service: {
    id: string
    name: string
    url: string | null
    description: string | null
    ip: string | null
    port: number | null
    category: string | null
    status: string
    favourite: boolean
    archived: boolean
    icon: string | null
    ctid: string | null
    hasDocker: boolean
    containerImage: string | null
    stackFolder: string | null
    composeFilePath: string | null
    bindMounts: string | null
    dockerCompose: string | null
    envVars: string | null
    setupSteps: string | null
    runCommands: string | null
    reverseProxyConfig: string | null
    notes: string | null
    setupNotes: string | null
    troubleshootingNotes: string | null
    extraInfo: string | null
    // hosting relationship IDs
    vmId: string | null
    virtualHostId: string | null
    deviceId: string | null
  }
}

type HostingType = 'lxc' | 'vm' | 'virtualhost' | 'device' | 'none'

function detectHostingType(svc: ServiceEditFormProps['service']): HostingType {
  if (svc.virtualHostId && svc.ctid) return 'lxc'
  if (svc.vmId) return 'vm'
  if (svc.virtualHostId) return 'virtualhost'
  if (svc.deviceId) return 'device'
  return 'none'
}

// Very simple docker-compose parser — no heavy YAML lib needed
function parseCompose(yaml: string): {
  image?: string
  ports: string[]
  volumes: string[]
  envLines: string[]
} {
  const lines = yaml.split('\n')
  let inServices = false
  let inFirstService = false
  let currentSection = ''
  const result: { image?: string; ports: string[]; volumes: string[]; envLines: string[] } = { ports: [], volumes: [], envLines: [] }

  for (const raw of lines) {
    const line = raw
    const trimmed = line.trimStart()
    const indent = line.length - trimmed.length

    if (trimmed.startsWith('services:')) { inServices = true; continue }
    if (!inServices) continue

    if (indent === 2 && !trimmed.startsWith('-') && trimmed.endsWith(':')) {
      inFirstService = true
      currentSection = ''
      continue
    }
    if (!inFirstService) continue

    if (indent === 4 && !trimmed.startsWith('-')) {
      if (trimmed.startsWith('image:')) {
        result.image = trimmed.replace('image:', '').trim().replace(/['"]/g, '')
      } else if (trimmed.startsWith('ports:')) {
        currentSection = 'ports'
      } else if (trimmed.startsWith('volumes:')) {
        currentSection = 'volumes'
      } else if (trimmed.startsWith('environment:')) {
        currentSection = 'environment'
      } else {
        currentSection = ''
      }
      continue
    }

    if (inFirstService && trimmed.startsWith('-')) {
      const val = trimmed.replace(/^-\s*/, '').replace(/['"]/g, '').trim()
      if (currentSection === 'ports') result.ports.push(val)
      if (currentSection === 'volumes') result.volumes.push(val)
      if (currentSection === 'environment') result.envLines.push(val)
    }

    if (inFirstService && currentSection === 'environment' && indent >= 6 && !trimmed.startsWith('-')) {
      result.envLines.push(trimmed)
    }

    if (indent === 2 && !trimmed.startsWith('-') && trimmed.endsWith(':') && inFirstService) break
  }

  return result
}

export function ServiceEditForm({ service }: ServiceEditFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [icon, setIcon] = useState<string | null>(service.icon)

  // Hosting state
  const [hostingType, setHostingType] = useState<HostingType>(detectHostingType(service))
  const [virtualHostId, setVirtualHostId] = useState(service.virtualHostId ?? '')
  const [vmId, setVmId] = useState(service.vmId ?? '')
  const [deviceId, setDeviceId] = useState(service.deviceId ?? '')
  const [ctid, setCtid] = useState(service.ctid ?? '')
  const [hasDocker, setHasDocker] = useState(service.hasDocker)

  const [virtualHosts, setVirtualHosts] = useState<NamedItem[]>([])
  const [vms, setVms] = useState<NamedItem[]>([])
  const [devices, setDevices] = useState<NamedItem[]>([])

  const [form, setForm] = useState({
    name: service.name,
    url: service.url ?? '',
    description: service.description ?? '',
    ip: service.ip ?? '',
    port: service.port ? String(service.port) : '',
    category: service.category ?? '',
    status: service.status,
    favourite: service.favourite,
    containerImage:  service.containerImage  ?? '',
    stackFolder:     service.stackFolder     ?? '',
    composeFilePath: service.composeFilePath ?? '',
    bindMounts:      service.bindMounts      ?? '',
    dockerCompose: service.dockerCompose ?? '',
    envVars: service.envVars ?? '',
    setupSteps: service.setupSteps ?? '',
    runCommands: service.runCommands ?? '',
    reverseProxyConfig: service.reverseProxyConfig ?? '',
    notes: service.notes ?? '',
    setupNotes: service.setupNotes ?? '',
    troubleshootingNotes: service.troubleshootingNotes ?? '',
    extraInfo: service.extraInfo ?? '',
  })

  const [composeParsed, setComposeParsed] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/virtualisation/hosts').then(r => r.json()),
      fetch('/api/virtualisation/vms').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([vh, vm, dv]) => {
      setVirtualHosts(vh)
      setVms(vm)
      setDevices(dv)
    }).catch(() => {})
  }, [open])

  function set(key: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function applyParsedCompose() {
    const parsed = parseCompose(form.dockerCompose)
    if (parsed.image && !form.containerImage) set('containerImage', parsed.image)
    if (parsed.volumes.length > 0 && !form.bindMounts) set('bindMounts', parsed.volumes.join('\n'))
    if (parsed.envLines.length > 0 && !form.envVars) set('envVars', parsed.envLines.join('\n'))
    if (parsed.ports.length > 0 && !form.port) {
      const hostPort = parsed.ports[0].split(':')[0].replace(/[^0-9]/g, '')
      if (hostPort) set('port', hostPort)
    }
    setComposeParsed(true)
  }

  function buildHostingBody() {
    if (hostingType === 'lxc') {
      return {
        virtualHostId: virtualHostId || null,
        ctid: ctid || null,
        hasDocker,
        vmId: null,
        deviceId: null,
      }
    }
    if (hostingType === 'vm') {
      return { vmId: vmId || null, virtualHostId: null, ctid: null, hasDocker: false, deviceId: null }
    }
    if (hostingType === 'virtualhost') {
      return { virtualHostId: virtualHostId || null, ctid: null, hasDocker: false, vmId: null, deviceId: null }
    }
    if (hostingType === 'device') {
      return { deviceId: deviceId || null, virtualHostId: null, ctid: null, hasDocker: false, vmId: null }
    }
    return { virtualHostId: null, ctid: null, hasDocker: false, vmId: null, deviceId: null }
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          port: form.port ? parseInt(form.port) : null,
          icon,
          ...buildHostingBody(),
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); setSaving(false); return }
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function toggleFavourite() {
    await fetch(`/api/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favourite: !service.favourite }),
    })
    router.refresh()
  }

  async function archive() {
    if (!confirm('Archive this service? It will be hidden from the main views.')) return
    await fetch(`/api/services/${service.id}`, { method: 'DELETE' })
    router.push('/services')
    router.refresh()
  }

  async function deletePermanently() {
    if (!confirm('Permanently delete this service? This cannot be undone.')) return
    const res = await fetch(`/api/services/${service.id}?permanent=true`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? 'Delete failed.'); return }
    router.push('/services')
    router.refresh()
  }

  function HostDropdown({ label, items, value, onChange }: { label: string; items: NamedItem[]; value: string; onChange: (v: string) => void }) {
    if (items.length === 0) return <p className="text-xs text-muted-foreground">No {label.toLowerCase()} added yet.</p>
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={`Select ${label}…`} /></SelectTrigger>
          <SelectContent>
            {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={toggleFavourite} title={service.favourite ? 'Remove from favourites' : 'Add to favourites'}>
        <Star className={service.favourite ? 'text-amber-400 fill-amber-400' : ''} />
      </Button>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Edit className="w-4 h-4" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

          <Tabs defaultValue="details">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="hosting" className="flex-1">Hosting</TabsTrigger>
              <TabsTrigger value="config" className="flex-1">Config</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
            </TabsList>

            {/* ── Details ── */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Icon</Label>
                  <IconPicker value={icon} onChange={setIcon} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>URL</Label>
                  <Input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>IP Address</Label>
                  <Input value={form.ip} onChange={e => set('ip', e.target.value)} placeholder="192.168.10.10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Port</Label>
                  <Input type="number" value={form.port} onChange={e => set('port', e.target.value)} placeholder="8080" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Media, Monitoring…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => set('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="OFFLINE">Offline</SelectItem>
                      <SelectItem value="WARNING">Warning</SelectItem>
                      <SelectItem value="BUILD_IN_PROGRESS">Build in Progress</SelectItem>
                      <SelectItem value="RETIRED">Retired</SelectItem>
                      <SelectItem value="UNKNOWN">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* ── Hosting ── */}
            <TabsContent value="hosting" className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>How is this service hosted?</Label>
                <Select value={hostingType} onValueChange={v => { setHostingType(v as HostingType); setCtid('') }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lxc">LXC on Proxmox</SelectItem>
                    <SelectItem value="vm">Virtual machine</SelectItem>
                    <SelectItem value="virtualhost">Directly on Proxmox host</SelectItem>
                    <SelectItem value="device">Physical device</SelectItem>
                    <SelectItem value="none">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hostingType === 'lxc' && (
                <>
                  <HostDropdown label="Proxmox host" items={virtualHosts} value={virtualHostId} onChange={setVirtualHostId} />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Container ID (CT)</Label>
                      <Input value={ctid} onChange={e => setCtid(e.target.value)} placeholder="101" className="font-mono" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasDocker(v => !v)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-colors',
                      hasDocker ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-white/[0.03]'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0',
                      hasDocker ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                    )}>
                      {hasDocker && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Runs Docker</p>
                      <p className="text-xs text-muted-foreground">Service runs inside a Docker container on this LXC</p>
                    </div>
                  </button>
                </>
              )}

              {hostingType === 'vm' && (
                <HostDropdown label="Virtual machine" items={vms} value={vmId} onChange={setVmId} />
              )}

              {hostingType === 'virtualhost' && (
                <HostDropdown label="Proxmox / virtualisation host" items={virtualHosts} value={virtualHostId} onChange={setVirtualHostId} />
              )}

              {hostingType === 'device' && (
                <HostDropdown label="Physical device" items={devices} value={deviceId} onChange={setDeviceId} />
              )}

              {hostingType === 'none' && (
                <p className="text-sm text-muted-foreground">Service will show as Unassigned.</p>
              )}
            </TabsContent>

            {/* ── Config ── */}
            <TabsContent value="config" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Container Image</Label>
                  <Input value={form.containerImage} onChange={e => set('containerImage', e.target.value)} placeholder="ghcr.io/owner/image:latest" className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Stack Folder</Label>
                  <Input value={form.stackFolder} onChange={e => set('stackFolder', e.target.value)} placeholder="/root/myapp" className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Compose File Path</Label>
                  <Input value={form.composeFilePath} onChange={e => set('composeFilePath', e.target.value)} placeholder="/root/myapp/docker-compose.yml" className="font-mono text-xs" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Bind Mounts</Label>
                  <Textarea className="h-20 font-mono text-xs" value={form.bindMounts} onChange={e => set('bindMounts', e.target.value)} placeholder="./data:/app/data&#10;./config:/etc/app/config" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Docker Compose</Label>
                  <div className="flex items-center gap-2">
                    {form.dockerCompose && !composeParsed && (
                      <button
                        type="button"
                        onClick={applyParsedCompose}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        <Sparkles className="w-3 h-3" />
                        Auto-fill from compose
                      </button>
                    )}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      Upload file
                      <input
                        type="file"
                        accept=".yml,.yaml"
                        className="sr-only"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = ev => {
                            set('dockerCompose', ev.target?.result as string ?? '')
                            setComposeParsed(false)
                          }
                          reader.readAsText(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>
                <Textarea
                  className="h-40 font-mono text-xs"
                  value={form.dockerCompose}
                  onChange={e => { set('dockerCompose', e.target.value); setComposeParsed(false) }}
                  placeholder="version: '3.8'&#10;services:&#10;  app:&#10;    image: …"
                />
                {composeParsed && (
                  <p className="text-xs text-emerald-400">Fields filled from compose — check Image, Port, Bind Mounts and Env Vars above.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Environment Variables</Label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    <Upload className="w-3 h-3" />
                    Upload .env
                    <input
                      type="file"
                      accept=".env,.txt"
                      className="sr-only"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = ev => set('envVars', ev.target?.result as string ?? '')
                        reader.readAsText(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                <Textarea className="h-28 font-mono text-xs" value={form.envVars} onChange={e => set('envVars', e.target.value)} placeholder="KEY=value&#10;ANOTHER=value" />
              </div>

              <div className="space-y-1.5">
                <Label>Setup Steps</Label>
                <Textarea className="h-28" value={form.setupSteps} onChange={e => set('setupSteps', e.target.value)} placeholder="1. Step one&#10;2. Step two" />
              </div>
              <div className="space-y-1.5">
                <Label>Commands</Label>
                <Textarea className="h-24 font-mono text-xs" value={form.runCommands} onChange={e => set('runCommands', e.target.value)} placeholder="docker compose up -d" />
              </div>
              <div className="space-y-1.5">
                <Label>Reverse Proxy Config</Label>
                <Textarea className="h-32 font-mono text-xs" value={form.reverseProxyConfig} onChange={e => set('reverseProxyConfig', e.target.value)} />
              </div>
            </TabsContent>

            {/* ── Notes ── */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea className="h-24" value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Setup Notes</Label>
                <Textarea className="h-24" value={form.setupNotes} onChange={e => set('setupNotes', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Troubleshooting</Label>
                <Textarea className="h-24" value={form.troubleshootingNotes} onChange={e => set('troubleshootingNotes', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Extra Info</Label>
                <Textarea className="h-24" value={form.extraInfo} onChange={e => set('extraInfo', e.target.value)} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={archive}>
                <Archive className="w-4 h-4" /> Archive
              </Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={deletePermanently}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
