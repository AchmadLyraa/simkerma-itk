'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { safe } from '@/lib/error-message'

type UnitType = 'INSTITUTION' | 'FACULTY' | 'DEPARTMENT' | 'STUDY_PROGRAM'

const parentTypeOf: Record<UnitType, UnitType | null> = {
  INSTITUTION: null,
  FACULTY: 'INSTITUTION',
  DEPARTMENT: 'FACULTY',
  STUDY_PROGRAM: 'DEPARTMENT',
}

async function assertValidParent(type: UnitType, parentId: string | null) {
  const expected = parentTypeOf[type]
  if (!expected) {
    if (parentId) throw new Error('Institusi tidak boleh memiliki parent')
    return
  }
  if (!parentId) throw new Error(`Unit bertipe ${type} wajib memiliki parent bertipe ${expected}`)
  const parent = await prisma.organizationalUnit.findUnique({ where: { id: parentId }, select: { type: true } })
  if (!parent) throw new Error('NOT_FOUND')
  if (parent.type !== expected) throw new Error(`Parent unit ${type} harus bertipe ${expected}`)
}

async function requireAdmin() {
  const scope = await requireScope()
  if (String(scope.role) !== 'SUPER_ADMIN') throw new Error('FORBIDDEN')
  return scope
}

export async function getScopedOrganizationalUnits() {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  return prisma.organizationalUnit.findMany({ where: ids ? { id: { in: ids } } : undefined, orderBy: { name: 'asc' } })
}

export async function getOrganizationalUnits() {
  await requireAdmin()
  return prisma.organizationalUnit.findMany({ include: { parent: true }, orderBy: { name: 'asc' } })
}

export async function createOrganizationalUnit(input: { name: string; type: UnitType; parentId?: string }) {
  return safe(async () => {
    const scope = await requireAdmin()
    if (!input.name?.trim()) throw new Error('Nama unit wajib diisi')
    await assertValidParent(input.type, input.parentId || null)
    const row = await prisma.organizationalUnit.create({ data: { name: input.name.trim(), type: input.type, parentId: input.parentId || null } })
    await writeAuditLog({ userId: scope.userId, action: 'org_unit.create', entityType: 'OrganizationalUnit', entityId: row.id, newValue: row })
    revalidatePath('/organizational-units')
    return row
  })
}

export async function updateOrganizationalUnit(id: string, input: { name?: string; type?: UnitType; parentId?: string | null }) {
  return safe(async () => {
    const scope = await requireAdmin()
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
    const finalType = input.type ?? existing.type
    const finalParent = newParentId === undefined ? existing.parentId : newParentId
    await assertValidParent(finalType, finalParent)
    if (finalType !== existing.type) {
      const children = await prisma.organizationalUnit.findMany({ where: { parentId: id }, select: { type: true } })
      if (children.some((c) => parentTypeOf[c.type] !== finalType)) throw new Error('Tipe tidak dapat diubah: unit anak tidak akan sesuai hierarki')
    }
    const row = await prisma.organizationalUnit.update({
      where: { id },
      data: { name: input.name?.trim() || undefined, type: input.type, parentId: newParentId },
    })
    await writeAuditLog({ userId: scope.userId, action: 'org_unit.update', entityType: 'OrganizationalUnit', entityId: id, oldValue: { name: existing.name, type: existing.type, parentId: existing.parentId }, newValue: row })
    revalidatePath('/organizational-units')
    return row
  })
}

export async function deleteOrganizationalUnit(id: string) {
  return safe(async () => {
    const scope = await requireAdmin()
    const existing = await prisma.organizationalUnit.findUnique({ where: { id }, include: { children: true, userScopes: true } })
    if (!existing) throw new Error('NOT_FOUND')
    if (existing.children.length || existing.userScopes.length) throw new Error('UNIT_IN_USE')
    await prisma.organizationalUnit.delete({ where: { id } })
    await writeAuditLog({ userId: scope.userId, action: 'org_unit.delete', entityType: 'OrganizationalUnit', entityId: id, oldValue: { name: existing.name, type: existing.type, parentId: existing.parentId } })
    revalidatePath('/organizational-units')
  })
}
