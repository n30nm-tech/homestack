'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Terminal, CheckCircle, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'

// ─── The script users run on their Proxmox host ───────────────────────────────

const SCAN_SCRIPT = `#!/usr/bin/env python3
import json, subprocess, re

def pvesh(path):
    try:
        r = subprocess.run(["pvesh","get",path,"--output-format","json"],
                           capture_output=True, text=True)
        return json.loads(r.stdout) if r.stdout.strip() else []
    except:
        return []

def extract_ip(cfg):
    if not isinstance(cfg, dict): return None
    for k, v in cfg.items():
        if (k.startswith("net") or k.startswith("ipconfig")) and "ip=" in str(v):
            m = re.search(r"ip=([0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+)", str(v))
            if m: return m.group(1)
    return None

nodes_raw = pvesh("/nodes")
result = {"version": 1, "nodes": []}

for n in nodes_raw:
    node = n["node"]
    status = pvesh(f"/nodes/{node}/status")
    nets   = pvesh(f"/nodes/{node}/network")
    vms_l  = pvesh(f"/nodes/{node}/qemu")
    lxcs_l = pvesh(f"/nodes/{node}/lxc")

    ip = next((i.get("address") for i in nets
               if isinstance(i,dict) and i.get("address")
               and not i.get("address","").startswith("127.")), None)

    vms = []
    for v in vms_l:
        cfg = pvesh(f"/nodes/{node}/qemu/{v['vmid']}/config")
        vms.append({
            "vmid": str(v["vmid"]), "name": v["name"], "status": v["status"],
            "cpu":  v.get("cpus"),
            "ram":  round(v["maxmem"]/1048576)  if v.get("maxmem")  else None,
            "disk": round(v["maxdisk"]/1073741824) if v.get("maxdisk") else None,
            "ip":   extract_ip(cfg),
        })

    lxcs = []
    for l in lxcs_l:
        cfg = pvesh(f"/nodes/{node}/lxc/{l['vmid']}/config")
        features = cfg.get("features","") if isinstance(cfg,dict) else ""
        lxcs.append({
            "ctid":      str(l["vmid"]), "name": l["name"], "status": l["status"],
            "cpu":       l.get("cpus"),
            "ram":       round(l["maxmem"]/1048576) if l.get("maxmem") else None,
            "ip":        extract_ip(cfg),
            "hasDocker": "nesting=1" in str(features),
        })

    mem = status.get("memory",{}) if isinstance(status,dict) else {}
    result["nodes"].append({
        "name":    node,
        "ip":      ip,
        "version": status.get("pveversion") if isinstance(status,dict) else None,
        "cpu":     status.get("cpuinfo",{}).get("cpus") if isinstance(status,dict) else None,
        "ram":     round(mem["total"]/1048576) if mem.get("total") else None,
        "vms":     vms,
        "lxcs":    lxcs,
    })

print("---HOMESTACK_SCAN_START---")
print(json.dumps(result, indent=2))
print("---HOMESTACK_SCAN_END---")`

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanLxc  { ctid: string; name: string; status: string; cpu?: number | null; ram?: number | null; ip?: string | null; hasDocker?: boolean }
interface ScanVm   { vmid: string; name: string; status: string; cpu?: number | null; ram?: number | null; disk?: number | null; ip?: string | null }
interface ScanNode { name: string; ip?: string | null; version?: string | null; cpu?: number | null; ram?: number | null; vms: ScanVm[]; lxcs: ScanLxc[] }
interface ScanResult { version: number; nodes: ScanNode[] }

function parseScan(raw: string): ScanResult | null {
  try {
    const start = raw.indexOf('---HOMESTACK_SCAN_START---')
    const end   = raw.indexOf('---HOMESTACK_SCAN_END---')
    if (start === -1 || end === -1) return null
    const json = raw.slice(start + '---HOMESTACK_SCAN_START---'.length, end).trim()
    return JSON.parse(json)
  } catch {
    return null
  }
}

// ─── Script display with copy ─────────────────────────────────────────────────

