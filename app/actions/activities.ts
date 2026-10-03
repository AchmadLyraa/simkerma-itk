'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'

export async function getActivitiesByCooperation(cooperationId: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const cooperation = await prisma.cooperation.findFirst({ where: { id: cooperationId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { id: true } })
  if (!cooperation) throw new Error('NOT_FOUND')
  return prisma.cooperationActivity.findMany({ where: { cooperationId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, include: { participants: true, documents: true }, orderBy: { startDate: 'desc' } })
}

export async function getActivityParticipants(activityId: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const activity = await prisma.cooperationActivity.findFirst({ where: { id: activityId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { id: true } })
  if (!activity) throw new Error('NOT_FOUND')
  return prisma.activityParticipant.findMany({ where: { activityId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, include: { organizationalUnit: { select: { name: true } } }, orderBy: { createdAt: 'desc' } })
}

export async function getActivities() {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  return prisma.cooperationActivity.findMany({ where: ids ? { organizationalUnitId: { in: ids } } : undefined, include: { cooperation: { include: { partner: true } }, participants: true, documents: true }, orderBy: { startDate: 'desc' } })
}
export async function createActivity(input: { cooperationId: string; activityType: string; activityName: string; organizationalUnitId: string; startDate?: Date; endDate?: Date; implementationPeriod?: string; description?: string; notes?: string }) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  if (ids && !ids.includes(input.organizationalUnitId)) throw new Error('FORBIDDEN_SCOPE')
  const cooperation = await prisma.cooperation.findFirst({ where: { id: input.cooperationId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { id: true } })
  if (!cooperation) throw new Error('NOT_FOUND')
  if (!input.activityName?.trim() || !input.activityType?.trim()) throw new Error('Jenis dan nama kegiatan wajib diisi')
  const row = await prisma.cooperationActivity.create({
    data: {
      cooperationId: input.cooperationId,
      organizationalUnitId: input.organizationalUnitId,
      activityType: input.activityType.trim(),
      activityName: input.activityName.trim(),
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      implementationPeriod: input.implementationPeriod || undefined,
      description: input.description || undefined,
      notes: input.notes || undefined,
    },
  })
  await writeAuditLog({ userId: scope.userId, action: 'activity.create', entityType: 'CooperationActivity', entityId: row.id, newValue: row })
  revalidatePath('/'); return row
}
export async function updateActivity(id: string, input: Partial<Parameters<typeof createActivity>[0]> & { status?: 'ONGOING' | 'COMPLETED' | 'CANCELLED' }) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const existing = await prisma.cooperationActivity.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!existing) throw new Error('NOT_FOUND')
  const row = await prisma.cooperationActivity.update({
    where: { id },
    data: {
      activityType: input.activityType?.trim() || undefined,
      activityName: input.activityName?.trim() || undefined,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      implementationPeriod: input.implementationPeriod,
      description: input.description,
      notes: input.notes,
      status: input.status,
    },
  })
  await writeAuditLog({ userId: scope.userId, action: 'activity.update', entityType: 'CooperationActivity', entityId: id, oldValue: existing, newValue: row })
  return row
}
export async function addParticipant(input: { activityId: string; name: string; identityNumber: string; identityType: 'NIM' | 'NIP' | 'NIPH'; organizationalUnitId: string; participantType?: string; notes?: string }) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const activity = await prisma.cooperationActivity.findFirst({ where: { id: input.activityId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!activity || (ids && !ids.includes(input.organizationalUnitId))) throw new Error('FORBIDDEN_SCOPE')
  if (!input.name?.trim() || !input.identityNumber?.trim()) throw new Error('Nama dan nomor identitas wajib diisi')
  const participant = await prisma.activityParticipant.create({
    data: {
      activityId: input.activityId,
      organizationalUnitId: input.organizationalUnitId,
      name: input.name.trim(),
      identityNumber: input.identityNumber.trim(),
      identityType: input.identityType,
      participantType: input.participantType,
      notes: input.notes,
    },
  })
  await writeAuditLog({ userId: scope.userId, action: 'participant.add', entityType: 'ActivityParticipant', entityId: participant.id, newValue: participant })
  return participant
}
export async function removeParticipant(id: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const participant = await prisma.activityParticipant.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!participant) throw new Error('NOT_FOUND')
  const deleted = await prisma.activityParticipant.delete({ where: { id } })
  await writeAuditLog({ userId: scope.userId, action: 'participant.remove', entityType: 'ActivityParticipant', entityId: id, oldValue: participant })
  return deleted
}
