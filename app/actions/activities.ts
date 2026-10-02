'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'

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
  return prisma.activityParticipant.findMany({ where: { activityId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, orderBy: { createdAt: 'desc' } })
}

export async function getActivities() {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  return prisma.cooperationActivity.findMany({ where: ids ? { organizationalUnitId: { in: ids } } : undefined, include: { cooperation: { include: { partner: true } }, participants: true, documents: true }, orderBy: { startDate: 'desc' } })
}
export async function createActivity(input: { cooperationId: string; activityType: string; activityName: string; organizationalUnitId: string; startDate?: Date; endDate?: Date; implementationPeriod?: string; description?: string; notes?: string }) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  if (ids && !ids.includes(input.organizationalUnitId)) throw new Error('FORBIDDEN_SCOPE')
  const row = await prisma.cooperationActivity.create({ data: input }); revalidatePath('/'); return row
}
export async function updateActivity(id: string, input: Partial<Parameters<typeof createActivity>[0]> & { status?: 'ONGOING' | 'COMPLETED' | 'CANCELLED' }) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const existing = await prisma.cooperationActivity.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!existing) throw new Error('NOT_FOUND')
  return prisma.cooperationActivity.update({ where: { id }, data: input })
}
export async function addParticipant(input: { activityId: string; name: string; identityNumber: string; identityType: 'NIM' | 'NIP' | 'NIPH'; organizationalUnitId: string; participantType?: string; notes?: string }) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const activity = await prisma.cooperationActivity.findFirst({ where: { id: input.activityId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!activity || (ids && !ids.includes(input.organizationalUnitId))) throw new Error('FORBIDDEN_SCOPE')
  return prisma.activityParticipant.create({ data: input })
}
export async function removeParticipant(id: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const participant = await prisma.activityParticipant.findFirst({ where: { id, ...(ids ? { organizationalUnitId: { in: ids } } : {}) } })
  if (!participant) throw new Error('NOT_FOUND')
  return prisma.activityParticipant.delete({ where: { id } })
}
