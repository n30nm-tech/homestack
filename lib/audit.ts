import { prisma } from '@/lib/prisma'

const SKIP_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'archived', 'favourite'])

/** Returns { field: { from, to } } for every field that changed. */
export function diffRecords(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of Object.keys(after)) {
    if (SKIP_FIELDS.has(key)) continue
    const a = before[key] ?? null
    const b = after[key] ?? null
    if (String(a) !== String(b)) changes[key] = { from: a, to: b }
  }
  return changes
}

type AuditTarget =
  | { serviceId: string }
  | { deviceId: string }
  | { vmId: string }
  | { virtualHostId: string }
  | { backupJobId: string }
  | { dnsRecordId: string }
  | { reverseProxyId: string }
  | { vlanId: string }
  | { docPageId: string }

export async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  entityName: string,
  target: AuditTarget,
  changes?: Record<string, unknown>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        entityName,
        changes: changes ? (changes as object) : undefined,
        ...target,
      },
    })
  } catch {
    // Audit log failures should never break the main operation
    console.error('Failed to create audit log')
  }
}
