'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope } from '@/lib/rbac'

async function requireAdmin() {
  const scope = await requireScope()
  if (String(scope.role) !== 'SUPER_ADMIN') throw new Error('FORBIDDEN')
  return scope
}

export async function getScopedOrganizationalUnits() {
  const scope = await requireScope()
  const ids = await import('@/lib/rbac').then(({ scopedOrganizationalUnitIds }) => scopedOrganizationalUnitIds(scope))
  return prisma.organizationalUnit.findMany({ where: ids ? { id: { in: ids } } : undefined, orderBy: { name: 'asc' } })
}

export async function getOrganizationalUnits() {
  await requireAdmin()
  return prisma.organizationalUnit.findMany({ include: { parent: true }, orderBy: { name: 'asc' } })
}

export async function createOrganizationalUnit(input: { name: string; type: 'INSTITUTION' | 'FACULTY' | 'DEPARTMENT' | 'STUDY_PROGRAM'; parentId?: string }) {
  await requireAdmin()
  if (!input.name.trim()) throw new Error('Nama unit wajib diisi')
  const row = await prisma.organizationalUnit.create({ data: { name: input.name.trim(), type: input.type, parentId: input.parentId || null } })
  revalidatePath('/organizational-units')
  return row
}

export async function updateOrganizationalUnit(id: string, input: { name?: string; type?: 'INSTITUTION' | 'FACULTY' | 'DEPARTMENT' | 'STUDY_PROGRAM'; parentId?: string | null }) {
  await requireAdmin()
  const existing = await prisma.organizationalUnit.findUnique({ where: { id } })
  if (!existing) throw new Error('NOT_FOUND')
  const newParentId = input.parentId === undefined ? undefined : input.parentId || null
  if (newParentId) {
    if (newParentId === id) throw new Error('Unit tidak boleh menjadi parent dirinya sendiri')
    const all = await prisma.organizationalUnit.findMany({ select: { id: true, parentId: true } })
    const parentOf = new Map(all.map((u) => [u.id, u.parentId]))
    let cursor: string | null | undefined = newParentId
    while (cursor) {
      if (cursor === id) throw new Error('Parent tidak valid: akan membuat siklus hierarki')
      cursor = parentOf.get(cursor)
    }
  }
  const row = await prisma.organizationalUnit.update({
    where: { id },
    data: { name: input.name?.trim() || undefined, type: input.type, parentId: newParentId },
  })
  revalidatePath('/organizational-units')
  return row
}

export async function deleteOrganizationalUnit(id: string) {
  await requireAdmin()
  const existing = await prisma.organizationalUnit.findUnique({ where: { id }, include: { children: true, userScopes: true } })
  if (!existing) throw new Error('NOT_FOUND')
  if (existing.children.length || existing.userScopes.length) throw new Error('UNIT_IN_USE')
  await prisma.organizationalUnit.delete({ where: { id } })
  revalidatePath('/organizational-units')
}
