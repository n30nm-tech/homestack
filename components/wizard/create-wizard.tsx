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
  Container, LayoutGrid, Check, Plus, ArrowRight,
} from 'lucide-react'
import { SuggestInput } from '@/components/shared/suggest-input'
import { cn } from '@/lib/utils'

type ItemType =
  | 'service' | 'device' | 'host' | 'vm' | 'lxc'
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
      { type: 'lxc',        label: 'LXC Container',        description: 'A lightweight Linux container in Proxmox. Tick "Runs Docker" on the LXC if it runs Docker inside.', icon: Container },
    ],
  },
  {
    label: 'Services & content',
    items: [
      { type: 'service', label: 'Service',            description: 'An app or service (Plex, Grafana, etc). Use the guided setup to link it through your stack.', icon: Boxes },
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

interface NamedItem { id: string; name: string; ip?: string | null }

interface RelatedData {
  virtualHosts: NamedItem[]
  vms: NamedItem[]
  lxcs: NamedItem[]
  devices: NamedItem[]
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

export function CreateWizard({ open, onClose }: CreateWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<'type' | 'guided' | 'form'>('type')
  const [selectedType, setSelectedType] = useState<ItemType | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [related, setRelated] = useState<RelatedData>({ virtualHosts: [], vms: [], lxcs: [], devices: [] })

  useEffect(() => {
    if (step !== 'form' && step !== 'guided') return
    Promise.all([
      fetch('/api/virtualisation/hosts').then(r => r.json()),
      fetch('/api/virtualisation/vms').then(r => r.json()),
      fetch('/api/virtualisation/lxcs').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([virtualHosts, vms, lxcs, devices]) => {
      setRelated({
        virtualHosts: virtualHosts.map((h: any) => ({ id: h.id, name: h.name, ip: h.ip })),
        vms: vms.map((v: any) => ({ id: v.id, name: v.name, ip: v.ip })),
        lxcs: lxcs.map((l: any) => ({ id: l.id, name: l.name, ip: l.ip })),
        devices: devices.map((d: any) => ({ id: d.id, name: d.name })),
      })
    }).catch(() => {})
  }, [step])

  function reset() {
    setStep('type'); setSelectedType(null); setFormData({}); setError(''); setSaving(false)
  }

  function handleClose() { reset(); onClose() }

  function selectType(type: ItemType) {
    setSelectedType(type)
    setStep(type === 'service' ? 'guided' : 'form')
  }

  function handleField(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!selectedType) return
    setSaving(true); setError('')
    const endpointMap: Record<ItemType, string> = {
      service: '/api/services', device: '/api/devices', host: '/api/virtualisation/hosts',
      vm: '/api/virtualisation/vms', lxc: '/api/virtualisation/lxcs',
      vlan: '/api/network/vlans',
      dns: '/api/network/dns', proxy: '/api/network/proxy', backup: '/api/backups', doc: '/api/docs',
    }
    try {
      const res = await fetch(endpointMap[selectedType], {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Something went wrong.'); setSaving(false); return }
      const data = await res.json()
      handleClose()
      const redirectMap: Record<ItemType, string> = {
        service: `/services/${data.id}`, device: `/devices/${data.id}`,
        host: `/virtualisation/hosts/${data.id}`, vm: `/virtualisation/vms/${data.id}`,
        lxc: `/virtualisation/lxcs/${data.id}`,
        vlan: `/network`, dns: `/network`, proxy: `/network`,
        backup: `/backups/${data.id}`, doc: `/docs/${data.id}`,
      }
      router.push(redirectMap[selectedType]); router.refresh()
    } catch { setError('Network error. Please try again.'); setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' ? 'Add New Item'
              : step === 'guided' ? 'Add a Service'
              : `New ${ITEM_GROUPS.flatMap(g => g.items).find(t => t.type === selectedType)?.label}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'type' ? 'What would you like to add to your homelab?'
              : step === 'guided' ? "We'll walk you through the setup step by step."
              : 'Fill in the details below. You can always edit these later.'}
          </DialogDescription>
        </DialogHeader>

        {/* Type picker */}
        {step === 'type' && (
          <div className="mt-2 space-y-5">
            <div className="rounded-xl border border-border bg-white/[0.03] px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Typical setup</p>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {['Proxmox Host', 'LXC', 'Service'].map((label, i) => (
                  <span key={label} className="flex items-center gap-1.5">
                    {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                    <span className="px-2 py-0.5 rounded-md bg-muted font-medium text-foreground">{label}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Each service has its own dedicated LXC. Tick "Runs Docker" on the LXC if Docker is the runtime.</p>
            </div>
            {ITEM_GROUPS.map(group => (
              <div key={group.label} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">{group.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map(({ type, label, description, icon: Icon }) => (
                    <button key={type} onClick={() => selectType(type)}
                      className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 text-left transition-colors group">
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

        {/* Guided service setup */}
        {step === 'guided' && (
          <GuidedServiceFlow
            related={related}
            onDone={(serviceId) => { handleClose(); router.push(`/services/${serviceId}`); router.refresh() }}
            onBack={() => setStep('type')}
          />
        )}

        {/* Quick-add form for non-service types */}
        {step === 'form' && selectedType && (
          <>
            <div className="space-y-4 mt-2">
              {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
              {selectedType === 'device'     && <DeviceForm     data={formData} onChange={handleField} />}
              {selectedType === 'host'       && <HostForm       data={formData} onChange={handleField} related={related} />}
              {selectedType === 'vm'         && <VMForm         data={formData} onChange={handleField} related={related} />}
              {selectedType === 'lxc'        && <LXCForm        data={formData} onChange={handleField} related={related} />}
              {selectedType === 'vlan'       && <VLANForm       data={formData} onChange={handleField} />}
              {selectedType === 'dns'        && <DNSForm        data={formData} onChange={handleField} />}
              {selectedType === 'proxy'      && <ProxyForm      data={formData} onChange={handleField} />}
              {selectedType === 'backup'     && <BackupForm     data={formData} onChange={handleField} />}
              {selectedType === 'doc'        && <DocForm        data={formData} onChange={handleField} />}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <Button variant="ghost" onClick={() => setStep('type')}><ChevronLeft className="w-4 h-4" /> Back</Button>
              <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creating…' : 'Create'}{!saving && <ChevronRight className="w-4 h-4" />}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Guided Service Flow ──────────────────────────────────────────────────────

type Runtime = 'lxc' | 'vm-direct' | 'device-direct' | 'skip'

interface SlotValue {
  existingId: string | null
  newData: Record<string, string> | null
}

const emptySlot = (): SlotValue => ({ existingId: null, newData: null })

type GuidedStep = 'runtime' | 'host' | 'lxc' | 'vm' | 'device-slot' | 'details'

function stepsForRuntime(r: Runtime): GuidedStep[] {
  switch (r) {
    case 'lxc':          return ['host', 'lxc', 'details']
    case 'vm-direct':    return ['host', 'vm',  'details']
    case 'device-direct':return ['device-slot', 'details']
    case 'skip':         return ['details']
  }
}

function GuidedServiceFlow({
  related, onDone, onBack,
}: {
  related: RelatedData
  onDone: (serviceId: string) => void
  onBack: () => void
}) {
  const [runtime, setRuntime]       = useState<Runtime | null>(null)
  const [steps, setSteps]           = useState<GuidedStep[]>([])
  const [stepIdx, setStepIdx]       = useState(0)
  const [host, setHost]         = useState<SlotValue>(emptySlot())
  const [lxc, setLxc]           = useState<SlotValue>(emptySlot())
  const [lxcHasDocker, setLxcHasDocker] = useState(true)
  const [vm, setVm]             = useState<SlotValue>(emptySlot())
  const [device, setDevice]     = useState<SlotValue>(emptySlot())
  const [service, setService]       = useState({ name: '', url: '', status: 'ACTIVE', category: '' })
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const currentStep = runtime ? steps[stepIdx] : 'runtime'

  function chooseRuntime(r: Runtime) {
    setRuntime(r)
    setSteps(stepsForRuntime(r))
    setStepIdx(0)
  }

  function goBack() {
    if (currentStep === 'runtime' || !runtime) { onBack(); return }
    if (stepIdx === 0) { setRuntime(null); setSteps([]); return }
    setStepIdx(i => i - 1)
  }

  function goNext() { setStepIdx(i => i + 1) }

  // Determine if current slot has a selection
  function currentSlotReady(): boolean {
    if (!runtime) return false
    switch (currentStep) {
      case 'host':        return !!(host.existingId || host.newData?.name)
      case 'lxc':         return !!(lxc.existingId || lxc.newData?.name)
      case 'vm':          return !!(vm.existingId || vm.newData?.name)
      case 'device-slot': return !!(device.existingId || device.newData?.name)
      case 'details':     return !!service.name.trim()
      default: return false
    }
  }

  async function submit() {
    setSaving(true); setError('')
    try {
      // 1. Create host if new
      let hostId = host.existingId
      if (!hostId && host.newData?.name) {
        const r = await fetch('/api/virtualisation/hosts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...host.newData, status: 'ACTIVE' }) })
        if (!r.ok) { setError('Failed to create host.'); setSaving(false); return }
        hostId = (await r.json()).id
      }

      // 2. Create LXC if new
      let lxcId = lxc.existingId
      if (!lxcId && lxc.newData?.name && hostId) {
        const r = await fetch('/api/virtualisation/lxcs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...lxc.newData, hostId, status: 'ACTIVE', hasDocker: lxcHasDocker }) })
        if (!r.ok) { setError('Failed to create LXC.'); setSaving(false); return }
        lxcId = (await r.json()).id
      }

      // 3. Create VM if new
      let vmId = vm.existingId
      if (!vmId && vm.newData?.name && hostId) {
        const r = await fetch('/api/virtualisation/vms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...vm.newData, hostId, status: 'ACTIVE' }) })
        if (!r.ok) { setError('Failed to create VM.'); setSaving(false); return }
        vmId = (await r.json()).id
      }

      // 4. Create device if new
      let deviceId = device.existingId
      if (!deviceId && device.newData?.name) {
        const r = await fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...device.newData, status: 'ACTIVE', type: 'SERVER' }) })
        if (!r.ok) { setError('Failed to create device.'); setSaving(false); return }
        deviceId = (await r.json()).id
      }

      // 5. Create service
      const svcBody: Record<string, string | null> = { ...service }
      if (lxcId)        svcBody.lxcId    = lxcId
      else if (vmId)    svcBody.vmId     = vmId
      else if (deviceId) svcBody.deviceId = deviceId

      const r = await fetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(svcBody) })
      if (!r.ok) { setError('Failed to create service.'); setSaving(false); return }
      onDone((await r.json()).id)
    } catch { setError('Network error.'); setSaving(false) }
  }

  // Progress breadcrumb
  const allSteps: GuidedStep[] = runtime ? steps : []
  const breadcrumbLabels: Record<GuidedStep, string> = {
    runtime: 'Setup', host: 'Proxmox', lxc: 'LXC', vm: 'VM',
    'device-slot': 'Device', details: 'Service',
  }

  return (
    <div className="mt-2 space-y-5">
      {/* Progress indicator */}
      {runtime && allSteps.length > 0 && (
        <div className="flex items-center gap-1.5">
          {allSteps.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <div className="h-px w-4 bg-border" />}
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                i < stepIdx  ? 'bg-primary/20 text-primary' :
                i === stepIdx ? 'bg-primary text-white' :
                'bg-muted text-muted-foreground'
              )}>
                {i < stepIdx && <Check className="w-2.5 h-2.5 inline mr-1" />}
                {breadcrumbLabels[s]}
              </span>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

      {/* Step: runtime choice */}
      {currentStep === 'runtime' && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Where does this service run?</p>
          {[
            { value: 'lxc'           as Runtime, label: 'LXC container',   sub: 'Service lives in its own LXC on Proxmox. You can tick "Runs Docker" on the next screen.', highlight: true },
            { value: 'vm-direct'     as Runtime, label: 'Virtual machine',  sub: 'Service runs directly on a VM' },
            { value: 'device-direct' as Runtime, label: 'Physical device',  sub: 'Bare-metal server, NAS, or other hardware' },
            { value: 'skip'          as Runtime, label: 'Set hosting later', sub: 'Just add the service name and URL for now' },
          ].map(opt => (
            <button key={opt.value} onClick={() => chooseRuntime(opt.value)}
              className={cn(
                'w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors group',
                opt.highlight
                  ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                  : 'border-border hover:border-border/80 hover:bg-white/[0.03]'
              )}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  {opt.label}
                  {opt.highlight && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase tracking-wide">most common</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Step: Proxmox / virtualisation host */}
      {currentStep === 'host' && (
        <SelectOrCreate
          label="Proxmox / Virtualisation Host"
          hint="This is the server running Proxmox. If you haven't added it yet, create it now."
          items={related.virtualHosts}
          selected={host}
          onSelect={setHost}
          newFields={[
            { key: 'name', label: 'Host name', placeholder: 'e.g. Proxmox PVE' },
            { key: 'ip',   label: 'IP address', placeholder: '192.168.1.10' },
          ]}
        />
      )}

      {/* Step: LXC */}
      {currentStep === 'lxc' && (
        <div className="space-y-4">
          <SelectOrCreate
            label="LXC Container"
            hint="Pick an existing LXC or create a new one."
            items={related.lxcs}
            selected={lxc}
            onSelect={setLxc}
            newFields={[
              { key: 'name', label: 'Container name', placeholder: 'e.g. immich-lxc' },
              { key: 'ip',   label: 'IP address',     placeholder: '192.168.1.20' },
              { key: 'ctid', label: 'CT ID (optional)', placeholder: '101' },
            ]}
          />
          <button
            type="button"
            onClick={() => setLxcHasDocker(v => !v)}
            className={cn(
              'flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-colors',
              lxcHasDocker ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-white/[0.03]'
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0',
              lxcHasDocker ? 'border-primary bg-primary' : 'border-muted-foreground/40'
            )}>
              {lxcHasDocker && <Check className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className="text-sm font-medium">Runs Docker</p>
              <p className="text-xs text-muted-foreground">Service runs inside a Docker container on this LXC</p>
            </div>
          </button>
        </div>
      )}

      {/* Step: VM */}
      {currentStep === 'vm' && (
        <SelectOrCreate
          label="Virtual Machine"
          hint="The VM on Proxmox where Docker (or the service) lives."
          items={related.vms}
          selected={vm}
          onSelect={setVm}
          newFields={[
            { key: 'name', label: 'VM name',         placeholder: 'e.g. Docker VM' },
            { key: 'ip',   label: 'IP address',      placeholder: '192.168.1.30' },
            { key: 'vmid', label: 'VM ID (optional)', placeholder: '100' },
          ]}
        />
      )}

      {/* Step: Device */}
      {currentStep === 'device-slot' && (
        <SelectOrCreate
          label="Physical Device"
          hint="The physical machine this service runs on."
          items={related.devices}
          selected={device}
          onSelect={setDevice}
          newFields={[
            { key: 'name', label: 'Device name', placeholder: 'e.g. Home Server' },
          ]}
        />
      )}

      {/* Step: Service details */}
      {currentStep === 'details' && (
        <div className="space-y-4">
          {runtime && runtime !== 'skip' && (
            <StackSummary runtime={runtime} host={host} lxc={lxc} vm={vm} device={device} />
          )}
          <div className="space-y-1.5">
            <Label>Service name *</Label>
            <Input placeholder="e.g. Plex, Grafana, Portainer" value={service.name}
              onChange={e => setService(s => ({ ...s, name: e.target.value }))} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input placeholder="http://192.168.1.20:8080 or https://plex.home.lan"
              value={service.url} onChange={e => setService(s => ({ ...s, url: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <SuggestInput model="Service" field="category" placeholder="e.g. Media, Monitoring" value={service.category}
                onChange={v => setService(s => ({ ...s, category: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={service.status} onValueChange={v => setService(s => ({ ...s, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="BUILD_IN_PROGRESS">Build in Progress</SelectItem>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {currentStep !== 'runtime' && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="ghost" onClick={goBack}><ChevronLeft className="w-4 h-4" /> Back</Button>
          {currentStep !== 'details' ? (
            <Button onClick={goNext} disabled={!currentSlotReady()}>
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving || !service.name.trim()}>
              {saving ? 'Creating…' : 'Create Service'} {!saving && <ChevronRight className="w-4 h-4" />}
            </Button>
          )}
        </div>
      )}
      {currentStep === 'runtime' && (
        <div className="pt-4 border-t border-border">
          <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-4 h-4" /> Back</Button>
        </div>
      )}
    </div>
  )
}

// ─── SelectOrCreate ───────────────────────────────────────────────────────────

function SelectOrCreate({
  label, hint, items, selected, onSelect, newFields,
}: {
  label: string
  hint: string
  items: NamedItem[]
  selected: SlotValue
  onSelect: (v: SlotValue) => void
  newFields: { key: string; label: string; placeholder: string }[]
}) {
  const [showNew, setShowNew] = useState(items.length === 0)
  const [newData, setNewData] = useState<Record<string, string>>({})

  function setField(k: string, v: string) {
    const updated = { ...newData, [k]: v }
    setNewData(updated)
    onSelect({ existingId: null, newData: updated })
  }

  function pickExisting(item: NamedItem) {
    setShowNew(false)
    onSelect({ existingId: item.id, newData: null })
  }

  function openNew() {
    setShowNew(true)
    onSelect({ existingId: null, newData: newData })
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Existing</p>
          <div className="grid grid-cols-1 gap-1.5">
            {items.map(item => {
              const isSelected = selected.existingId === item.id
              return (
                <button key={item.id} onClick={() => pickExisting(item)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg border text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border/80 hover:bg-white/[0.03]'
                  )}>
                  <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40')}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    {item.ip && <p className="text-xs text-muted-foreground font-mono">{item.ip}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Create new */}
      <div className={cn('rounded-xl border transition-colors', showNew ? 'border-primary/40 bg-primary/5' : 'border-border')}>
        <button onClick={openNew}
          className="flex items-center gap-2 w-full px-3.5 py-2.5 text-left">
          <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
            showNew && !selected.existingId ? 'border-primary bg-primary' : 'border-muted-foreground/40')}>
            {showNew && !selected.existingId
              ? <Check className="w-2.5 h-2.5 text-white" />
              : <Plus className="w-2.5 h-2.5 text-muted-foreground" />}
          </div>
          <span className="text-sm font-medium">
            {items.length === 0 ? `Create a new ${label}` : `+ Create a new one`}
          </span>
        </button>
        {showNew && (
          <div className="px-3.5 pb-3.5 space-y-3 border-t border-primary/20 pt-3">
            {newFields.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input placeholder={f.placeholder} value={newData[f.key] ?? ''}
                  onChange={e => setField(f.key, e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stack summary shown on the final details step ────────────────────────────

function StackSummary({ runtime, host, lxc, vm, device }: {
  runtime: Runtime
  host: SlotValue; lxc: SlotValue; vm: SlotValue; device: SlotValue
}) {
  const parts: string[] = []
  const name = (slot: SlotValue, fallback: string) =>
    slot.existingId ? fallback : (slot.newData?.name ?? fallback)

  if (runtime === 'lxc')              parts.push(`LXC: ${name(lxc, 'LXC')}`)
  else if (runtime === 'vm-direct')   parts.push(`VM: ${name(vm, 'VM')}`)
  else if (runtime === 'device-direct') parts.push(`Device: ${name(device, 'Device')}`)

  if (parts.length === 0) return null

  return (
    <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 space-y-1">
      <p className="text-xs font-semibold text-emerald-400">Service will be linked to:</p>
      <div className="flex flex-wrap gap-2">
        {parts.map(p => (
          <span key={p} className="text-xs bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-md font-mono">{p}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Quick-add forms (for non-service types) ──────────────────────────────────

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
          {items.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  )
}

function DeviceForm({ data, onChange }: { data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Device name *"><Input placeholder="e.g. pfSense Firewall" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} /></Field>
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
        <Field label="Brand"><SuggestInput model="Device" field="brand" placeholder="e.g. Ubiquiti" value={data.brand ?? ''} onChange={v => onChange('brand', v)} /></Field>
        <Field label="Model"><SuggestInput model="Device" field="model" placeholder="e.g. USW-Pro-24" value={data.model ?? ''} onChange={v => onChange('model', v)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Management IP"><Input placeholder="192.168.1.1" value={data.managementIp ?? ''} onChange={e => onChange('managementIp', e.target.value)} /></Field>
        <Field label="Status"><StatusSelect value={data.status} onChange={v => onChange('status', v)} /></Field>
      </div>
      <Field label="Location"><SuggestInput model="Device" field="location" placeholder="e.g. Server Rack - U1" value={data.location ?? ''} onChange={v => onChange('location', v)} /></Field>
    </>
  )
}

function HostForm({ data, onChange, related }: { data: Record<string, string>; onChange: (k: string, v: string) => void; related: RelatedData }) {
  return (
    <>
      <Field label="Host name *"><Input placeholder="e.g. Proxmox PVE" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} /></Field>
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
      <HostSelect label="Which physical device does this run on?" hint="Optional." items={related.devices} value={data.deviceId ?? ''} onChange={v => onChange('deviceId', v)} placeholder="Select device…" />
    </>
  )
}

function VMForm({ data, onChange, related }: { data: Record<string, string>; onChange: (k: string, v: string) => void; related: RelatedData }) {
  return (
    <>
      <Field label="VM name *"><Input placeholder="e.g. Docker VM" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} /></Field>
      {related.virtualHosts.length > 0
        ? <HostSelect label="Which host runs this VM? *" items={related.virtualHosts} value={data.hostId ?? ''} onChange={v => onChange('hostId', v)} placeholder="Select virtualisation host…" />
        : <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">No virtualisation hosts yet — create one first.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="VM ID"><Input placeholder="100" value={data.vmid ?? ''} onChange={e => onChange('vmid', e.target.value)} /></Field>
        <Field label="Status"><StatusSelect value={data.status} onChange={v => onChange('status', v)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IP address"><Input placeholder="192.168.10.10" value={data.ip ?? ''} onChange={e => onChange('ip', e.target.value)} /></Field>
        <Field label="OS"><Input placeholder="e.g. Ubuntu 24.04" value={data.os ?? ''} onChange={e => onChange('os', e.target.value)} /></Field>
      </div>
    </>
  )
}

function LXCForm({ data, onChange, related }: { data: Record<string, string>; onChange: (k: string, v: string) => void; related: RelatedData }) {
  return (
    <>
      <Field label="Container name *"><Input placeholder="e.g. Docker LXC" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} /></Field>
      {related.virtualHosts.length > 0
        ? <HostSelect label="Which host runs this LXC? *" items={related.virtualHosts} value={data.hostId ?? ''} onChange={v => onChange('hostId', v)} placeholder="Select virtualisation host…" />
        : <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">No virtualisation hosts yet — create one first.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="CT ID"><Input placeholder="200" value={data.ctid ?? ''} onChange={e => onChange('ctid', e.target.value)} /></Field>
        <Field label="Status"><StatusSelect value={data.status} onChange={v => onChange('status', v)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IP address"><Input placeholder="192.168.10.20" value={data.ip ?? ''} onChange={e => onChange('ip', e.target.value)} /></Field>
        <Field label="OS"><Input placeholder="e.g. Debian 12" value={data.os ?? ''} onChange={e => onChange('os', e.target.value)} /></Field>
      </div>
    </>
  )
}

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

function BackupForm({ data, onChange }: { data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Job name *"><Input placeholder="e.g. Proxmox VM Backups" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} /></Field>
      <Field label="What does it back up?"><Input placeholder="e.g. All VMs on Proxmox" value={data.description ?? ''} onChange={e => onChange('description', e.target.value)} /></Field>
      <Field label="Destination"><SuggestInput model="BackupJob" field="destination" placeholder="e.g. NAS - /tank/backups" value={data.destination ?? ''} onChange={v => onChange('destination', v)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Schedule"><SuggestInput model="BackupJob" field="schedule" placeholder="e.g. Daily at 03:00" value={data.schedule ?? ''} onChange={v => onChange('schedule', v)} /></Field>
        <Field label="Retention"><SuggestInput model="BackupJob" field="retention" placeholder="e.g. 7 daily, 4 weekly" value={data.retention ?? ''} onChange={v => onChange('retention', v)} /></Field>
      </div>
      <Field label="Tool"><SuggestInput model="BackupJob" field="tool" placeholder="e.g. Proxmox Backup Server, restic" value={data.tool ?? ''} onChange={v => onChange('tool', v)} /></Field>
    </>
  )
}

function DocForm({ data, onChange }: { data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <Field label="Page title *">
      <Input placeholder="e.g. Network Overview" value={data.title ?? ''} onChange={e => onChange('title', e.target.value)} />
    </Field>
  )
}
