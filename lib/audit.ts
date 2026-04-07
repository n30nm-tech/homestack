import { prisma } from '@/lib/prisma'

type AuditTarget =
  | { serviceId: string }
  | { deviceId: string }
  | { vmId: string }
  | { lxcId: string }
  | { dockerHostId: string }
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
