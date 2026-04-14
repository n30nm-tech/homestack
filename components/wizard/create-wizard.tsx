'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  Boxes, Server, Cpu, Network, HardDrive, FileText, ChevronRight, ChevronLeft,
  Container, LayoutGrid,
} from 'lucide-react'

type ItemType =
  | 'service' | 'device' | 'host' | 'vm' | 'lxc' | 'dockerhost'
  | 'vlan' | 'dns' | 'proxy' | 'backup' | 'doc'

const ITEM_GROUPS: {
  label: string
  items: { type: ItemType; label: string; description: string; icon: React.ElementType }[]
}[] = [
  {
    label: 'Infrastructure — add these first',
    items: [
      { type: 'device',     label: 'Device',               description: 'A physical machine (server, NAS, switch). The hardware everything runs on.', icon: Server },
      { type: 'host',       label: 'Virtualisation Host',  description: 'A hypervisor like Proxmox. Lives on a Device and runs VMs and LXCs.', icon: Cpu },
      { type: 'vm',         label: 'Virtual Machine',      description: 'A VM inside Proxmox or similar. Needs a Virtualisation Host.', icon: LayoutGrid },
      { type: 'lxc',        label: 'LXC Container',        description: 'A lightweight Linux container in Proxmox. Needs a Virtualisation Host.', icon: Container },
      { type: 'dockerhost', label: 'Docker Host',          description: 'Docker running somewhere — on an LXC, VM, or bare-metal. Links Docker to where it lives.', icon: Boxes },
    ],
  },
  {
    label: 'Services & content',
    items: [
      { type: 'service', label: 'Service',            description: 'An app or service (Plex, Grafana, etc). Attach it to a Docker Host, LXC, VM, or Device.', icon: Boxes },
      { type: 'backup',  label: 'Backup Job',         description: 'A scheduled backup job for any item.', icon: HardDrive },
      { type: 'doc',     label: 'Documentation Page', description: 'Notes, setup guides, or runbooks.', icon: FileText },
    ],
  },
  {
    label: 'Network',
    items: [
      { type: 'vlan',  label: 'VLAN',          description: 'A network segment with an ID and subnet.', icon: Network },
      { type: 'dns',   label: 'DNS Record',    description: 'A local DNS entry pointing to a service.', icon: Network },
      { type: 'proxy', label: 'Reverse Proxy', description: 'A proxy entry publishing a service externally.', icon: Network },
    ],
  },
]

interface CreateWizardProps {
  open: boolean
  onClose: () => void
}

// ─── Shared option types ──────────────────────────────────────────────────────

interface NamedItem { id: string; name: string }

