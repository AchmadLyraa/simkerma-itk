'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ancestorOrganizationalUnitIds, requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { safe } from '@/lib/error-message'

export async function getPartnerCategories() {
  await requireScope()
  return prisma.partnerCategory.findMany({ orderBy: { name: 'asc' } })
}

export async function getPartners() {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  const upIds = await ancestorOrganizationalUnitIds(scope)
  return prisma.partner.findMany({
    where: { isActive: true, ...(ids ? { organizationalUnitId: { in: [...ids, ...(upIds ?? [])] } } : {}) },
    include: { category: true, contacts: true, organizationalUnit: { select: { name: true } }, _count: { select: { cooperations: true } } },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function addPartner(input: { name: string; categoryId?: string; category?: string; type?: string; address?: string; website?: string; generalContact?: string; pksContact?: string; contacts?: Array<{ name: string; position?: string; phone?: string; email?: string; isPrimary?: boolean }> }) {
  return safe(async () => {
    const scope = await requireScope()
    if (!scope.organizationalUnitId) throw new Error('Akun Anda belum memiliki unit organisasi')
    if (!input.name?.trim()) throw new Error('Nama mitra wajib diisi')
    const categoryId = input.categoryId ?? input.category
    if (!categoryId) throw new Error('Kategori mitra wajib diisi')
    const partner = await prisma.partner.create({
      data: {
        name: input.name.trim(),
        categoryId,
        organizationalUnitId: scope.organizationalUnitId,
        address: input.address?.trim(),
        website: input.website?.trim(),
        contacts: input.contacts?.length
          ? { create: input.contacts.map((contact) => ({ name: contact.name.trim(), position: contact.position, phone: contact.phone, email: contact.email, isPrimary: contact.isPrimary })) }
          : undefined,
      },
      include: { category: true, contacts: true },
    })
    await writeAuditLog({ userId: scope.userId, action: 'partner.create', entityType: 'Partner', entityId: partner.id, newValue: partner })
    revalidatePath('/')
    return partner
  })
}

export async function updatePartner(id: string, input: { name?: string; categoryId?: string; address?: string; website?: string; isActive?: boolean }) {
  return safe(async () => {
    const scope = await requireScope()
    const ids = await scopedOrganizationalUnitIds(scope)
    const existing = await prisma.partner.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
    if (!existing) throw new Error('NOT_FOUND')
    const partner = await prisma.partner.update({
      where: { id },
      data: {
        name: input.name?.trim() || undefined,
        categoryId: input.categoryId || undefined,
        address: input.address,
        website: input.website,
        isActive: input.isActive,
      },
    })
    await writeAuditLog({ userId: scope.userId, action: 'partner.update', entityType: 'Partner', entityId: id, oldValue: existing, newValue: partner })
    revalidatePath('/')
    return partner
  })
}

export async function removePartner(id: string) {
  return safe(async () => {
    const scope = await requireScope()
    const ids = await scopedOrganizationalUnitIds(scope)
    const existing = await prisma.partner.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
    if (!existing) throw new Error('NOT_FOUND')
    const partner = await prisma.partner.update({ where: { id }, data: { isActive: false } })
    await writeAuditLog({ userId: scope.userId, action: 'partner.deactivate', entityType: 'Partner', entityId: id, oldValue: { isActive: existing.isActive }, newValue: { isActive: false } })
    revalidatePath('/')
    return partner
  })
}
