'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface NamedItem { id: string; name: string; ip?: string | null }

type HostingType = 'lxc' | 'vm' | 'virtualhost' | 'device' | 'none'

interface Props {
  serviceId: string
  current: {
    lxcId: string | null
    vmId: string | null
    virtualHostId: string | null
    deviceId: string | null
  }
}

export function QuickAssignHosting({ serviceId, current }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [type, setType] = useState<HostingType>(
    current.lxcId ? 'lxc' :
    current.vmId ? 'vm' :
    current.virtualHostId ? 'virtualhost' :
    current.deviceId ? 'device' : 'none'
  )
  const [selectedId, setSelectedId] = useState(
    current.lxcId ?? current.vmId ?? current.virtualHostId ?? current.deviceId ?? ''
  )

  const [lxcs, setLxcs]         = useState<NamedItem[]>([])
  const [vms, setVms]           = useState<NamedItem[]>([])
  const [hosts, setHosts]       = useState<NamedItem[]>([])
  const [devices, setDevices]   = useState<NamedItem[]>([])

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/virtualisation/lxcs').then(r => r.json()),
      fetch('/api/virtualisation/vms').then(r => r.json()),
      fetch('/api/virtualisation/hosts').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([l, v, h, d]) => {
      setLxcs(l); setVms(v); setHosts(h); setDevices(d)
    }).catch(() => {})
  }, [open])

  function itemsForType(): NamedItem[] {
    switch (type) {
      case 'lxc':        return lxcs
      case 'vm':         return vms
      case 'virtualhost':return hosts
      case 'device':     return devices
      default:           return []
    }
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/services/${serviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lxcId:         type === 'lxc'         ? selectedId || null : null,
        vmId:          type === 'vm'          ? selectedId || null : null,
        virtualHostId: type === 'virtualhost' ? selectedId || null : null,
        deviceId:      type === 'device'      ? selectedId || null : null,
        dockerHostId:  null,
      }),
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  const isAssigned = !!(current.lxcId || current.vmId || current.virtualHostId || current.deviceId)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
      >
        <Link2 className="w-3 h-3" />
        {isAssigned ? 'Reassign' : 'Assign hosting'}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign hosting</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Hosted on</Label>
              <Select value={type} onValueChange={v => { setType(v as HostingType); setSelectedId('') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lxc">LXC container</SelectItem>
                  <SelectItem value="vm">Virtual machine</SelectItem>
                  <SelectItem value="virtualhost">Virtualisation host</SelectItem>
                  <SelectItem value="device">Physical device</SelectItem>
                  <SelectItem value="none">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type !== 'none' && (
              <div className="space-y-1.5">
                <Label>
                  {type === 'lxc' ? 'LXC' : type === 'vm' ? 'VM' : type === 'virtualhost' ? 'Host' : 'Device'}
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