interface RelatedData {
  virtualHosts: NamedItem[]
  vms: NamedItem[]
  lxcs: NamedItem[]
  dockerHosts: NamedItem[]
  devices: NamedItem[]
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

export function CreateWizard({ open, onClose }: CreateWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [selectedType, setSelectedType] = useState<ItemType | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [related, setRelated] = useState<RelatedData>({ virtualHosts: [], vms: [], lxcs: [], dockerHosts: [], devices: [] })

  // Fetch related data when the form step opens
  useEffect(() => {
    if (step !== 'form') return
    Promise.all([
      fetch('/api/virtualisation/hosts').then(r => r.json()),
      fetch('/api/virtualisation/vms').then(r => r.json()),
      fetch('/api/virtualisation/lxcs').then(r => r.json()),
      fetch('/api/virtualisation/docker').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([virtualHosts, vms, lxcs, dockerHosts, devices]) => {
      setRelated({
        virtualHosts: virtualHosts.map((h: any) => ({ id: h.id, name: h.name })),
        vms: vms.map((v: any) => ({ id: v.id, name: v.name })),
        lxcs: lxcs.map((l: any) => ({ id: l.id, name: l.name })),
        dockerHosts: dockerHosts.map((d: any) => ({ id: d.id, name: d.name })),
        devices: devices.map((d: any) => ({ id: d.id, name: d.name })),
      })
    }).catch(() => {})
  }, [step])

  function reset() {
    setStep('type')
    setSelectedType(null)
    setFormData({})
    setError('')
    setSaving(false)
  }

  function handleClose() { reset(); onClose() }

  function selectType(type: ItemType) {
    setSelectedType(type)
    setStep('form')
  }

  function handleField(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!selectedType) return
    setSaving(true)
    setError('')

    const endpointMap: Record<ItemType, string> = {
      service: '/api/services',
      device: '/api/devices',
      host: '/api/virtualisation/hosts',
      vm: '/api/virtualisation/vms',
      lxc: '/api/virtualisation/lxcs',
      dockerhost: '/api/virtualisation/docker',
      vlan: '/api/network/vlans',
      dns: '/api/network/dns',
      proxy: '/api/network/proxy',
      backup: '/api/backups',
      doc: '/api/docs',
    }

    try {
      const res = await fetch(endpointMap[selectedType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong.')
        setSaving(false)
        return
      }

      const data = await res.json()
      handleClose()

      const redirectMap: Record<ItemType, string> = {
        service: `/services/${data.id}`,
        device: `/devices/${data.id}`,
        host: `/virtualisation/hosts/${data.id}`,
        vm: `/virtualisation/vms/${data.id}`,
        lxc: `/virtualisation/lxcs/${data.id}`,
        dockerhost: `/virtualisation/docker/${data.id}`,
        vlan: `/network`,
        dns: `/network`,
        proxy: `/network`,
        backup: `/backups/${data.id}`,
        doc: `/docs/${data.id}`,
      }
      router.push(redirectMap[selectedType])
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' ? 'Add New Item' : `New ${ITEM_GROUPS.flatMap(g => g.items).find(t => t.type === selectedType)?.label}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'type'
              ? 'What would you like to add to your homelab?'
              : 'Fill in the details below. You can always edit these later.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'type' && (
          <div className="mt-2 space-y-5">
            {/* Typical stack callout */}
            <div className="rounded-xl border border-border bg-white/[0.03] px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Typical Proxmox + Docker setup</p>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {[
                  { label: 'Device', sub: 'physical server' },
                  { label: 'Virtualisation Host', sub: 'Proxmox' },
                  { label: 'LXC', sub: 'container' },
                  { label: 'Docker Host', sub: 'Docker daemon' },
                  { label: 'Service', sub: 'your app' },
                ].map((step, i) => (
                  <span key={step.label} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-muted-foreground">→</span>}
                    <span className="px-2 py-0.5 rounded-md bg-muted font-medium text-foreground">{step.label}</span>
                    <span className="text-muted-foreground hidden sm:inline">({step.sub})</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Add them in order — each links to the one before it. Services link to Docker Host.</p>
            </div>

            {ITEM_GROUPS.map(group => (
              <div key={group.label} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">{group.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map(({ type, label, description, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => selectType(type)}
                      className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 text-left transition-colors group"
                    >
                      <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 'form' && selectedType && (
          <div className="space-y-4 mt-2">
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}
            {selectedType === 'service' && <ServiceForm data={formData} onChange={handleField} related={related} />}
            {selectedType === 'device' && <DeviceForm data={formData} onChange={handleField} />}
            {selectedType === 'host' && <HostForm data={formData} onChange={handleField} related={related} />}
            {selectedType === 'vm' && <VMForm data={formData} onChange={handleField} related={related} />}
            {selectedType === 'lxc' && <LXCForm data={formData} onChange={handleField} related={related} />}
            {selectedType === 'dockerhost' && <DockerHostForm data={formData} onChange={handleField} related={related} />}
            {selectedType === 'vlan' && <VLANForm data={formData} onChange={handleField} />}
            {selectedType === 'dns' && <DNSForm data={formData} onChange={handleField} />}
            {selectedType === 'proxy' && <ProxyForm data={formData} onChange={handleField} />}
            {selectedType === 'backup' && <BackupForm data={formData} onChange={handleField} />}
            {selectedType === 'doc' && <DocForm data={formData} onChange={handleField} />}
          </div>
        )}

        {step === 'form' && (
          <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
            <Button variant="ghost" onClick={() => setStep('type')}>
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value || 'UNKNOWN'} onValueChange={onChange}>
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
  )
}

function HostSelect({ label, hint, items, value, onChange, placeholder = 'Select…' }: {
  label: string; hint?: string; items: NamedItem[]; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  if (items.length === 0) return null
  return (
    <Field label={label} hint={hint}>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {items.map(item => (
            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

// ─── Service form ─────────────────────────────────────────────────────────────

function ServiceForm({ data, onChange, related }: { data: Record<string, string>; onChange: (k: string, v: string) => void; related: RelatedData }) {
  const hostType = data._hostType || ''

  function setHostType(type: string) {
    // Clear all host fields when switching
    onChange('_hostType', type)
    onChange('dockerHostId', '')
    onChange('lxcId', '')
    onChange('vmId', '')
    onChange('virtualHostId', '')
    onChange('deviceId', '')
  }

  return (
    <>
      <Field label="Service name *">
        <Input placeholder="e.g. Plex, Grafana" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} />
      </Field>
      <Field label="URL">
        <Input placeholder="https://service.home.example.com" value={data.url ?? ''} onChange={e => onChange('url', e.target.value)} />
      </Field>
      <Field label="Description">
        <Input placeholder="What does this service do?" value={data.description ?? ''} onChange={e => onChange('description', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Input placeholder="e.g. Media, Monitoring" value={data.category ?? ''} onChange={e => onChange('category', e.target.value)} />
        </Field>
        <Field label="Status">
          <StatusSelect value={data.status} onChange={v => onChange('status', v)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IP address">
          <Input placeholder="192.168.10.10" value={data.ip ?? ''} onChange={e => onChange('ip', e.target.value)} />
        </Field>
        <Field label="Port">
          <Input placeholder="8080" type="number" value={data.port ?? ''} onChange={e => onChange('port', e.target.value)} />
        </Field>
      </div>

      {/* Hosting */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Where is this service running?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Running in Docker? Choose <strong>Docker Host</strong>. Running directly in an LXC without Docker? Choose <strong>LXC container</strong>.</p>
        </div>
        <Select value={hostType} onValueChange={setHostType}>
          <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dockerHost">In Docker (Docker Host)</SelectItem>
            <SelectItem value="lxc">Directly in an LXC (no Docker)</SelectItem>
            <SelectItem value="vm">Directly on a VM (no Docker)</SelectItem>
            <SelectItem value="virtualHost">Directly on a hypervisor</SelectItem>
            <SelectItem value="device">On a physical device</SelectItem>
          </SelectContent>
        </Select>

        {hostType === 'dockerHost' && (
          <HostSelect label="Which Docker host?" items={related.dockerHosts} value={data.dockerHostId ?? ''} onChange={v => onChange('dockerHostId', v)} placeholder="Select Docker host…" />
        )}
        {hostType === 'lxc' && (
          <HostSelect label="Which LXC?" items={related.lxcs} value={data.lxcId ?? ''} onChange={v => onChange('lxcId', v)} placeholder="Select LXC…" />
        )}
        {hostType === 'vm' && (
          <HostSelect label="Which VM?" items={related.vms} value={data.vmId ?? ''} onChange={v => onChange('vmId', v)} placeholder="Select VM…" />
        )}
        {hostType === 'virtualHost' && (
          <HostSelect label="Which host?" items={related.virtualHosts} value={data.virtualHostId ?? ''} onChange={v => onChange('virtualHostId', v)} placeholder="Select host…" />
        )}
        {hostType === 'device' && (
          <HostSelect label="Which device?" items={related.devices} value={data.deviceId ?? ''} onChange={v => onChange('deviceId', v)} placeholder="Select device…" />
        )}

        {hostType === 'dockerHost' && related.dockerHosts.length === 0 && (
          <p className="text-xs text-muted-foreground">No Docker hosts found — create one first, or set hosting after creation.</p>
        )}
        {hostType === 'lxc' && related.lxcs.length === 0 && (
          <p className="text-xs text-muted-foreground">No LXCs found — create one first, or set hosting after creation.</p>
        )}
        {hostType === 'vm' && related.vms.length === 0 && (
          <p className="text-xs text-muted-foreground">No VMs found — create one first, or set hosting after creation.</p>
        )}
      </div>
    </>
  )
}

// ─── Device form ──────────────────────────────────────────────────────────────

function DeviceForm({ data, onChange }: { data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Device name *">
        <Input placeholder="e.g. pfSense Firewall" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} />
      </Field>
      <Field label="Device type *">
        <Select value={data.type ?? ''} onValueChange={v => onChange('type', v)}>
          <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="FIREWALL">Firewall</SelectItem>
            <SelectItem value="SWITCH">Switch</SelectItem>
            <SelectItem value="ACCESS_POINT">Access Point</SelectItem>
            <SelectItem value="ROUTER">Router</SelectItem>
            <SelectItem value="SERVER">Server</SelectItem>
            <SelectItem value="NAS">NAS</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand"><Input placeholder="e.g. Ubiquiti" value={data.brand ?? ''} onChange={e => onChange('brand', e.target.value)} /></Field>
        <Field label="Model"><Input placeholder="e.g. USW-Pro-24" value={data.model ?? ''} onChange={e => onChange('model', e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Management IP"><Input placeholder="192.168.1.1" value={data.managementIp ?? ''} onChange={e => onChange('managementIp', e.target.value)} /></Field>
        <Field label="Status"><StatusSelect value={data.status} onChange={v => onChange('status', v)} /></Field>
      </div>
      <Field label="Location"><Input placeholder="e.g. Server Rack - U1" value={data.location ?? ''} onChange={e => onChange('location', e.target.value)} /></Field>
    </>
  )
}

// ─── Host form ────────────────────────────────────────────────────────────────

function HostForm({ data, onChange, related }: { data: Record<string, string>; onChange: (k: string, v: string) => void; related: RelatedData }) {
  return (
    <>
      <Field label="Host name *">
        <Input placeholder="e.g. Proxmox PVE" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} />
      </Field>
      <Field label="Platform *">
        <Select value={data.type ?? ''} onValueChange={v => onChange('type', v)}>
          <SelectTrigger><SelectValue placeholder="Select platform…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PROXMOX">Proxmox</SelectItem>
            <SelectItem value="HYPER_V">Hyper-V</SelectItem>
            <SelectItem value="ESXI">ESXi</SelectItem>
            <SelectItem value="KVM">KVM</SelectItem>
            <SelectItem value="VIRTUALBOX">VirtualBox</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IP address"><Input placeholder="192.168.10.2" value={data.ip ?? ''} onChange={e => onChange('ip', e.target.value)} /></Field>
        <Field label="Status"><StatusSelect value={data.status} onChange={v => onChange('status', v)} /></Field>
      </div>
      <Field label="OS / Version"><Input placeholder="e.g. Proxmox VE 8.3" value={data.os ?? ''} onChange={e => onChange('os', e.target.value)} /></Field>
      <HostSelect
        label="Which physical device does this run on?"
        hint="Optional — you can set this later."
        items={related.devices}
        value={data.deviceId ?? ''}
        onChange={v => onChange('deviceId', v)}
        placeholder="Select device…"
      />
    </>
  )
}

// ─── VM form ──────────────────────────────────────────────────────────────────

function VMForm({ data, onChange, related }: { data: Record<string, string>; onChange: (k: string, v: string) => void; related: RelatedData }) {
  return (
    <>
      <Field label="VM name *">
        <Input placeholder="e.g. Docker VM" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} />
      </Field>

      {related.virtualHosts.length > 0 ? (
        <HostSelect
          label="Which host runs this VM? *"
          items={related.virtualHosts}
          value={data.hostId ?? ''}
          onChange={v => onChange('hostId', v)}
          placeholder="Select virtualisation host…"
        />
      ) : (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          No virtualisation hosts found yet. Create a host first, or this VM will be assigned to the first available host.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="VM ID"><Input placeholder="100" value={data.vmid ?? ''} onChange={e => onChange('vmid', e.target.value)} /></Field>
        <Field label="Status"><StatusSelect value={data.status} onChange={v => onChange('status', v)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IP address"><Input placeholder="192.168.10.10" value={data.ip ?? ''} onChange={e => onChange('ip', e.target.value)} /></Field>
        <Field label="Operating system"><Input placeholder="e.g. Ubuntu 24.04 LTS" value={data.os ?? ''} onChange={e => onChange('os', e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="vCPUs"><Input type="number" placeholder="4" value={data.cpu ?? ''} onChange={e => onChange('cpu', e.target.value)} /></Field>
        <Field label="RAM (MB)"><Input type="number" placeholder="8192" value={data.ram ?? ''} onChange={e => onChange('ram', e.target.value)} /></Field>
        <Field label="Disk (GB)"><Input type="number" placeholder="50" value={data.disk ?? ''} onChange={e => onChange('disk', e.target.value)} /></Field>
      </div>
    </>
  )
}

// ─── LXC form ─────────────────────────────────────────────────────────────────

function LXCForm({ data, onChange, related }: { data: Record<string, string>; onChange: (k: string, v: string) => void; related: RelatedData }) {
  return (
    <>
      <Field label="Container name *">
        <Input placeholder="e.g. Nginx Proxy Manager" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} />
      </Field>

      {related.virtualHosts.length > 0 ? (
        <HostSelect
          label="Which host runs this LXC? *"
          items={related.virtualHosts}
          value={data.hostId ?? ''}
          onChange={v => onChange('hostId', v)}
          placeholder="Select virtualisation host…"
        />
      ) : (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          No virtualisation hosts found yet. Create a host first, or this LXC will be assigned to the first available host.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="CT ID"><Input placeholder="200" value={data.ctid ?? ''} onChange={e => onChange('ctid', e.target.value)} /></Field>
        <Field label="Status"><StatusSelect value={data.status} onChange={v => onChange('status', v)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IP address"><Input placeholder="192.168.10.20" value={data.ip ?? ''} onChange={e => onChange('ip', e.target.value)} /></Field>
        <Field label="Operating system"><Input placeholder="e.g. Debian 12" value={data.os ?? ''} onChange={e => onChange('os', e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="vCPUs"><Input type="number" placeholder="2" value={data.cpu ?? ''} onChange={e => onChange('cpu', e.target.value)} /></Field>
        <Field label="RAM (MB)"><Input type="number" placeholder="512" value={data.ram ?? ''} onChange={e => onChange('ram', e.target.value)} /></Field>
        <Field label="Disk (GB)"><Input type="number" placeholder="8" value={data.disk ?? ''} onChange={e => onChange('disk', e.target.value)} /></Field>
      </div>
    </>
  )
}

// ─── Docker host form ─────────────────────────────────────────────────────────

function DockerHostForm({ data, onChange, related }: { data: Record<string, string>; onChange: (k: string, v: string) => void; related: RelatedData }) {
  const runningOn = data._runningOn || ''

  function setRunningOn(type: string) {
    onChange('_runningOn', type)
    onChange('vmId', '')
    onChange('lxcId', '')
    onChange('virtualHostId', '')
  }

  return (
    <>
      <Field label="Name *">
        <Input placeholder="e.g. Docker Main" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IP address"><Input placeholder="192.168.10.10" value={data.ip ?? ''} onChange={e => onChange('ip', e.target.value)} /></Field>
        <Field label="Status"><StatusSelect value={data.status} onChange={v => onChange('status', v)} /></Field>
      </div>

      <div className="border border-border rounded-xl p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Where is Docker running?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Most common: <strong>On an LXC</strong> — Docker installed inside a Proxmox LXC container.</p>
        </div>
        <Select value={runningOn} onValueChange={setRunningOn}>
          <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lxc">On an LXC container (most common)</SelectItem>
            <SelectItem value="vm">On a VM</SelectItem>
            <SelectItem value="host">Directly on a hypervisor</SelectItem>
          </SelectContent>
        </Select>
        {runningOn === 'vm' && (
          <HostSelect label="Which VM?" items={related.vms} value={data.vmId ?? ''} onChange={v => onChange('vmId', v)} placeholder="Select VM…" />
        )}
        {runningOn === 'lxc' && (
          <HostSelect label="Which LXC?" items={related.lxcs} value={data.lxcId ?? ''} onChange={v => onChange('lxcId', v)} placeholder="Select LXC…" />
        )}
        {runningOn === 'host' && (
          <HostSelect label="Which host?" items={related.virtualHosts} value={data.virtualHostId ?? ''} onChange={v => onChange('virtualHostId', v)} placeholder="Select host…" />
        )}
      </div>
    </>
  )
}

// ─── VLAN form ────────────────────────────────────────────────────────────────

function VLANForm({ data, onChange }: { data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="VLAN name *"><Input placeholder="e.g. Servers" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} /></Field>
      <Field label="VLAN ID *"><Input type="number" placeholder="10" value={data.vlanId ?? ''} onChange={e => onChange('vlanId', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Subnet"><Input placeholder="192.168.10.0/24" value={data.subnet ?? ''} onChange={e => onChange('subnet', e.target.value)} /></Field>
        <Field label="Gateway"><Input placeholder="192.168.10.1" value={data.gateway ?? ''} onChange={e => onChange('gateway', e.target.value)} /></Field>
      </div>
      <Field label="Purpose"><Input placeholder="What is this VLAN used for?" value={data.purpose ?? ''} onChange={e => onChange('purpose', e.target.value)} /></Field>
    </>
  )
}

// ─── DNS form ─────────────────────────────────────────────────────────────────

function DNSForm({ data, onChange }: { data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Record name *"><Input placeholder="e.g. proxmox" value={data.recordName ?? ''} onChange={e => onChange('recordName', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Domain"><Input placeholder="e.g. lan" value={data.domain ?? ''} onChange={e => onChange('domain', e.target.value)} /></Field>
        <Field label="IP address"><Input placeholder="192.168.10.2" value={data.ip ?? ''} onChange={e => onChange('ip', e.target.value)} /></Field>
      </div>
    </>
  )
}

// ─── Proxy form ───────────────────────────────────────────────────────────────

function ProxyForm({ data, onChange }: { data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Proxy name *"><Input placeholder="e.g. plex.home.example.com" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} /></Field>
      <Field label="Domain"><Input placeholder="plex.home.example.com" value={data.domain ?? ''} onChange={e => onChange('domain', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target IP"><Input placeholder="192.168.10.10" value={data.targetIp ?? ''} onChange={e => onChange('targetIp', e.target.value)} /></Field>
        <Field label="Target port"><Input type="number" placeholder="32400" value={data.targetPort ?? ''} onChange={e => onChange('targetPort', e.target.value)} /></Field>
      </div>
    </>
  )
}

// ─── Backup form ──────────────────────────────────────────────────────────────

function BackupForm({ data, onChange }: { data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Job name *"><Input placeholder="e.g. Proxmox VM Backups" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} /></Field>
      <Field label="What does it back up?"><Input placeholder="e.g. All VMs on Proxmox" value={data.description ?? ''} onChange={e => onChange('description', e.target.value)} /></Field>
      <Field label="Destination"><Input placeholder="e.g. NAS - /tank/backups" value={data.destination ?? ''} onChange={e => onChange('destination', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Schedule"><Input placeholder="e.g. Daily at 03:00" value={data.schedule ?? ''} onChange={e => onChange('schedule', e.target.value)} /></Field>
        <Field label="Retention"><Input placeholder="e.g. 7 daily, 4 weekly" value={data.retention ?? ''} onChange={e => onChange('retention', e.target.value)} /></Field>
      </div>
      <Field label="Tool"><Input placeholder="e.g. Proxmox Backup Server, restic" value={data.tool ?? ''} onChange={e => onChange('tool', e.target.value)} /></Field>
    </>
  )
}

// ─── Doc form ─────────────────────────────────────────────────────────────────

function DocForm({ data, onChange }: { data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <Field label="Page title *">
      <Input placeholder="e.g. Network Overview" value={data.title ?? ''} onChange={e => onChange('title', e.target.value)} />
    </Field>
  )
}
