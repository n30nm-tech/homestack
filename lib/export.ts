import { prisma } from '@/lib/prisma'
import { STATUS_LABELS, DEVICE_TYPE_LABELS, VHOST_TYPE_LABELS, formatDateTime, formatMB } from '@/lib/utils'

// ─── Markdown generators ──────────────────────────────────────────────────────

function md(label: string, value: string | null | undefined): string {
  if (!value) return ''
  return `**${label}:** ${value}\n`
}

function mdSection(title: string, content: string): string {
  if (!content.trim()) return ''
  return `\n### ${title}\n\n${content}\n`
}

function mdCode(lang: string, content: string): string {
  return `\`\`\`${lang}\n${content}\n\`\`\`\n`
}

// ─── Full export ──────────────────────────────────────────────────────────────

export async function generateFullMarkdownExport(): Promise<string> {
  const [services, devices, virtualHosts, vms, vlans, dnsRecords, reverseProxies, backupJobs, docPages] =
    await Promise.all([
      prisma.service.findMany({ where: { archived: false }, include: { tags: true, device: true, virtualHost: true, vm: true, reverseProxies: true, backupJobs: true }, orderBy: { name: 'asc' } }),
      prisma.device.findMany({ where: { archived: false }, include: { tags: true }, orderBy: { name: 'asc' } }),
      prisma.virtualHost.findMany({ where: { archived: false }, include: { tags: true, device: true, vms: true, services: { where: { archived: false }, select: { name: true, ctid: true } } }, orderBy: { name: 'asc' } }),
      prisma.vM.findMany({ where: { archived: false }, include: { tags: true, host: true }, orderBy: { name: 'asc' } }),
      prisma.vLAN.findMany({ where: { archived: false }, orderBy: { vlanId: 'asc' } }),
      prisma.dNSRecord.findMany({ where: { archived: false }, include: { service: true }, orderBy: { recordName: 'asc' } }),
      prisma.reverseProxy.findMany({ where: { archived: false }, include: { service: true }, orderBy: { name: 'asc' } }),
      prisma.backupJob.findMany({ where: { archived: false }, include: { service: true, device: true, vm: true, virtualHost: true }, orderBy: { name: 'asc' } }),
      prisma.documentationPage.findMany({ where: { archived: false }, orderBy: { title: 'asc' } }),
    ])

  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const lines: string[] = []

  lines.push(`# HomeStack — Homelab Documentation\n`)
  lines.push(`*Exported on ${now}*\n`)
  lines.push(`---\n`)

  lines.push(`## Contents\n`)
  lines.push(`1. [Services](#services)`)
  lines.push(`2. [Devices](#devices)`)
  lines.push(`3. [Virtualisation](#virtualisation)`)
  lines.push(`4. [Network](#network)`)
  lines.push(`5. [Backups](#backups)`)
  lines.push(`6. [Documentation](#documentation)\n`)
  lines.push(`---\n`)

  // ── Services ──
  lines.push(`## Services\n`)
  for (const s of services) {
    lines.push(`### ${s.name}\n`)
    if (s.description) lines.push(`${s.description}\n`)
    lines.push(md('Status', STATUS_LABELS[s.status]))
    if (s.url) lines.push(md('URL', s.url))
    if (s.ip || s.port) lines.push(md('Endpoint', `${s.ip ?? ''}${s.port ? `:${s.port}` : ''}`))
    if (s.category) lines.push(md('Category', s.category))
    if (s.ctid) lines.push(md('Container ID', `CT${s.ctid}`))
    if (s.hasDocker) lines.push(md('Runtime', 'Docker'))

    if (s.vm) lines.push(md('Hosted on', `VM: ${s.vm.name}`))
    else if (s.virtualHost) lines.push(md('Hosted on', s.virtualHost.name))
    else if (s.device) lines.push(md('Hosted on', s.device.name))

    if (s.reverseProxies.length > 0) lines.push(md('Published via', s.reverseProxies.map(rp => rp.name).join(', ')))
    if (s.backupJobs.length > 0) lines.push(md('Backed up by', s.backupJobs.map(b => b.name).join(', ')))
    if (s.tags.length > 0) lines.push(md('Tags', s.tags.map(t => t.name).join(', ')))

    if (s.dockerCompose) lines.push(mdSection('Docker Compose', mdCode('yaml', s.dockerCompose)))
    if (s.envVars) lines.push(mdSection('Environment Variables', mdCode('env', s.envVars)))
    if (s.setupSteps) lines.push(mdSection('Setup Steps', s.setupSteps))
    if (s.runCommands) lines.push(mdSection('Commands', mdCode('bash', s.runCommands)))
    if (s.reverseProxyConfig) lines.push(mdSection('Reverse Proxy Config', mdCode('nginx', s.reverseProxyConfig)))
    if (s.notes) lines.push(mdSection('Notes', s.notes))

    lines.push('---\n')
  }

  // ── Devices ──
  lines.push(`## Devices\n`)
  for (const d of devices) {
    lines.push(`### ${d.name}\n`)
    lines.push(md('Type', DEVICE_TYPE_LABELS[d.type]))
    lines.push(md('Status', STATUS_LABELS[d.status]))
    if (d.brand || d.model) lines.push(md('Hardware', [d.brand, d.model].filter(Boolean).join(' ')))
    if (d.hostname) lines.push(md('Hostname', d.hostname))
    if (d.managementIp) lines.push(md('Management IP', d.managementIp))
    if (d.mainIp) lines.push(md('Main IP', d.mainIp))
    if (d.location) lines.push(md('Location', d.location))
    if (d.role) lines.push(md('Role', d.role))
    if (d.os) lines.push(md('OS / Firmware', d.os))
    if (d.notes) lines.push(mdSection('Notes', d.notes))
    lines.push('---\n')
  }

  // ── Virtualisation ──
  lines.push(`## Virtualisation\n`)

  lines.push(`### Hosts\n`)
  for (const h of virtualHosts) {
    lines.push(`#### ${h.name} (${VHOST_TYPE_LABELS[h.type]})\n`)
    lines.push(md('Status', STATUS_LABELS[h.status]))
    if (h.ip) lines.push(md('IP', h.ip))
    if (h.os) lines.push(md('OS', h.os))
    if (h.device) lines.push(md('Physical host', h.device.name))
    lines.push(md('VMs', h.vms.map(v => v.name).join(', ') || 'None'))
    lines.push(md('Services', h.services.map(s => s.ctid ? `${s.name} (CT${s.ctid})` : s.name).join(', ') || 'None'))
    if (h.notes) lines.push(mdSection('Notes', h.notes))
    lines.push('\n')
  }

  lines.push(`### Virtual Machines\n`)
  for (const v of vms) {
    lines.push(`#### ${v.name}\n`)
    lines.push(md('Status', STATUS_LABELS[v.status]))
    lines.push(md('Runs on', `Host: ${v.host.name}`))
    if (v.vmid) lines.push(md('VM ID', v.vmid))
    if (v.ip) lines.push(md('IP', v.ip))
    if (v.os) lines.push(md('OS', v.os))
    if (v.cpu) lines.push(md('vCPUs', String(v.cpu)))
    if (v.ram) lines.push(md('RAM', formatMB(v.ram)))
    if (v.notes) lines.push(mdSection('Notes', v.notes))
    lines.push('\n')
  }

  // ── Network ──
  lines.push(`## Network\n`)

  lines.push(`### VLANs\n`)
  for (const v of vlans) {
    lines.push(`#### VLAN ${v.vlanId} — ${v.name}\n`)
    if (v.subnet) lines.push(md('Subnet', v.subnet))
    if (v.gateway) lines.push(md('Gateway', v.gateway))
    if (v.purpose) lines.push(md('Purpose', v.purpose))
    lines.push(md('Internet access', v.internetAccess ? 'Yes' : 'No'))
    if (v.notes) lines.push(mdSection('Notes', v.notes))
    lines.push('\n')
  }

  lines.push(`### DNS Records\n`)
  lines.push(`| Record | Domain | IP | Linked Service |\n|--------|--------|-----|----------------|\n`)
  for (const r of dnsRecords) {
    lines.push(`| ${r.recordName} | ${r.domain ?? '—'} | ${r.ip ?? '—'} | ${r.service?.name ?? '—'} |\n`)
  }
  lines.push('\n')

  lines.push(`### Reverse Proxy\n`)
  for (const rp of reverseProxies) {
    lines.push(`#### ${rp.name}\n`)
    if (rp.domain) lines.push(md('Domain', rp.domain))
    if (rp.service) lines.push(md('Target service', rp.service.name))
    if (rp.targetIp) lines.push(md('Target', `${rp.targetIp}${rp.targetPort ? `:${rp.targetPort}` : ''}`))
    lines.push(md('SSL', rp.ssl ? 'Yes' : 'No'))
    lines.push('\n')
  }

  // ── Backups ──
  lines.push(`## Backups\n`)
  for (const b of backupJobs) {
    lines.push(`### ${b.name}\n`)
    if (b.description) lines.push(`${b.description}\n`)
    const source = b.service?.name ?? b.device?.name ?? b.vm?.name ?? b.virtualHost?.name
    if (source) lines.push(md('Backs up', source))
    if (b.destination) lines.push(md('Destination', b.destination))
    if (b.backupType) lines.push(md('Type', b.backupType))
    if (b.schedule) lines.push(md('Schedule', b.schedule))
    if (b.retention) lines.push(md('Retention', b.retention))
    if (b.lastRun) lines.push(md('Last run', formatDateTime(b.lastRun)))
    if (b.tool) lines.push(md('Tool', b.tool))
    if (b.notes) lines.push(mdSection('Notes', b.notes))
    lines.push('---\n')
  }

  // ── Documentation ──
  lines.push(`## Documentation\n`)
  for (const d of docPages) {
    lines.push(`### ${d.title}\n`)
    if (d.content) lines.push(`${d.content}\n`)
    if (d.setupNotes) lines.push(mdSection('Setup Notes', d.setupNotes))
    if (d.troubleshootingNotes) lines.push(mdSection('Troubleshooting', d.troubleshootingNotes))
    if (d.extraInfo) lines.push(mdSection('Extra Info', d.extraInfo))
    lines.push('---\n')
  }

  lines.push(`\n*Generated by HomeStack on ${now}*\n`)

  return lines.join('\n')
}

