'use server'

import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'

export async function getAuditLogs() {
  const scope = await requireScope()
  const organizationalUnitIds = await scopedOrganizationalUnitIds(scope)

  return prisma.auditLog.findMany({
    where: organizationalUnitIds
      ? { user: { scopes: { some: { organizationalUnitId: { in: organizationalUnitIds } } } } }
      : undefined,
    orderBy: { timestamp: 'desc' },
    take: 200,
    select: {
      id: true,
      timestamp: true,
      action: true,
      entityType: true,
      entityId: true,
      user: { select: { name: true, email: true } },
      oldValue: true,
      newValue: true,
    },
  })
}
