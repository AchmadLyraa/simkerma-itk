'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'

async function scopedPartner(partnerId: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const partner = await prisma.partner.findFirst({ where: { id: partnerId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!partner) throw new Error('NOT_FOUND')
  return { partner, scope }
}

export async function addPartnerContact(partnerId: string, input: { name: string; position?: string; phone?: string; email?: string; isPrimary?: boolean }) {
  const { scope } = await scopedPartner(partnerId)
  if (!input.name.trim()) throw new Error('Nama kontak wajib diisi')
  const row = await prisma.partnerContact.create({ data: { partnerId, name: input.name.trim(), position: input.position, phone: input.phone, email: input.email, isPrimary: input.isPrimary } })
  await writeAuditLog({ userId: scope.userId, action: 'partner_contact.create', entityType: 'PartnerContact', entityId: row.id, newValue: row })
  revalidatePath('/partners')
  return row
}

export async function updatePartnerContact(id: string, input: { name?: string; position?: string; phone?: string; email?: string; isPrimary?: boolean }) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const contact = await prisma.partnerContact.findFirst({ where: { id, partner: ids ? { organizationalUnitId: { in: ids } } : undefined } })
  if (!contact) throw new Error('NOT_FOUND')
  const row = await prisma.partnerContact.update({ where: { id }, data: { name: input.name?.trim() || undefined, position: input.position, phone: input.phone, email: input.email, isPrimary: input.isPrimary } })
  await writeAuditLog({ userId: scope.userId, action: 'partner_contact.update', entityType: 'PartnerContact', entityId: id, oldValue: contact, newValue: row })
  revalidatePath('/partners'); return row
}

export async function deletePartnerContact(id: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const contact = await prisma.partnerContact.findFirst({ where: { id, partner: ids ? { organizationalUnitId: { in: ids } } : undefined } })
  if (!contact) throw new Error('NOT_FOUND')
  await prisma.partnerContact.delete({ where: { id } });
  await writeAuditLog({ userId: scope.userId, action: 'partner_contact.delete', entityType: 'PartnerContact', entityId: id, oldValue: contact })
  revalidatePath('/partners')
}
