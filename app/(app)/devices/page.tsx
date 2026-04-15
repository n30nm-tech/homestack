import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { DevicesClient } from './devices-client'

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
          <DevicesClient devices={devices as any} />
        )}
      </div>
    </div>
  )
}
