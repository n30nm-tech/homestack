import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Deleting all demo data...')
  await prisma.$transaction([
    // Dependents first
    prisma.auditLog.deleteMany({}),
    prisma.attachment.deleteMany({}),
    prisma.reverseProxy.deleteMany({}),
    prisma.dNSRecord.deleteMany({}),
    prisma.backupJob.deleteMany({}),
    prisma.documentationPage.deleteMany({}),
    // Services (depend on dockerHost/vm/lxc/device)
    prisma.service.deleteMany({}),
    // Docker hosts (depend on vm/lxc)
    prisma.dockerHost.deleteMany({}),
    // VMs and LXCs (depend on virtualHost)
    prisma.vM.deleteMany({}),
    prisma.lXC.deleteMany({}),
    // Virtual hosts (depend on device)
    prisma.virtualHost.deleteMany({}),
    // Devices, VLANs, Tags
    prisma.vLAN.deleteMany({}),
    prisma.device.deleteMany({}),
    prisma.tag.deleteMany({}),
  ])
  console.log('✅ All data cleared. Admin user preserved.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
