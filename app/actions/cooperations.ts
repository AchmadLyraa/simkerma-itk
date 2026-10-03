'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { canApprove, requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'

const transition: Record<string, string> = { DRAFT: 'SUBMITTED_JURUSAN', SUBMITTED_JURUSAN: 'SUBMITTED_FAKULTAS', SUBMITTED_FAKULTAS: 'SUBMITTED_INSTITUT', SUBMITTED_INSTITUT: 'APPROVED' }

export async function getCooperationRegions() {
  await requireScope()
  return prisma.cooperationRegion.findMany({ orderBy: { name: 'asc' } })
}

export async function getTridharmaCategories() {
  await requireScope()
  return prisma.tridharmaCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
}

export async function getCooperationById(id: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const row = await prisma.cooperation.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, include: { partner: true, region: true, studyPrograms: { include: { organizationalUnit: true } }, tridharmaCategories: { include: { tridharmaCategory: true } }, documents: true, activities: true, approvals: { include: { approvedBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } } })
  if (!row) throw new Error('NOT_FOUND')
  return row
}

export async function getPendingApprovals() {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const role = String(scope.role)
  const statuses = role === 'PENGELOLA_JURUSAN' ? ['SUBMITTED_JURUSAN'] : role === 'PENGELOLA_FAKULTAS' ? ['SUBMITTED_FAKULTAS'] : role === 'PENGELOLA_INSTITUT' ? ['SUBMITTED_INSTITUT'] : ['SUBMITTED_JURUSAN', 'SUBMITTED_FAKULTAS', 'SUBMITTED_INSTITUT']
  return prisma.cooperation.findMany({ where: { status: { in: statuses as never[] }, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, include: { partner: true, createdBy: true }, orderBy: { updatedAt: 'asc' } })
}

export async function getCooperations() {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  return prisma.cooperation.findMany({ where: ids ? { organizationalUnitId: { in: ids } } : undefined, include: { partner: true, region: true, studyPrograms: true, tridharmaCategories: true, approvals: true }, orderBy: { updatedAt: 'desc' } })
}

export async function createCooperation(input: { partnerId: string; name: string; organizationalUnitId: string; cpDiPks?: string; benefit?: string; notes?: string; startDate?: Date; endDate?: Date; regionId?: string; studyProgramIds?: string[]; tridharmaCategoryIds?: string[] }) {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  if (ids && !ids.includes(input.organizationalUnitId)) throw new Error('FORBIDDEN_SCOPE')
  const partner = await prisma.partner.findFirst({ where: { id: input.partnerId, isActive: true, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { id: true } })
  if (!partner) throw new Error('NOT_FOUND')
  if (!input.name?.trim()) throw new Error('Nama kerja sama wajib diisi')
  const programIds = [...new Set(input.studyProgramIds ?? [])]
  if (programIds.length) {
    const allowed = ids ? programIds.filter((p) => ids.includes(p)) : programIds
    const found = await prisma.organizationalUnit.count({ where: { id: { in: allowed }, type: 'STUDY_PROGRAM' } })
    if (found !== programIds.length) throw new Error('FORBIDDEN_SCOPE')
  }
  const tridharmaIds = [...new Set(input.tridharmaCategoryIds ?? [])]
  if (tridharmaIds.length) {
    const found = await prisma.tridharmaCategory.count({ where: { id: { in: tridharmaIds }, active: true } })
    if (found !== tridharmaIds.length) throw new Error('NOT_FOUND')
  }
  const row = await prisma.cooperation.create({
    data: {
      partnerId: input.partnerId,
      organizationalUnitId: input.organizationalUnitId,
      name: input.name.trim(),
      cpDiPks: input.cpDiPks || undefined,
      benefit: input.benefit || undefined,
      notes: input.notes || undefined,
      regionId: input.regionId || undefined,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      status: 'DRAFT',
      studyPrograms: programIds.length ? { create: programIds.map((organizationalUnitId) => ({ organizationalUnitId })) } : undefined,
      tridharmaCategories: tridharmaIds.length ? { create: tridharmaIds.map((tridharmaCategoryId) => ({ tridharmaCategoryId })) } : undefined,
      createdById: scope.userId,
    },
  })
  await writeAuditLog({ userId: scope.userId, action: 'cooperation.create', entityType: 'Cooperation', entityId: row.id, newValue: row })
  revalidatePath('/')
  return row
}

export async function updateCooperation(id: string, input: Partial<Parameters<typeof createCooperation>[0]>) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const existing = await prisma.cooperation.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!existing) throw new Error('NOT_FOUND')
  if (existing.status !== 'DRAFT' && !['SUPER_ADMIN'].includes(scope.role as string)) throw new Error('LOCKED_STATUS')
  const row = await prisma.cooperation.update({
    where: { id },
    data: {
      name: input.name?.trim() || undefined,
      cpDiPks: input.cpDiPks,
      benefit: input.benefit,
      notes: input.notes,
      regionId: input.regionId || undefined,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    },
  })
  await writeAuditLog({ userId: scope.userId, action: 'cooperation.update', entityType: 'Cooperation', entityId: id, oldValue: existing, newValue: row })
  return row
}

export async function submitForApproval(id: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const existing = await prisma.cooperation.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!existing) throw new Error('NOT_FOUND')
  if (existing.createdById !== scope.userId && (scope.role as string) !== 'SUPER_ADMIN') throw new Error('FORBIDDEN')
  if (existing.status !== 'DRAFT') throw new Error('INVALID_TRANSITION')
  const status = transition[existing.status]
  const row = await prisma.cooperation.update({ where: { id }, data: { status: status as never } })
  await writeAuditLog({ userId: scope.userId, action: 'cooperation.submit', entityType: 'Cooperation', entityId: id, oldValue: { status: existing.status }, newValue: { status: row.status } })
  revalidatePath('/'); return row
}

export async function approveCooperation(id: string, note?: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const existing = await prisma.cooperation.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!existing || !canApprove(scope.role, existing.status)) throw new Error('FORBIDDEN')
  const next = transition[existing.status] ?? 'APPROVED'
  const row = await prisma.$transaction([prisma.cooperation.update({ where: { id }, data: { status: next as never } }), prisma.cooperationApproval.create({ data: { cooperationId: id, organizationalUnitId: scope.organizationalUnitId ?? existing.organizationalUnitId, approvedById: scope.userId, action: 'approved', note } })])
  await writeAuditLog({ userId: scope.userId, action: 'cooperation.approve', entityType: 'Cooperation', entityId: id, oldValue: { status: existing.status }, newValue: { status: row[0].status, note } })
  revalidatePath('/'); return row[0]
}

export async function rejectCooperation(id: string, note: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const existing = await prisma.cooperation.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!existing || !canApprove(scope.role, existing.status)) throw new Error('FORBIDDEN')
  const row = await prisma.$transaction([prisma.cooperation.update({ where: { id }, data: { status: 'REJECTED' } }), prisma.cooperationApproval.create({ data: { cooperationId: id, organizationalUnitId: scope.organizationalUnitId ?? existing.organizationalUnitId, approvedById: scope.userId, action: 'rejected', note } })])
  await writeAuditLog({ userId: scope.userId, action: 'cooperation.reject', entityType: 'Cooperation', entityId: id, oldValue: { status: existing.status }, newValue: { status: 'REJECTED', note } })
  revalidatePath('/'); return row[0]
}
