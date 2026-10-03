import { prisma } from '@/lib/prisma'

// JSON round-trip supaya Date dan tipe Prisma lain aman disimpan di kolom Json.
function toJson(value: unknown) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

export async function writeAuditLog(input: {
  userId: string
  action: string
  entityType: string
  entityId: string
  oldValue?: unknown
  newValue?: unknown
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: toJson(input.oldValue),
      newValue: toJson(input.newValue),
      ipAddress: null,
    },
  })
}
