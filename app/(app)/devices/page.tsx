import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { TagList } from '@/components/shared/tag-badge'
import { DEVICE_TYPE_LABELS } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'Devices' }

export default async function DevicesPage() {
  const devices = await prisma.device.findMany({
    where: { archived: false },
    include: { tags: true },
    orderBy: [{ favourite: 'desc' }, { name: 'asc' }],
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Devices" description={`${devices.length} physical devices`} />

      <div className="page-container animate-fade-in">
        {devices.length === 0 ? (
          <div className="section-card text-center py-16">
            <p className="text-muted-foreground text-sm">No devices yet. Use Add New to add hardware.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {devices.map(device => (
              <Link key={device.id} href={`/devices/${device.id}`} className="section-card hover:border-border/80 transition-colors space-y-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium group-hover:text-primary transition-colors truncate">{device.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {DEVICE_TYPE_LABELS[device.type]}
                      {device.brand && ` — ${device.brand}`}
                      {device.model && ` ${device.model}`}
                    </p>
                  </div>
                  <StatusBadge status={device.status} className="shrink-0" />
                </div>
                {device.managementIp && (
                  <p className="text-xs font-mono text-muted-foreground">{device.managementIp}</p>
                )}
                {device.location && (
                  <p className="text-xs text-muted-foreground">{device.location}</p>
                )}
                {device.tags.length > 0 && <TagList tags={device.tags} />}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