// ─── Service page export ──────────────────────────────────────────────────────

export async function generateServiceMarkdown(id: string): Promise<string> {
  const s = await prisma.service.findUnique({
    where: { id },
    include: { tags: true, device: true, virtualHost: true, vm: true, reverseProxies: true, backupJobs: true, dnsRecords: true },
  })
  if (!s) return '# Not Found\n'

  const lines: string[] = []
  lines.push(`# ${s.name}\n`)
  if (s.description) lines.push(`${s.description}\n`)
  lines.push(md('Status', STATUS_LABELS[s.status]))
  if (s.url) lines.push(md('URL', s.url))
  if (s.ip || s.port) lines.push(md('Endpoint', `${s.ip ?? ''}${s.port ? `:${s.port}` : ''}`))
  if (s.category) lines.push(md('Category', s.category))
  if (s.ctid) lines.push(md('Container ID', `CT${s.ctid}`))
  if (s.hasDocker) lines.push(md('Runtime', 'Docker'))
  if (s.vm) lines.push(md('VM', s.vm.name))
  if (s.virtualHost) lines.push(md('Host', s.virtualHost.name))
  if (s.device) lines.push(md('Device', s.device.name))
  if (s.reverseProxies.length > 0) lines.push(md('Reverse proxy', s.reverseProxies.map(r => r.name).join(', ')))
  if (s.backupJobs.length > 0) lines.push(md('Backup jobs', s.backupJobs.map(b => b.name).join(', ')))
  if (s.tags.length > 0) lines.push(md('Tags', s.tags.map(t => t.name).join(', ')))

  if (s.dockerCompose) lines.push(mdSection('Docker Compose', mdCode('yaml', s.dockerCompose)))
  if (s.envVars) lines.push(mdSection('Environment Variables', mdCode('env', s.envVars)))
  if (s.setupSteps) lines.push(mdSection('Setup Steps', s.setupSteps))
  if (s.runCommands) lines.push(mdSection('Commands', mdCode('bash', s.runCommands)))
  if (s.reverseProxyConfig) lines.push(mdSection('Reverse Proxy Config', mdCode('nginx', s.reverseProxyConfig)))
  if (s.notes) lines.push(mdSection('Notes', s.notes))
  if (s.setupNotes) lines.push(mdSection('Setup Notes', s.setupNotes))
  if (s.troubleshootingNotes) lines.push(mdSection('Troubleshooting', s.troubleshootingNotes))
  if (s.extraInfo) lines.push(mdSection('Extra Info', s.extraInfo))

  return lines.join('\n')
}
