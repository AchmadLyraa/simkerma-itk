'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'

async function scopedPartner(partnerId: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const partner = await prisma.partner.findFirst({ where: { id: partnerId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!partner) throw new Error('NOT_FOUND')
  return partner
}

export async function addPartnerContact(partnerId: string, input: { name: string; position?: string; phone?: string; email?: string; isPrimary?: boolean }) {
  await scopedPartner(partnerId)
  if (!input.name.trim()) throw new Error('Nama kontak wajib diisi')
  const row = await prisma.partnerContact.create({ data: { partnerId, ...input, name: input.name.trim() } })
  revalidatePath('/partners')
  return row
}

export async function updatePartnerContact(id: string, input: { name?: string; position?: string; phone?: string; email?: string; isPrimary?: boolean }) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const contact = await prisma.partnerContact.findFirst({ where: { id, partner: ids ? { organizationalUnitId: { in: ids } } : undefined } })
  if (!contact) throw new Error('NOT_FOUND')
  const row = await prisma.partnerContact.update({ where: { id }, data: { ...input, name: input.name?.trim() } })
  revalidatePath('/partners'); return row
}

export async function deletePartnerContact(id: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const contact = await prisma.partnerContact.findFirst({ where: { id, partner: ids ? { organizationalUnitId: { in: ids } } : undefined } })
  if (!contact) throw new Error('NOT_FOUND')
  await prisma.partnerContact.delete({ where: { id } }); revalidatePath('/partners')
}
