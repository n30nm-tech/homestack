import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { NetworkPageClient } from './network-client'

export const metadata = { title: 'Network' }

export default async function NetworkPage() {
  const [vlans, dnsRecords, proxies] = await Promise.all([
    prisma.vLAN.findMany({ where: { archived: false }, include: { devices: { select: { id: true, name: true } } }, orderBy: { vlanId: 'asc' } }),
    prisma.dNSRecord.findMany({ where: { archived: false }, include: { service: { select: { id: true, name: true } } }, orderBy: { recordName: 'asc' } }),
    prisma.reverseProxy.findMany({ where: { archived: false }, include: { service: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Network" description={`${vlans.length} VLANs · ${dnsRecords.length} DNS records · ${proxies.length} proxy entries`} />
      <NetworkPageClient vlans={vlans} dnsRecords={dnsRecords} proxies={proxies} />
    </div>
  )
}
