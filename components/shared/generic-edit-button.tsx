'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Archive } from 'lucide-react'

const TEXT_AREA_FIELDS = ['notes', 'setupNotes', 'troubleshootingNotes', 'extraInfo', 'content', 'description']
const SELECT_FIELDS = ['status']
const NUMBER_FIELDS = ['cpu', 'ram', 'disk', 'vlanId', 'targetPort', 'port']

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'BUILD_IN_PROGRESS', label: 'Build in Progress' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  hostname: 'Hostname',
  ip: 'IP Address',
  os: 'OS',
  version: 'Version',
  cpu: 'CPUs',
  ram: 'RAM (MB)',
  disk: 'Disk (GB)',
  storage: 'Storage',
  status: 'Status',
  notes: 'Notes',
  setupNotes: 'Setup Notes',
  troubleshootingNotes: 'Troubleshooting',
  extraInfo: 'Extra Info',
  content: 'Content',
  description: 'Description',
  vmid: 'VM ID',
  ctid: 'CT ID',
  title: 'Title',
  schedule: 'Schedule',
  retention: 'Retention',
  destination: 'Destination',
  tool: 'Tool',
  recordName: 'Record Name',
  domain: 'Domain',
  subnet: 'Subnet',
  gateway: 'Gateway',
  purpose: 'Purpose',
  vlanId: 'VLAN ID',
  targetIp: 'Target IP',
  targetPort: 'Target Port',
}

interface GenericEditButtonProps {
  id: string
  apiPath: string
  redirectPath?: string
  label: string
  currentData: Record<string, unknown>
  fields: string[]
  onSuccess?: () => void
}

export function GenericEditButton({ id, apiPath, redirectPath, label, currentData, fields }: GenericEditButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const f of fields) {
      initial[f] = currentData[f] != null ? String(currentData[f]) : ''
    }
    return initial
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    await fetch(`${apiPath}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function archive() {
    if (!confirm(`Archive this ${label.toLowerCase()}?`)) return
    await fetch(`${apiPath}/${id}`, { method: 'DELETE' })
    if (redirectPath) router.push(redirectPath)
    router.refresh()
  }

  const hasArchive = typeof (currentData as any).archived !== 'undefined'

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Edit className="w-4 h-4" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {label}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {fields.map(field => {
              const fieldLabel = FIELD_LABELS[field] ?? field
              if (SELECT_FIELDS.includes(field)) {
                return (
                  <div key={field} className="space-y-1.5">
                    <Label>{fieldLabel}</Label>
                    <Select value={form[field]} onValueChange={v => set(field, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }
              if (TEXT_AREA_FIELDS.includes(field)) {
                return (
                  <div key={field} className="space-y-1.5">
                    <Label>{fieldLabel}</Label>
                    <Textarea className={field === 'content' ? 'h-48 font-mono text-xs' : 'h-20'} value={form[field]} onChange={e => set(field, e.target.value)} />
                  </div>
                )
              }
              return (
                <div key={field} className="space-y-1.5">
                  <Label>{fieldLabel}</Label>
                  <Input type={NUMBER_FIELDS.includes(field) ? 'number' : 'text'} value={form[field]} onChange={e => set(field, e.target.value)} />
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
            <div>
              {hasArchive && (
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={archive}>
                  <Archive className="w-4 h-4" /> Archive
                </Button>
              )}
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
