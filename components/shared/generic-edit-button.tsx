'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Edit, Archive, Trash2 } from 'lucide-react'
import { OsCombobox } from './os-combobox'
import { SuggestInput } from './suggest-input'

// Fields that use SuggestInput: [model, field]
const SUGGEST_FIELDS: Record<string, [string, string]> = {
  category:    ['Service',    'category'],
  tool:        ['BackupJob',  'tool'],
  destination: ['BackupJob',  'destination'],
  schedule:    ['BackupJob',  'schedule'],
  retention:   ['BackupJob',  'retention'],
  backupType:  ['BackupJob',  'backupType'],
  purpose:     ['VirtualHost','purpose'],
  dockerDataPath: ['LXC',     'dockerDataPath'],
}

// Fields that render as a full-width textarea
const TEXT_AREA_FIELDS = new Set(['notes', 'setupNotes', 'troubleshootingNotes', 'extraInfo', 'content', 'description'])
// Fields that render as a status Select
const SELECT_FIELDS = new Set(['status'])
// Fields stored as integers (inputs use type=number)
const NUMBER_FIELDS = new Set(['cpu', 'disk', 'vlanId', 'targetPort', 'port'])
// ram is special: stored in MB, displayed/edited in GB
const RAM_FIELDS = new Set(['ram'])
// Boolean toggle fields (stored as 'true'/'false' strings in form state)
const BOOLEAN_FIELDS = new Set(['hasDocker'])

const STATUS_OPTIONS = [
  { value: 'ACTIVE',             label: 'Active' },
  { value: 'OFFLINE',            label: 'Offline' },
  { value: 'WARNING',            label: 'Warning' },
  { value: 'BUILD_IN_PROGRESS',  label: 'Build in Progress' },
  { value: 'RETIRED',            label: 'Retired' },
  { value: 'UNKNOWN',            label: 'Unknown' },
]

const FIELD_LABELS: Record<string, string> = {
  name: 'Name', hostname: 'Hostname', ip: 'IP Address',
  os: 'OS / Firmware', version: 'Version',
  cpu: 'CPUs', ram: 'RAM (GB)', disk: 'Disk (GB)', storage: 'Storage',
  status: 'Status',
  notes: 'Notes', setupNotes: 'Setup Notes',
  troubleshootingNotes: 'Troubleshooting', extraInfo: 'Extra Info',
  content: 'Content', description: 'Description',
  vmid: 'VM ID', ctid: 'CT ID', title: 'Title',
  schedule: 'Schedule', retention: 'Retention',
  destination: 'Destination', backupType: 'Backup Type', tool: 'Tool',
  recordName: 'Record Name', domain: 'Domain',
  subnet: 'Subnet', gateway: 'Gateway', purpose: 'Purpose', vlanId: 'VLAN ID',
  targetIp: 'Target IP', targetPort: 'Target Port',
  hasDocker: 'Runs Docker', dockerDataPath: 'Compose / Stack Root Path',
}

