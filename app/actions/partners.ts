'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'

export async function getPartnerCategories() {
  await requireScope()
  return prisma.partnerCategory.findMany({ orderBy: { name: 'asc' } })
}

export async function getPartners() {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  return prisma.partner.findMany({
    where: { isActive: true, ...(ids ? { organizationalUnitId: { in: ids } } : {}) },
    include: { category: true, contacts: true, _count: { select: { cooperations: true } } },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function addPartner(input: { name: string; categoryId?: string; category?: string; type?: string; address?: string; website?: string; generalContact?: string; pksContact?: string; contacts?: Array<{ name: string; position?: string; phone?: string; email?: string; isPrimary?: boolean }> }) {
  const scope = await requireScope()
  if (!scope.organizationalUnitId) throw new Error('Akun Anda belum memiliki unit organisasi')
  if (!input.name?.trim()) throw new Error('Nama mitra wajib diisi')
  const categoryId = input.categoryId ?? input.category
  if (!categoryId) throw new Error('Kategori mitra wajib diisi')
  const partner = await prisma.partner.create({ data: {
    name: input.name.trim(), categoryId, organizationalUnitId: scope.organizationalUnitId, address: input.address?.trim(), website: input.website?.trim(),
    contacts: input.contacts?.length ? { create: input.contacts.map((contact) => ({ ...contact, name: contact.name.trim() })) } : undefined,
  }, include: { category: true, contacts: true } })
  revalidatePath('/')
  return partner
}

export async function updatePartner(id: string, input: { name?: string; categoryId?: string; address?: string; website?: string; isActive?: boolean }) {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  const existing = await prisma.partner.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!existing) throw new Error('NOT_FOUND')
  const partner = await prisma.partner.update({ where: { id }, data: input })
  revalidatePath('/')
  return partner
}

export async function removePartner(id: string) {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  const existing = await prisma.partner.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!existing) throw new Error('NOT_FOUND')
  const partner = await prisma.partner.update({ where: { id }, data: { isActive: false } })
  revalidatePath('/')
  return partner
}
