'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope } from '@/lib/rbac'

async function requireAdmin() {
  const scope = await requireScope()
  if (String(scope.role) !== 'SUPER_ADMIN') throw new Error('FORBIDDEN')
  return scope
}

export async function getUsers() {
  await requireAdmin()
  return prisma.user.findMany({ include: { roles: { include: { role: true } }, scopes: { include: { organizationalUnit: true } } }, orderBy: { name: 'asc' } })
}

export async function assignUserScope(input: { userId: string; role: 'SUPER_ADMIN' | 'PENGELOLA_INSTITUT' | 'PENGELOLA_FAKULTAS' | 'PENGELOLA_JURUSAN' | 'PENGELOLA_PRODI'; organizationalUnitId: string }) {
  await requireAdmin()
  const [user, role, unit] = await Promise.all([prisma.user.findUnique({ where: { id: input.userId } }), prisma.role.findUnique({ where: { name: input.role } }), prisma.organizationalUnit.findUnique({ where: { id: input.organizationalUnitId } })])
  if (!user || !role || !unit) throw new Error('NOT_FOUND')
  await prisma.$transaction([prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} }), prisma.userOrganizationalUnit.upsert({ where: { userId_organizationalUnitId: { userId: user.id, organizationalUnitId: unit.id } }, create: { userId: user.id, organizationalUnitId: unit.id }, update: {} })])
  revalidatePath('/users')
}

export async function removeUserScope(userId: string, organizationalUnitId: string) {
  const scope = await requireAdmin()
  if (userId === scope.userId) throw new Error('Tidak dapat mencabut scope akun sendiri')
  await prisma.userOrganizationalUnit.delete({ where: { userId_organizationalUnitId: { userId, organizationalUnitId } } })
  revalidatePath('/users')
}
