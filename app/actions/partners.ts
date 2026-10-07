'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  ancestorOrganizationalUnitIds,
  requireScope,
  scopedOrganizationalUnitIds,
} from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { safe } from '@/lib/error-message'

export async function getPartnerCategories() {
  await requireScope()
  return prisma.partnerCategory.findMany({ orderBy: { name: 'asc' } })
}

// includeInactive = true dipakai halaman Mitra. Dropdown di form lain memakai default (aktif saja).
export async function getPartners(includeInactive = false) {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  const upIds = await ancestorOrganizationalUnitIds(scope)
  const rows = await prisma.partner.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(ids
        ? { organizationalUnitId: { in: [...ids, ...(upIds ?? [])] } }
        : {}),
    },
    include: {
      category: true,
      contacts: true,
      organizationalUnit: { select: { name: true } },
      _count: { select: { cooperations: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  // canEdit: hanya mitra milik unit user atau unit di bawahnya.
  return rows.map((row) => ({
    ...row,
    canEdit: ids ? ids.includes(row.organizationalUnitId) : true,
  }))
}

export async function addPartner(input: {
  name: string
  categoryId?: string
  category?: string
  address?: string
  website?: string
  contacts?: Array<{
    name: string
    position?: string
    phone?: string
    email?: string
    isPrimary?: boolean
  }>
}) {
  return safe(async () => {
    const scope = await requireScope()
    if (!scope.organizationalUnitId) {
      throw new Error('Akun Anda belum memiliki unit organisasi')
    }
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
          ? {
              create: input.contacts.map((contact) => ({
                name: contact.name.trim(),
                position: contact.position,
                phone: contact.phone,
                email: contact.email,
                isPrimary: contact.isPrimary,
              })),
            }
          : undefined,
      },
      include: { category: true, contacts: true },
    })
    await writeAuditLog({
      userId: scope.userId,
      action: 'partner.create',
      entityType: 'Partner',
      entityId: partner.id,
      newValue: partner,
    })
    revalidatePath('/')
    return partner
  })
}

async function findEditablePartner(id: string) {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  const existing = await prisma.partner.findFirst({
    where: {
      id,
      ...(ids ? { organizationalUnitId: { in: ids } } : {}),
    },
  })
  if (!existing) throw new Error('NOT_FOUND')
  return { scope, existing }
}

export async function updatePartner(
  id: string,
  input: {
    name?: string
    categoryId?: string
    address?: string
    website?: string
  },
) {
  return safe(async () => {
    const { scope, existing } = await findEditablePartner(id)
    const partner = await prisma.partner.update({
      where: { id },
      data: {
        name: input.name?.trim() || undefined,
        categoryId: input.categoryId || undefined,
        address: input.address,
        website: input.website,
      },
    })
    await writeAuditLog({
      userId: scope.userId,
      action: 'partner.update',
      entityType: 'Partner',
      entityId: id,
      oldValue: existing,
      newValue: partner,
    })
    revalidatePath('/')
    return partner
  })
}

export async function setPartnerActive(id: string, isActive: boolean) {
  return safe(async () => {
    const { scope, existing } = await findEditablePartner(id)
    const partner = await prisma.partner.update({
      where: { id },
      data: { isActive },
    })
    await writeAuditLog({
      userId: scope.userId,
      action: isActive ? 'partner.activate' : 'partner.deactivate',
      entityType: 'Partner',
      entityId: id,
      oldValue: { isActive: existing.isActive },
      newValue: { isActive },
    })
    revalidatePath('/')
    return partner
  })
}

// Hapus permanen: hanya jika mitra belum dipakai kerja sama. Kontak ikut terhapus (cascade).
export async function deletePartner(id: string) {
  return safe(async () => {
    const { scope, existing } = await findEditablePartner(id)
    const used = await prisma.cooperation.count({ where: { partnerId: id } })
    if (used > 0) {
      throw new Error('Mitra sudah dipakai kerja sama. Nonaktifkan saja.')
    }
    await prisma.partner.delete({ where: { id } })
    await writeAuditLog({
      userId: scope.userId,
      action: 'partner.delete',
      entityType: 'Partner',
      entityId: id,
      oldValue: { name: existing.name, categoryId: existing.categoryId },
    })
    revalidatePath('/')
  })
}
