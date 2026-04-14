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

function parseScriptOutput(raw: string): ParsedService {
  const lines = raw.split('\n')
  const result: ParsedService = {
    appName: null, stackFolder: null, composeFile: null, image: null,
    port: null, containerName: null, runningStatus: null,
    bindMounts: [], namedVolumes: [], envVarNames: [], networks: [],
  }

  let section: string | null = null  // tracks current list section

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Top-level fields
    const topField = line.match(/^-\s+(.+?):\s+(.+)$/)
    if (topField) {
      const [, key, val] = topField
      switch (key.trim()) {
        case 'App Name':       result.appName       = val.trim(); break
        case 'Stack Folder':   result.stackFolder   = val.trim(); break
        case 'Compose File':   result.composeFile   = val.trim(); break
        case 'Image':          result.image         = val.trim(); break
        case 'Container Name': result.containerName = val.trim(); break
        case 'Running Status': result.runningStatus = val.trim(); break
      }
      // A field with a value ends the previous list section
      if (!rawLine.startsWith('  ')) section = null
      continue
    }

    // Section headers (lines ending with just a colon, like "- Ports:")
    const sectionHeader = line.match(/^-\s+(.+?):$/)
    if (sectionHeader) {
      section = sectionHeader[1].trim()
      continue
    }

    // List items under a section (indented with two spaces)
    if (rawLine.startsWith('  ') && section) {
      const item = line.replace(/^-\s+/, '').trim()
      if (!item || item.toLowerCase() === 'none') continue
      switch (section) {
        case 'Ports':
          // Take the host port from the first "host:container" mapping
          if (result.port === null) {
            const portMatch = item.match(/^(\d+):/)
            if (portMatch) result.port = parseInt(portMatch[1], 10)
          }
          break
        case 'Environment Variable Names':
          result.envVarNames.push(item)
          break
        case 'Bind Mounts':
          result.bindMounts.push(item)
          break
        case 'Named Volumes':
          result.namedVolumes.push(item)
          break
        case 'Networks':
        case 'All Docker Networks':
          result.networks.push(item)
          break
      }
    } else if (!rawLine.startsWith('  ')) {
      // Non-indented, non-field line resets section
      if (!line.startsWith('-')) section = null
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
