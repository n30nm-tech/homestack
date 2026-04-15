'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Shield, Globe, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { CopyButton } from '@/components/shared/copy-button'

interface VLAN {
  id: string; name: string; vlanId: number; subnet: string | null; gateway: string | null
  purpose: string | null; dhcpRange: string | null; dnsServer: string | null
  internetAccess: boolean; notes: string | null
  devices: { id: string; name: string }[]
}

interface DNSRecord {
  id: string; recordName: string; domain: string | null; ip: string | null
  service: { id: string; name: string } | null
}

interface ReverseProxy {
  id: string; name: string; domain: string | null; targetIp: string | null
  targetPort: number | null; ssl: boolean; notes: string | null
  service: { id: string; name: string } | null
}

interface Props {
  vlans: VLAN[]
  dnsRecords: DNSRecord[]
  proxies: ReverseProxy[]
}

export function NetworkPageClient({ vlans: initialVlans, dnsRecords: initialDns, proxies: initialProxies }: Props) {
  const router = useRouter()
  const [addDialog, setAddDialog] = useState<'vlan' | 'dns' | 'proxy' | null>(null)
  const [editDns, setEditDns] = useState<DNSRecord | null>(null)
  const [editProxy, setEditProxy] = useState<ReverseProxy | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function f(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  function openAdd(type: 'vlan' | 'dns' | 'proxy') {
    setFormData({})
    setAddDialog(type)
  }

  async function createVlan() {
    setSaving(true)
    await fetch('/api/network/vlans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
    setSaving(false); setAddDialog(null); router.refresh()
  }

  async function saveDns(id?: string) {
    setSaving(true)
    const method = id ? 'PATCH' : 'POST'
    const url = '/api/network/dns'
    const body = id ? { id, ...formData } : formData
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false); setAddDialog(null); setEditDns(null); router.refresh()
  }

  async function saveProxy(id?: string) {
    setSaving(true)
    const method = id ? 'PATCH' : 'POST'
    const url = '/api/network/proxy'
    const body = id ? { id, ...formData } : formData
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false); setAddDialog(null); setEditProxy(null); router.refresh()
  }

  async function deleteDns(id: string) {
    if (!confirm('Archive this DNS record?')) return
    await fetch('/api/network/dns', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    router.refresh()
  }

  async function deleteProxy(id: string) {
    if (!confirm('Archive this proxy entry?')) return
    await fetch('/api/network/proxy', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    router.refresh()
  }

  function openEditDns(record: DNSRecord) {
    setEditDns(record)
    setFormData({ recordName: record.recordName, domain: record.domain ?? '', ip: record.ip ?? '' })
  }

  function openEditProxy(proxy: ReverseProxy) {
    setEditProxy(proxy)
    setFormData({ name: proxy.name, domain: proxy.domain ?? '', targetIp: proxy.targetIp ?? '', targetPort: proxy.targetPort ? String(proxy.targetPort) : '', ssl: proxy.ssl ? 'true' : 'false', notes: proxy.notes ?? '' })
  }

  return (
    <div className="page-container animate-fade-in">
      <Tabs defaultValue="vlans">
        <TabsList>
          <TabsTrigger value="vlans">VLANs ({initialVlans.length})</TabsTrigger>
          <TabsTrigger value="dns">DNS ({initialDns.length})</TabsTrigger>
          <TabsTrigger value="proxy">Reverse Proxy ({initialProxies.length})</TabsTrigger>
        </TabsList>

        {/* VLANs */}
        <TabsContent value="vlans" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openAdd('vlan')}><Plus className="w-4 h-4" /> Add VLAN</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {initialVlans.map(vlan => (
              <div key={vlan.id} className="section-card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium">{vlan.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground">VLAN {vlan.vlanId}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${vlan.internetAccess ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-muted-foreground bg-muted/40 border-border'}`}>
                    {vlan.internetAccess ? 'Internet' : 'Isolated'}
                  </span>
                </div>
                {vlan.subnet && <p className="text-xs font-mono text-muted-foreground">{vlan.subnet}</p>}
                {vlan.gateway && <p className="text-xs text-muted-foreground">GW: {vlan.gateway}</p>}
                {vlan.purpose && <p className="text-xs text-muted-foreground">{vlan.purpose}</p>}
                {vlan.dhcpRange && <p className="text-xs text-muted-foreground">DHCP: {vlan.dhcpRange}</p>}
                {vlan.devices.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {vlan.devices.map(d => (
                      <Link key={d.id} href={`/devices/${d.id}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-1.5 py-0.5">{d.name}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {initialVlans.length === 0 && <p className="text-sm text-muted-foreground col-span-3">No VLANs yet.</p>}
          </div>
        </TabsContent>

        {/* DNS */}
        <TabsContent value="dns" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openAdd('dns')}><Plus className="w-4 h-4" /> Add DNS Record</Button>
          </div>
          <div className="section-card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Record</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Domain</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">IP</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Service</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialDns.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-3.5 text-sm font-mono">
                      <div className="flex items-center gap-1.5 group/cell">
                        {r.recordName}
                        <span className="opacity-0 group-hover/cell:opacity-100 transition-opacity"><CopyButton value={r.recordName} /></span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground hidden md:table-cell">
                      {r.domain
                        ? <div className="flex items-center gap-1.5 group/cell">{r.domain}<span className="opacity-0 group-hover/cell:opacity-100 transition-opacity"><CopyButton value={r.domain} /></span></div>
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">
                      {r.ip
                        ? <div className="flex items-center gap-1.5 group/cell">{r.ip}<span className="opacity-0 group-hover/cell:opacity-100 transition-opacity"><CopyButton value={r.ip} /></span></div>
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {r.service ? <Link href={`/services/${r.service.id}`} className="text-sm hover:text-primary transition-colors">{r.service.name}</Link> : <span className="text-muted-foreground text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditDns(r)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteDns(r.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {initialDns.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No DNS records yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Reverse Proxy */}
        <TabsContent value="proxy" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openAdd('proxy')}><Plus className="w-4 h-4" /> Add Proxy Entry</Button>
          </div>
          <div className="section-card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Host</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Target</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">SSL</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Service</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialProxies.map(rp => (
                  <tr key={rp.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 group/cell">
                        {rp.ssl && <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        <span className="text-sm font-mono">{rp.name}</span>
                        <span className="opacity-0 group-hover/cell:opacity-100 transition-opacity"><CopyButton value={rp.name} /></span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground hidden lg:table-cell">
                      {rp.targetIp
                        ? (() => { const t = `${rp.targetIp}${rp.targetPort ? `:${rp.targetPort}` : ''}`; return <div className="flex items-center gap-1.5 group/cell">{t}<span className="opacity-0 group-hover/cell:opacity-100 transition-opacity"><CopyButton value={t} /></span></div> })()
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${rp.ssl ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-muted-foreground bg-muted/40 border-border'}`}>
                        {rp.ssl ? 'HTTPS' : 'HTTP'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      {rp.service ? <Link href={`/services/${rp.service.id}`} className="text-sm hover:text-primary transition-colors">{rp.service.name}</Link> : <span className="text-muted-foreground text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditProxy(rp)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteProxy(rp.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {initialProxies.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No proxy entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add VLAN */}
      <Dialog open={addDialog === 'vlan'} onOpenChange={() => setAddDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add VLAN</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={formData.name ?? ''} onChange={e => f('name', e.target.value)} placeholder="Servers" /></div>
              <div className="space-y-1.5"><Label>VLAN ID *</Label><Input type="number" value={formData.vlanId ?? ''} onChange={e => f('vlanId', e.target.value)} placeholder="10" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Subnet</Label><Input value={formData.subnet ?? ''} onChange={e => f('subnet', e.target.value)} placeholder="192.168.10.0/24" /></div>
              <div className="space-y-1.5"><Label>Gateway</Label><Input value={formData.gateway ?? ''} onChange={e => f('gateway', e.target.value)} placeholder="192.168.10.1" /></div>
            </div>
            <div className="space-y-1.5"><Label>Purpose</Label><Input value={formData.purpose ?? ''} onChange={e => f('purpose', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea className="h-20" value={formData.notes ?? ''} onChange={e => f('notes', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddDialog(null)}>Cancel</Button>
            <Button onClick={createVlan} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit DNS */}
      <Dialog open={addDialog === 'dns' || !!editDns} onOpenChange={() => { setAddDialog(null); setEditDns(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDns ? 'Edit DNS Record' : 'Add DNS Record'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Record name *</Label><Input value={formData.recordName ?? ''} onChange={e => f('recordName', e.target.value)} placeholder="proxmox" /></div>
              <div className="space-y-1.5"><Label>Domain</Label><Input value={formData.domain ?? ''} onChange={e => f('domain', e.target.value)} placeholder="lan" /></div>
            </div>
            <div className="space-y-1.5"><Label>IP Address</Label><Input value={formData.ip ?? ''} onChange={e => f('ip', e.target.value)} placeholder="192.168.10.2" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setAddDialog(null); setEditDns(null) }}>Cancel</Button>
            <Button onClick={() => saveDns(editDns?.id)} disabled={saving}>{saving ? 'Saving…' : editDns ? 'Save' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Proxy */}
      <Dialog open={addDialog === 'proxy' || !!editProxy} onOpenChange={() => { setAddDialog(null); setEditProxy(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editProxy ? 'Edit Proxy Entry' : 'Add Proxy Entry'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label>Host name *</Label><Input value={formData.name ?? ''} onChange={e => f('name', e.target.value)} placeholder="app.home.example.com" /></div>
            <div className="space-y-1.5"><Label>Domain</Label><Input value={formData.domain ?? ''} onChange={e => f('domain', e.target.value)} placeholder="app.home.example.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Target IP</Label><Input value={formData.targetIp ?? ''} onChange={e => f('targetIp', e.target.value)} placeholder="192.168.10.10" /></div>
              <div className="space-y-1.5"><Label>Target Port</Label><Input type="number" value={formData.targetPort ?? ''} onChange={e => f('targetPort', e.target.value)} placeholder="8080" /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea className="h-16" value={formData.notes ?? ''} onChange={e => f('notes', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setAddDialog(null); setEditProxy(null) }}>Cancel</Button>
            <Button onClick={() => saveProxy(editProxy?.id)} disabled={saving}>{saving ? 'Saving…' : editProxy ? 'Save' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
