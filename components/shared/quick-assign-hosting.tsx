'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface NamedItem { id: string; name: string; ip?: string | null }

type HostingType = 'lxc' | 'vm' | 'virtualhost' | 'device' | 'none'

interface Props {
  serviceId: string
  current: {
    vmId: string | null
    virtualHostId: string | null
    deviceId: string | null
    containerId: string | null
    hasDocker: boolean
  }
  buttonVariant?: 'default' | 'link'
}

export function QuickAssignHosting({ serviceId, current, buttonVariant = 'link' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  function detectType(): HostingType {
    if (current.virtualHostId && current.containerId) return 'lxc'
    if (current.vmId) return 'vm'
    if (current.virtualHostId) return 'virtualhost'
    if (current.deviceId) return 'device'
    return 'none'
  }

  const [type, setType] = useState<HostingType>(detectType())
  const [selectedId, setSelectedId] = useState(
    current.virtualHostId ?? current.vmId ?? current.deviceId ?? ''
  )
  const [containerId, setContainerId] = useState(current.containerId ?? '')
  const [hasDocker, setHasDocker] = useState(current.hasDocker)

  const [virtualHosts, setVirtualHosts] = useState<NamedItem[]>([])
  const [vms, setVms] = useState<NamedItem[]>([])
  const [devices, setDevices] = useState<NamedItem[]>([])

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/virtualisation/hosts').then(r => r.json()),
      fetch('/api/virtualisation/vms').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([vh, vm, d]) => {
      setVirtualHosts(vh); setVms(vm); setDevices(d)
    }).catch(() => {})
  }, [open])

  function itemsForType(): NamedItem[] {
    switch (type) {
      case 'lxc':        return virtualHosts
      case 'vm':         return vms
      case 'virtualhost':return virtualHosts
      case 'device':     return devices
      default:           return []
    }
  }

  async function save() {
    setSaving(true)
    const body: Record<string, string | boolean | null> = {
      virtualHostId: null,
      vmId: null,
      deviceId: null,
      containerId: null,
      hasDocker: false,
    }
    if (type === 'lxc') {
      body.virtualHostId = selectedId || null
      body.containerId = containerId || null
      body.hasDocker = hasDocker
    } else if (type === 'vm') {
      body.vmId = selectedId || null
    } else if (type === 'virtualhost') {
      body.virtualHostId = selectedId || null
    } else if (type === 'device') {
      body.deviceId = selectedId || null
    }

    await fetch(`/api/services/${serviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  const isAssigned = !!(current.vmId || current.virtualHostId || current.deviceId)

  return (
    <>
      {buttonVariant === 'default' ? (
        <Button onClick={() => setOpen(true)}>
          <Link2 className="w-4 h-4" />
          Assign to host
        </Button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Link2 className="w-3 h-3" />
          {isAssigned ? 'Reassign' : 'Assign hosting'}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign hosting</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Hosted on</Label>
              <Select value={type} onValueChange={v => { setType(v as HostingType); setSelectedId(''); setContainerId('') }}>
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

            {type !== 'none' && (
              <div className="space-y-1.5">
                <Label>
                  {type === 'lxc' ? 'Proxmox host' : type === 'vm' ? 'VM' : type === 'virtualhost' ? 'Host' : 'Device'}
                </Label>
                {itemsForType().length === 0 ? (
                  <p className="text-xs text-muted-foreground">None added yet.</p>
                ) : (
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {itemsForType().map(i => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}{i.ip ? ` — ${i.ip}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {type === 'lxc' && (
              <>
                <div className="space-y-1.5">
                  <Label>Container ID (CT)</Label>
                  <Input value={containerId} onChange={e => setContainerId(e.target.value)} placeholder="101" className="font-mono" />
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
                  <p className="text-sm font-medium">Runs Docker</p>
                </button>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={save}
              disabled={saving || (type !== 'none' && !selectedId)}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
