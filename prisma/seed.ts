import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'homestack', 12)
  await prisma.user.upsert({
    where:  { email: process.env.ADMIN_EMAIL ?? 'admin@homestack.local' },
    update: {},
    create: {
      email:    process.env.ADMIN_EMAIL    ?? 'admin@homestack.local',
      password: hashedPassword,
      name:     'Admin',
    },
  })
  console.log(`✅ Admin user ready: ${process.env.ADMIN_EMAIL ?? 'admin@homestack.local'}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
