'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Link2 } from 'lucide-react'

interface Props {
  // The ID and field name to set on the service
  relationField: 'dockerHostId' | 'lxcId' | 'vmId' | 'virtualHostId' | 'deviceId'
  relationId: string
  label: string // e.g. "this LXC"
}

interface NamedItem { id: string; name: string }

export function AssignServiceButton({ relationField, relationId, label }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [services, setServices] = useState<NamedItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    fetch('/api/services')
      .then(r => r.json())
      .then((all: any[]) => setServices(all.filter((s: any) => !s.archived)))
      .catch(() => {})
  }, [open])

  async function assign() {
    if (!selectedId) return
    setSaving(true)
    setError('')
    try {
      const body: Record<string, string | null> = {
        dockerHostId: null, lxcId: null, vmId: null, virtualHostId: null, deviceId: null,
      }
      body[relationField] = relationId
      const res = await fetch(`/api/services/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setError('Failed to assign service.'); setSaving(false); return }
      setOpen(false)
      setSelectedId('')
      router.refresh()
    } catch {
      setError('Network error.')
      setSaving(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Link2 className="w-3.5 h-3.5" />
        Assign service
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign a service to {label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="space-y-1.5">
              <Label>Service</Label>
              {services.length === 0
                ? <p className="text-sm text-muted-foreground">No services found.</p>
                : (
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger><SelectValue placeholder="Select a service…" /></SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
            </div>
            <p className="text-xs text-muted-foreground">
              This will replace the service's current hosting assignment.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={assign} disabled={saving || !selectedId}>
                {saving ? 'Saving…' : 'Assign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
