'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Archive, Star, Trash2 } from 'lucide-react'
import { DeviceType } from '@prisma/client'

export function DeviceEditForm({ device }: { device: any }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: device.name,
    brand: device.brand ?? '',
    model: device.model ?? '',
    hostname: device.hostname ?? '',
    managementIp: device.managementIp ?? '',
    mainIp: device.mainIp ?? '',
    macAddress: device.macAddress ?? '',
    serialNumber: device.serialNumber ?? '',
    location: device.location ?? '',
    rackRoom: device.rackRoom ?? '',
    role: device.role ?? '',
    os: device.os ?? '',
    ports: device.ports ?? '',
    status: device.status,
    notes: device.notes ?? '',
    setupNotes: device.setupNotes ?? '',
    troubleshootingNotes: device.troubleshootingNotes ?? '',
    extraInfo: device.extraInfo ?? '',
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/devices/${device.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function toggleFavourite() {
    await fetch(`/api/devices/${device.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favourite: !device.favourite }),
    })
    router.refresh()
  }

  async function archive() {
    if (!confirm('Archive this device?')) return
    await fetch(`/api/devices/${device.id}`, { method: 'DELETE' })
    router.push('/devices')
    router.refresh()
  }

  async function deletePermanently() {
    if (!confirm('Permanently delete this device? This cannot be undone.')) return
    const res = await fetch(`/api/devices/${device.id}?permanent=true`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? 'Delete failed.'); return }
    router.push('/devices')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleFavourite}>
          <Star className={device.favourite ? 'text-amber-400 fill-amber-400' : ''} />
        </Button>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Edit className="w-4 h-4" /> Edit
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Device</DialogTitle></DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2 space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Brand</Label><Input value={form.brand} onChange={e => set('brand', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Model</Label><Input value={form.model} onChange={e => set('model', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Hostname</Label><Input value={form.hostname} onChange={e => set('hostname', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Status</Label>
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
            <div className="space-y-1.5"><Label>Management IP</Label><Input value={form.managementIp} onChange={e => set('managementIp', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Main IP</Label><Input value={form.mainIp} onChange={e => set('mainIp', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>MAC Address</Label><Input value={form.macAddress} onChange={e => set('macAddress', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Serial Number</Label><Input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={e => set('location', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Rack / Room</Label><Input value={form.rackRoom} onChange={e => set('rackRoom', e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Role</Label><Input value={form.role} onChange={e => set('role', e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>OS / Firmware</Label><Input value={form.os} onChange={e => set('os', e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Ports</Label><Input value={form.ports} onChange={e => set('ports', e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Textarea className="h-20" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Setup Notes</Label><Textarea className="h-20" value={form.setupNotes} onChange={e => set('setupNotes', e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Troubleshooting</Label><Textarea className="h-20" value={form.troubleshootingNotes} onChange={e => set('troubleshootingNotes', e.target.value)} /></div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
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
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