// Fields that sit side-by-side in a 2-column grid
const COMPACT_FIELDS = new Set([
  'name','hostname','ip','os','version','cpu','ram','disk','storage',
  'vmid','ctid','title','schedule','retention','destination','backupType',
  'tool','recordName','domain','subnet','gateway','purpose','vlanId',
  'targetIp','targetPort','status','dockerDataPath',
])

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
      if (RAM_FIELDS.has(f)) {
        const mb = currentData[f] != null ? Number(currentData[f]) : 0
        initial[f] = mb ? String(mb / 1024) : ''
      } else if (BOOLEAN_FIELDS.has(f)) {
        initial[f] = currentData[f] ? 'true' : 'false'
      } else {
        initial[f] = currentData[f] != null ? String(currentData[f]) : ''
      }
    }
    return initial
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    const payload: Record<string, string | number | boolean | null> = {}
    for (const [k, v] of Object.entries(form)) {
      if (RAM_FIELDS.has(k)) {
        payload[k] = v ? Math.round(parseFloat(v) * 1024) : null
      } else if (NUMBER_FIELDS.has(k)) {
        payload[k] = v ? parseInt(v) : null
      } else if (BOOLEAN_FIELDS.has(k)) {
        payload[k] = v === 'true'
      } else {
        payload[k] = v
      }
    }
    await fetch(`${apiPath}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

  async function deletePermanently() {
    if (!confirm(`Permanently delete this ${label.toLowerCase()}? This cannot be undone.`)) return
    const res = await fetch(`${apiPath}/${id}?permanent=true`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Delete failed.')
      return
    }
    if (redirectPath) router.push(redirectPath)
    router.refresh()
  }

  const hasArchive = typeof (currentData as any).archived !== 'undefined'

  const compactFields = fields.filter(f => COMPACT_FIELDS.has(f))
  const wideFields    = fields.filter(f => !COMPACT_FIELDS.has(f))

  function renderField(field: string) {
    const fieldLabel = FIELD_LABELS[field] ?? field
    if (SELECT_FIELDS.has(field)) {
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
    if (field === 'os') {
      return (
        <div key={field} className="space-y-1.5">
          <Label>{fieldLabel}</Label>
          <OsCombobox value={form[field]} onChange={v => set(field, v)} />
        </div>
      )
    }
    if (BOOLEAN_FIELDS.has(field)) {
      const checked = form[field] === 'true'
      return (
        <div key={field} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 col-span-2">
          <div>
            <p className="text-sm font-medium">{fieldLabel}</p>
            {field === 'hasDocker' && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {checked ? 'Docker is running on this container — see the Docker section on the detail page.' : 'Enable to track Docker stacks and containers on this LXC.'}
              </p>
            )}
          </div>
          <Switch checked={checked} onCheckedChange={v => set(field, v ? 'true' : 'false')} />
        </div>
      )
    }
    if (SUGGEST_FIELDS[field]) {
      const [suggestModel, suggestFieldName] = SUGGEST_FIELDS[field]
      return (
        <div key={field} className="space-y-1.5">
          <Label>{fieldLabel}</Label>
          <SuggestInput
            model={suggestModel}
            field={suggestFieldName}
            value={form[field]}
            onChange={v => set(field, v)}
            className={field === 'dockerDataPath' ? 'font-mono text-xs' : undefined}
          />
        </div>
      )
    }
    if (TEXT_AREA_FIELDS.has(field)) {
      return (
        <div key={field} className="space-y-1.5">
          <Label>{fieldLabel}</Label>
          <Textarea
            className={field === 'content' ? 'h-48 font-mono text-xs' : 'h-24'}
            value={form[field]}
            onChange={e => set(field, e.target.value)}
          />
        </div>
      )
    }
    const isMono = field === 'hostname' || field === 'ip' || field === 'os' ||
      field === 'vmid' || field === 'ctid' || field === 'subnet' ||
      field === 'gateway' || field === 'targetIp' || field === 'recordName' ||
      field === 'dockerDataPath'
    return (
      <div key={field} className="space-y-1.5">
        <Label>{fieldLabel}</Label>
        <Input
          type={(NUMBER_FIELDS.has(field) || RAM_FIELDS.has(field)) ? 'number' : 'text'}
          step={RAM_FIELDS.has(field) ? '0.5' : undefined}
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          className={isMono ? 'font-mono text-xs' : undefined}
        />
      </div>
    )
  }

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
            {/* Compact 2-column grid for basic fields */}
            {compactFields.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {compactFields.map(f => renderField(f))}
              </div>
            )}
            {/* Full-width for notes/textarea fields */}
            {wideFields.map(f => renderField(f))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
            <div className="flex gap-1">
              {hasArchive && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={archive}>
                  <Archive className="w-4 h-4" /> Archive
                </Button>
              )}
              {hasArchive && (
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={deletePermanently}>
                  <Trash2 className="w-4 h-4" /> Delete
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
