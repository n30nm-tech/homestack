'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, CheckCircle } from 'lucide-react'

// ─── Parser ──────────────────────────────────────────────────────────────────

interface ParsedService {
  appName: string | null
  stackFolder: string | null
  composeFile: string | null
  image: string | null
  port: number | null
  containerName: string | null
  runningStatus: string | null
  bindMounts: string[]
  namedVolumes: string[]
  envVarNames: string[]
  networks: string[]
}

function normaliseKey(k: string): string {
  return k.toLowerCase().replace(/[\s_-]+/g, ' ').trim()
}

function parseScriptOutput(raw: string): ParsedService {
  const lines = raw.split('\n')
  const result: ParsedService = {
    appName: null, stackFolder: null, composeFile: null, image: null,
    port: null, containerName: null, runningStatus: null,
    bindMounts: [], namedVolumes: [], envVarNames: [], networks: [],
  }

  let section: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) { section = null; continue }

    // Skip markdown headings
    if (line.startsWith('#')) continue

    // Match "key: value" lines — with or without a leading "- "
    // Handles:  "- App Name: foo"  AND  "App Name: foo"  AND  "Image: foo"
    const fieldMatch = line.match(/^(?:-\s+)?(.+?):\s+(.+)$/)
    if (fieldMatch && !rawLine.startsWith('  ')) {
      const key = normaliseKey(fieldMatch[1])
      const val = fieldMatch[2].trim()
      switch (key) {
        case 'app name':        result.appName       = val; break
        case 'stack folder':    result.stackFolder   = val; break
        case 'compose file':
        case 'compose file path': result.composeFile = val; break
        case 'image':           result.image         = val; break
        case 'container name':  result.containerName = val; break
        case 'running status':
        case 'container status': result.runningStatus = val; break
      }
      section = null
      continue
    }

    // Section headers — lines ending with just a colon (with or without leading "- ")
    const sectionMatch = line.match(/^(?:-\s+)?(.+?):$/)
    if (sectionMatch && !rawLine.startsWith('  ')) {
      section = normaliseKey(sectionMatch[1])
      continue
    }

    // Indented list items under a section
    if (rawLine.match(/^\s+/) && section) {
      const item = line.replace(/^-\s+/, '').trim()
      if (!item || item.toLowerCase() === 'none') continue
      switch (section) {
        case 'ports':
          if (result.port === null) {
            const portMatch = item.match(/^(\d+):/)
            if (portMatch) result.port = parseInt(portMatch[1], 10)
          }
          break
        case 'environment variable names':
          result.envVarNames.push(item)
          break
        case 'bind mounts':
          result.bindMounts.push(item)
          break
        case 'named volumes':
          result.namedVolumes.push(item)
          break
        case 'networks':
        case 'all docker networks':
          result.networks.push(item)
          break
      }
    }
  }

  return result
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground min-w-0 break-all">{value}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ServiceImportDialogProps {
  serviceId: string
}

export function ServiceImportDialog({ serviceId }: ServiceImportDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<ParsedService | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function handlePaste(text: string) {
    setRaw(text)
    setDone(false)
    if (text.trim()) {
      setParsed(parseScriptOutput(text))
    } else {
      setParsed(null)
    }
  }

  async function apply() {
    if (!parsed) return
    setSaving(true); setError('')
    try {
      const envVarsTemplate = parsed.envVarNames.length > 0
        ? parsed.envVarNames.map(k => `${k}=`).join('\n')
        : null

      const bindMountsText = parsed.bindMounts.length > 0
        ? parsed.bindMounts.join('\n')
        : null

      const body: Record<string, unknown> = {}
      if (parsed.port !== null)    body.port            = parsed.port
      if (envVarsTemplate)         body.envVars         = envVarsTemplate
      if (parsed.image)            body.containerImage  = parsed.image
      if (parsed.stackFolder)      body.stackFolder     = parsed.stackFolder
      if (parsed.composeFile)      body.composeFilePath = parsed.composeFile
      if (bindMountsText)          body.bindMounts      = bindMountsText

      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to import.')
        setSaving(false)
        return
      }
      setDone(true)
      router.refresh()
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setRaw('')
    setParsed(null)
    setDone(false)
    setError('')
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="w-4 h-4" />
        Import
      </Button>

      <Dialog open={open} onOpenChange={o => !o && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from LXC script</DialogTitle>
            <DialogDescription>
              Paste the output from your LXC discovery script. The app will extract the port,
              environment variable names, and container metadata.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
              <p className="font-medium">Imported successfully</p>
              <p className="text-sm text-muted-foreground">The service has been updated with the extracted data.</p>
              <Button onClick={handleClose}>Close</Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Textarea
                  className="font-mono text-xs h-52"
                  placeholder={`Paste script output here, e.g.:\n- App Name: myapp\n- Stack Folder: /root/myapp\n...\n- Ports:\n  - 3000:3000\n- Environment Variable Names:\n  - PORT\n  - TZ`}
                  value={raw}
                  onChange={e => handlePaste(e.target.value)}
                />
              </div>

              {parsed && (
                <div className="section-card space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Will import
                  </p>
                  <div className="space-y-2">
                    <PreviewRow label="Port" value={parsed.port ? String(parsed.port) : null} />
                    <PreviewRow label="Env vars (keys)" value={
                      parsed.envVarNames.length
                        ? <span className="font-mono">{parsed.envVarNames.join(', ')}</span>
                        : null
                    } />
                    <PreviewRow label="Image" value={parsed.image} />
                    <PreviewRow label="Stack folder" value={parsed.stackFolder} />
                    <PreviewRow label="Compose file" value={parsed.composeFile} />
                    {parsed.bindMounts.length > 0 && (
                      <PreviewRow label="Bind mounts" value={parsed.bindMounts.join(', ')} />
                    )}
                    {parsed.runningStatus && (
                      <PreviewRow label="Container status" value={parsed.runningStatus} />
                    )}
                  </div>
                  {!parsed.port && !parsed.envVarNames.length && !parsed.image && (
                    <p className="text-xs text-muted-foreground">
                      Nothing useful was detected — check the script output format.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={apply}
                  disabled={saving || !parsed || (!parsed.port && !parsed.envVarNames.length && !parsed.image)}
                >
                  {saving ? 'Importing…' : 'Apply import'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
