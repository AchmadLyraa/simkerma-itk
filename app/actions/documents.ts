'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { safe } from '@/lib/error-message'

type DocumentSource = 'LINK' | 'UPLOAD'

function validateDocumentInput(input: { documentSource?: DocumentSource; fileUrl?: string }) {
  const source = input.documentSource ?? 'LINK'
  if (source === 'LINK') {
    if (!input.fileUrl) throw new Error('URL dokumen wajib diisi')
    try { new URL(input.fileUrl) } catch { throw new Error('URL dokumen tidak valid') }
    return source
  }
  throw new Error('UPLOAD_REQUIRES_OBJECT_STORAGE_INTEGRATION')
}

export async function createCooperationDocument(input: { cooperationId: string; documentType: 'MOU' | 'PKS' | 'IA'; documentNumber?: string; title: string; documentSource?: DocumentSource; filePath?: string; fileUrl?: string; mimeType?: string; fileSize?: number; checksum?: string; issueDate?: Date; startDate?: Date; endDate?: Date }) {
  return safe(async () => {
    const scope = await requireScope()
    if (!input.title?.trim()) throw new Error('Judul dokumen wajib diisi')
    const documentSource = validateDocumentInput(input)
    const ids = await scopedOrganizationalUnitIds(scope)
    const cooperation = await prisma.cooperation.findFirst({ where: { id: input.cooperationId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { id: true } })
    if (!cooperation) throw new Error('NOT_FOUND')
    const document = await prisma.cooperationDocument.create({
      data: {
        cooperationId: input.cooperationId,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        title: input.title.trim(),
        documentSource,
        filePath: input.filePath,
        fileUrl: input.fileUrl,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        checksum: input.checksum,
        issueDate: input.issueDate,
        startDate: input.startDate,
        endDate: input.endDate,
        uploadedById: scope.userId,
      },
    })
    await writeAuditLog({ userId: scope.userId, action: 'document.create', entityType: 'CooperationDocument', entityId: document.id, newValue: document })
    revalidatePath('/')
    return document
  })
}

export async function listCooperationDocuments(cooperationId: string) {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  const cooperation = await prisma.cooperation.findFirst({ where: { id: cooperationId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { id: true } })
  if (!cooperation) throw new Error('NOT_FOUND')
  return prisma.cooperationDocument.findMany({ where: { cooperationId }, orderBy: { createdAt: 'desc' } })
}

export async function deleteCooperationDocument(id: string) {
  return safe(async () => {
    const scope = await requireScope()
    const ids = await scopedOrganizationalUnitIds(scope)
    const document = await prisma.cooperationDocument.findFirst({ where: { id, cooperation: ids ? { organizationalUnitId: { in: ids } } : undefined } })
    if (!document) throw new Error('NOT_FOUND')
    await prisma.cooperationDocument.delete({ where: { id } })
    await writeAuditLog({ userId: scope.userId, action: 'document.delete', entityType: 'CooperationDocument', entityId: id, oldValue: document })
    revalidatePath('/')
  })
}

export async function createActivityDocument(input: { activityId: string; title: string; documentSource?: DocumentSource; filePath?: string; fileUrl?: string; mimeType?: string; fileSize?: number; documentType?: string }) {
  return safe(async () => {
    const scope = await requireScope()
    if (!input.title?.trim()) throw new Error('Judul dokumen wajib diisi')
    const documentSource = validateDocumentInput(input)
    const ids = await scopedOrganizationalUnitIds(scope)
    const activity = await prisma.cooperationActivity.findFirst({ where: { id: input.activityId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { id: true } })
    if (!activity) throw new Error('NOT_FOUND')
    const row = await prisma.activityDocument.create({
      data: { activityId: input.activityId, title: input.title.trim(), documentSource, filePath: input.filePath, fileUrl: input.fileUrl, mimeType: input.mimeType, fileSize: input.fileSize, documentType: input.documentType, uploadedById: scope.userId },
    })
    await writeAuditLog({ userId: scope.userId, action: 'activity_document.create', entityType: 'ActivityDocument', entityId: row.id, newValue: row })
    return row
  })
}