function ScriptBlock({ script }: { script: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative rounded-xl border border-border bg-black/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">proxmox-scan.py</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="text-xs font-mono p-4 overflow-x-auto max-h-56 text-muted-foreground leading-relaxed">{script}</pre>
    </div>
  )
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function NodePreview({ node }: { node: ScanNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <span className="text-sm font-medium">{node.name}</span>
        {node.ip && <span className="text-xs text-muted-foreground font-mono">{node.ip}</span>}
        {node.version && <span className="text-xs text-muted-foreground">{node.version}</span>}
        <span className="ml-auto text-xs text-muted-foreground">{node.vms.length} VMs · {node.lxcs.length} LXCs</span>
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {node.vms.map(vm => (
            <div key={vm.vmid} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs text-muted-foreground font-mono w-12">VM{vm.vmid}</span>
              <span className="text-sm">{vm.name}</span>
              {vm.ip && <span className="text-xs text-muted-foreground font-mono">{vm.ip}</span>}
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${vm.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{vm.status}</span>
            </div>
          ))}
          {node.lxcs.map(lxc => (
            <div key={lxc.ctid} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs text-muted-foreground font-mono w-12">CT{lxc.ctid}</span>
              <span className="text-sm">{lxc.name}</span>
              {lxc.ip && <span className="text-xs text-muted-foreground font-mono">{lxc.ip}</span>}
              {lxc.hasDocker && <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Docker</span>}
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${lxc.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{lxc.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function ProxmoxImportDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'script' | 'paste' | 'preview' | 'done'>('script')
  const [raw, setRaw] = useState('')
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<{ hosts: number; vms: number; services: number; skipped: number } | null>(null)

  function handlePaste(text: string) {
    setRaw(text)
    setError('')
    if (!text.trim()) { setScan(null); return }
    const parsed = parseScan(text)
    if (!parsed) {
      setError('Could not find scan output. Make sure you copied the full output including the --- markers.')
      setScan(null)
    } else {
      setScan(parsed)
      setError('')
    }
  }

  async function doImport() {
    if (!scan) return
    setImporting(true)
    setError('')
    try {
      const res = await fetch('/api/virtualisation/proxmox-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scan),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setSummary(data.summary)
      setStep('done')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep('script'); setRaw(''); setScan(null); setError(''); setSummary(null)
  }

  function handleClose() {
    setOpen(false)
    setTimeout(reset, 300)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Terminal className="w-3.5 h-3.5" />
        Import from Proxmox
      </Button>

      <Dialog open={open} onOpenChange={o => !o && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Proxmox</DialogTitle>
            <DialogDescription>
              Run the scan script on your Proxmox host, then paste the output here to auto-import nodes, VMs, and LXC containers.
            </DialogDescription>
          </DialogHeader>

          {step === 'done' && summary ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <div>
                <p className="font-medium">Import complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {summary.hosts > 0 && `${summary.hosts} host${summary.hosts !== 1 ? 's' : ''} · `}
                  {summary.vms > 0 && `${summary.vms} VM${summary.vms !== 1 ? 's' : ''} · `}
                  {summary.services > 0 && `${summary.services} service${summary.services !== 1 ? 's' : ''}`}
                  {summary.skipped > 0 && ` · ${summary.skipped} already existed (updated)`}
                </p>
              </div>
              <Button onClick={handleClose}>Close</Button>
            </div>
          ) : (
            <div className="space-y-5 mt-2">

              {/* Step tabs */}
              <div className="flex gap-1 text-xs">
                {(['script', 'paste', 'preview'] as const).map((s, i) => (
                  <button key={s} onClick={() => step !== 'done' && setStep(s)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${step === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {i + 1}. {s === 'script' ? 'Get script' : s === 'paste' ? 'Paste output' : 'Preview & import'}
                  </button>
                ))}
              </div>

              {step === 'script' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Copy this script and run it on your Proxmox host:</p>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
                    <strong>SSH into your Proxmox host</strong>, then run:<br />
                    <span className="font-mono">python3 proxmox-scan.py</span> — or paste directly into a Python3 session.
                  </div>
                  <ScriptBlock script={SCAN_SCRIPT} />
                  <div className="flex justify-end">
                    <Button onClick={() => setStep('paste')}>Next: Paste output →</Button>
                  </div>
                </div>
              )}

              {step === 'paste' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Paste the full output from the script here:</p>
                  <Textarea
                    className="font-mono text-xs h-56"
                    placeholder={`---HOMESTACK_SCAN_START---\n{\n  "version": 1,\n  "nodes": [...]\n}\n---HOMESTACK_SCAN_END---`}
                    value={raw}
                    onChange={e => handlePaste(e.target.value)}
                  />
                  {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep('script')}>← Back</Button>
                    <Button onClick={() => setStep('preview')} disabled={!scan}>
                      Next: Preview →
                    </Button>
                  </div>
                </div>
              )}

              {step === 'preview' && scan && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Found <strong>{scan.nodes.length}</strong> node{scan.nodes.length !== 1 ? 's' : ''} with{' '}
                    <strong>{scan.nodes.reduce((a, n) => a + n.vms.length, 0)}</strong> VMs and{' '}
                    <strong>{scan.nodes.reduce((a, n) => a + n.lxcs.length, 0)}</strong> LXC containers. Existing records will be updated, new ones created.
                  </p>
                  <div className="space-y-3">
                    {scan.nodes.map(n => <NodePreview key={n.name} node={n} />)}
                  </div>
                  {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
                  <div className="flex justify-between pt-2 border-t border-border">
                    <Button variant="outline" onClick={() => setStep('paste')}>← Back</Button>
                    <Button onClick={doImport} disabled={importing}>
                      {importing ? 'Importing…' : 'Import'}
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
