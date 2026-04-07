'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit, Star, Archive } from 'lucide-react'

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
    dockerCompose: string | null
    envVars: string | null
    setupSteps: string | null
    runCommands: string | null
    reverseProxyConfig: string | null
    notes: string | null
    setupNotes: string | null
    troubleshootingNotes: string | null
    extraInfo: string | null
  }
}

export function ServiceEditForm({ service }: ServiceEditFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: service.name,
    url: service.url ?? '',
    description: service.description ?? '',
    ip: service.ip ?? '',
    port: service.port ? String(service.port) : '',
    category: service.category ?? '',
    status: service.status,
    favourite: service.favourite,
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

  function set(key: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }))
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
              <TabsTrigger value="config" className="flex-1">Config</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} />
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

            <TabsContent value="config" className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>Docker Compose</Label>
                <Textarea className="h-40 font-mono text-xs" value={form.dockerCompose} onChange={e => set('dockerCompose', e.target.value)} placeholder="version: '3.8'&#10;services:&#10;  app:&#10;    image: …" />
              </div>
              <div className="space-y-1.5">
                <Label>Environment Variables</Label>
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
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={archive}>
              <Archive className="w-4 h-4" />
              Archive
            </Button>
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
