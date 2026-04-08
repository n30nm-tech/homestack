'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit, Archive, Download, Trash2 } from 'lucide-react'

interface DocEditFormProps {
  page: {
    id: string
    title: string
    content: string | null
    setupNotes: string | null
    troubleshootingNotes: string | null
    extraInfo: string | null
  }
}

export function DocEditForm({ page }: DocEditFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: page.title,
    content: page.content ?? '',
    setupNotes: page.setupNotes ?? '',
    troubleshootingNotes: page.troubleshootingNotes ?? '',
    extraInfo: page.extraInfo ?? '',
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/docs/${page.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function archive() {
    if (!confirm('Archive this documentation page?')) return
    await fetch(`/api/docs/${page.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    router.push('/docs')
    router.refresh()
  }

  async function deletePermanently() {
    if (!confirm('Permanently delete this page? This cannot be undone.')) return
    const res = await fetch(`/api/docs/${page.id}?permanent=true`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? 'Delete failed.'); return }
    router.push('/docs')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <a
          href={`/api/export?type=doc&id=${page.id}`}
          className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-secondary text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </a>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Edit className="w-4 h-4" />
          Edit
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Documentation Page</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                className="h-48 font-sans text-sm"
                value={form.content}
                onChange={e => set('content', e.target.value)}
                placeholder="Main content / notes for this page…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Setup Notes</Label>
              <Textarea className="h-28" value={form.setupNotes} onChange={e => set('setupNotes', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Troubleshooting</Label>
              <Textarea className="h-28" value={form.troubleshootingNotes} onChange={e => set('troubleshootingNotes', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Extra Info</Label>
              <Textarea className="h-24" value={form.extraInfo} onChange={e => set('extraInfo', e.target.value)} />
            </div>
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
