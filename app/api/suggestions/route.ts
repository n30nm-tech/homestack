import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Allowlist of model+field combos that are safe to query
const ALLOWED: Record<string, string[]> = {
  Device:     ['brand', 'model', 'location', 'rackRoom', 'role'],
  Service:    ['category'],
  BackupJob:  ['tool', 'destination', 'schedule', 'retention', 'backupType'],
  VirtualHost:['purpose'],
  LXC:        ['dockerDataPath'],
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const model = searchParams.get('model') ?? ''
  const field = searchParams.get('field') ?? ''

  if (!ALLOWED[model]?.includes(field)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 400 })
  }

  // Use raw query to get distinct non-null values sorted by frequency
  const rows = await (prisma as any)[model.charAt(0).toLowerCase() + model.slice(1)].findMany({
    where:   { [field]: { not: null }, archived: false },
    select:  { [field]: true },
    orderBy: { [field]: 'asc' },
    distinct: [field],
    take: 100,
  })

  const values = rows
    .map((r: Record<string, unknown>) => r[field])
    .filter((v: unknown): v is string => typeof v === 'string' && v.trim() !== '')

  return NextResponse.json(values)
}
