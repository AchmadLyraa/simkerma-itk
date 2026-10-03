'use server'

import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'

export async function getDashboardSummary() {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  const unitFilter = ids ? { organizationalUnitId: { in: ids } } : {}
  const cooperationWhere = unitFilter
  const [partners, cooperations, activities, documents, pending, pendingItems, recentPartners, byYear, byTridharma, byRegion, byCategory, byStudyProgram, expiringSoon] = await Promise.all([
    prisma.partner.count({ where: { isActive: true, ...unitFilter } }),
    prisma.cooperation.count({ where: cooperationWhere }),
    prisma.cooperationActivity.count({ where: unitFilter }),
    prisma.cooperationDocument.count({ where: { cooperation: cooperationWhere } }),
    prisma.cooperation.count({ where: { ...cooperationWhere, status: { in: ['SUBMITTED_JURUSAN', 'SUBMITTED_FAKULTAS', 'SUBMITTED_INSTITUT'] } } }),
    prisma.cooperation.findMany({ where: { ...cooperationWhere, status: { in: ['SUBMITTED_JURUSAN', 'SUBMITTED_FAKULTAS', 'SUBMITTED_INSTITUT'] } }, select: { id: true, name: true, status: true }, orderBy: { updatedAt: 'asc' } }),
    prisma.partner.findMany({ where: { isActive: true, ...unitFilter }, include: { category: true, contacts: { where: { isPrimary: true }, take: 1 } }, orderBy: { updatedAt: 'desc' }, take: 10 }),
    prisma.cooperation.findMany({ where: cooperationWhere, select: { startDate: true, createdAt: true } }),
    prisma.cooperationTridharmaCategory.groupBy({ by: ['tridharmaCategoryId'], where: { cooperation: cooperationWhere }, _count: { _all: true } }),
    prisma.cooperation.groupBy({ by: ['regionId'], where: cooperationWhere, _count: { _all: true } }),
    prisma.partner.groupBy({ by: ['categoryId'], where: { isActive: true, ...unitFilter }, _count: { _all: true } }),
    prisma.cooperationStudyProgram.groupBy({ by: ['organizationalUnitId'], where: { cooperation: cooperationWhere }, _count: { _all: true } }),
    prisma.cooperation.findMany({ where: { ...cooperationWhere, endDate: { gte: new Date(), lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90) } }, select: { id: true, name: true, endDate: true }, orderBy: { endDate: 'asc' } }),
  ])
  const [tridharmaNames, regionNames, categoryNames, programNames] = await Promise.all([
    prisma.tridharmaCategory.findMany({ where: { id: { in: (byTridharma as any[]).map((x: any) => x.tridharmaCategoryId) } }, select: { id: true, name: true } }),
    prisma.cooperationRegion.findMany({ where: { id: { in: (byRegion as any[]).flatMap((x: any) => x.regionId ? [x.regionId] : []) } }, select: { id: true, name: true } }),
    prisma.partnerCategory.findMany({ where: { id: { in: (byCategory as any[]).map((x: any) => x.categoryId) } }, select: { id: true, name: true } }),
    prisma.organizationalUnit.findMany({ where: { id: { in: (byStudyProgram as any[]).map((x: any) => x.organizationalUnitId) } }, select: { id: true, name: true } }),
  ])
  const mapNames = (rows: Array<{ id: string; name: string }>, values: any[]) => values.map((value: any) => ({ name: rows.find((row: { id: string }) => row.id === value.id)?.name ?? value.id, count: value._count._all }))
  const yearCounts = new Map<number, number>()
  for (const row of byYear as Array<{ startDate: Date | null; createdAt: Date }>) {
    const year = (row.startDate ?? row.createdAt).getFullYear()
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1)
  }
  return { partners, cooperations, activities, documents, pending, pendingItems, recentPartners, byYear: [...yearCounts.entries()].sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count })), byTridharma: mapNames(tridharmaNames, (byTridharma as any[]).map((x: any) => ({ id: x.tridharmaCategoryId, _count: x._count }))), byRegion: mapNames(regionNames, (byRegion as any[]).filter((row: any) => row.regionId).map((row: any) => ({ id: row.regionId as string, _count: row._count }))), byCategory: mapNames(categoryNames, (byCategory as any[]).map((x: any) => ({ id: x.categoryId, _count: x._count }))), byStudyProgram: mapNames(programNames, (byStudyProgram as any[]).map((x: any) => ({ id: x.organizationalUnitId, _count: x._count }))), expiringSoon }
}
