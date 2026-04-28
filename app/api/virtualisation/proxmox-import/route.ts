import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { VirtualHostType, Status } from '@prisma/client'

function proxmoxStatusToApp(s: string): Status {
  if (s === 'running') return 'ACTIVE'
  if (s === 'stopped') return 'OFFLINE'
  return 'UNKNOWN'
}

interface ScanLxc {
  ctid: string
  name: string
  status: string
  cpu?: number | null
  ram?: number | null
  ip?: string | null
  hasDocker?: boolean
}

interface ScanVm {
  vmid: string
  name: string
  status: string
  cpu?: number | null
  ram?: number | null
  disk?: number | null
  ip?: string | null
}

interface ScanNode {
  name: string
  ip?: string | null
  version?: string | null
  cpu?: number | null
  ram?: number | null
  vms: ScanVm[]
  lxcs: ScanLxc[]
}

interface ScanPayload {
  version: number
  nodes: ScanNode[]
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ScanPayload = await req.json()
  if (!body?.nodes?.length) return NextResponse.json({ error: 'No nodes in payload' }, { status: 400 })

  const summary = { hosts: 0, vms: 0, services: 0, skipped: 0 }

  for (const node of body.nodes) {
    // Upsert VirtualHost by name
    let host = await prisma.virtualHost.findFirst({ where: { name: node.name, archived: false } })
    if (!host) {
      host = await prisma.virtualHost.create({
        data: {
          name: node.name,
          type: VirtualHostType.PROXMOX,
          ip: node.ip ?? null,
          version: node.version ?? null,
          cpu: node.cpu ?? null,
          ram: node.ram ?? null,
          status: 'ACTIVE',
        },
      })
      await createAuditLog('CREATE', 'VirtualHost', host.id, host.name, { virtualHostId: host.id })
      summary.hosts++
    } else {
      // Update fields that may have changed
      await prisma.virtualHost.update({
        where: { id: host.id },
        data: {
          ip: node.ip ?? host.ip,
          version: node.version ?? host.version,
          cpu: node.cpu ?? host.cpu,
          ram: node.ram ?? host.ram,
        },
      })
      summary.skipped++
    }

    // VMs
    for (const vm of node.vms) {
      const existing = await prisma.vM.findFirst({
        where: { vmid: vm.vmid, hostId: host.id, archived: false },
      })
      if (!existing) {
        const created = await prisma.vM.create({
          data: {
            name: vm.name,
            vmid: vm.vmid,
            hostId: host.id,
            status: proxmoxStatusToApp(vm.status),
            cpu: vm.cpu ?? null,
            ram: vm.ram ?? null,
            disk: vm.disk ?? null,
            ip: vm.ip ?? null,
          },
        })
        await createAuditLog('CREATE', 'VM', created.id, created.name, { vmId: created.id })
        summary.vms++
      } else {
        await prisma.vM.update({
          where: { id: existing.id },
          data: {
            status: proxmoxStatusToApp(vm.status),
            ip: vm.ip ?? existing.ip,
          },
        })
        summary.skipped++
      }
    }

    // LXCs → Services
    for (const lxc of node.lxcs) {
      const existing = await prisma.service.findFirst({
        where: { containerId: lxc.ctid, virtualHostId: host.id, archived: false },
      })
      if (!existing) {
        const created = await prisma.service.create({
          data: {
            name: lxc.name,
            containerId: lxc.ctid,
            virtualHostId: host.id,
            status: proxmoxStatusToApp(lxc.status),
            ip: lxc.ip ?? null,
            hasDocker: lxc.hasDocker ?? false,
          },
        })
        await createAuditLog('CREATE', 'Service', created.id, created.name, { serviceId: created.id })
        summary.services++
      } else {
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            status: proxmoxStatusToApp(lxc.status),
            ip: lxc.ip ?? existing.ip,
          },
        })
        summary.skipped++
      }
    }
  }

  return NextResponse.json({ ok: true, summary })
}
