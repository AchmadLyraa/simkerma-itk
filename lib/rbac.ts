import { getCurrentUser } from '@/app/actions/auth'
import { prisma } from '@/lib/prisma'

export async function requireScope() {
  const session = await getCurrentUser()
  if (!session) throw new Error('UNAUTHORIZED')
  return {
    userId: session.id ?? session.email,
    role: session.role,
    organizationalUnitId: session.organizationalUnitId ?? null,
  }
}

export function isAdmin(role: string) {
  return role === 'SUPER_ADMIN'
}

export function canApprove(role: string, status: string) {
  return (role === 'PENGELOLA_JURUSAN' && status === 'SUBMITTED_JURUSAN') ||
    (role === 'PENGELOLA_FAKULTAS' && status === 'SUBMITTED_FAKULTAS') ||
    (role === 'PENGELOLA_INSTITUT' && status === 'SUBMITTED_INSTITUT') ||
    (isAdmin(role) && status.startsWith('SUBMITTED_'))
}

export async function scopedOrganizationalUnitIds(scope: Awaited<ReturnType<typeof requireScope>>) {
  if (isAdmin(scope.role)) return undefined
  if (!scope.organizationalUnitId) return []
  const units = await prisma.organizationalUnit.findMany({
    select: { id: true, parentId: true },
  })
  const ids = new Set<string>([scope.organizationalUnitId])
  let changed = true
  while (changed) {
    changed = false
    for (const unit of units) {
      if (unit.parentId && ids.has(unit.parentId) && !ids.has(unit.id)) {
        ids.add(unit.id)
        changed = true
      }
    }
  }
  return [...ids]
}
