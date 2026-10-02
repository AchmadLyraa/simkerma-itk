'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'

type DocumentSource = 'LINK' | 'UPLOAD'

function validateDocumentInput(input: { documentSource?: DocumentSource; fileUrl?: string; filePath?: string; mimeType?: string; fileSize?: number }) {
  const source = input.documentSource ?? 'LINK'
  if (source === 'LINK') {
    if (!input.fileUrl) throw new Error('URL dokumen wajib diisi')
    try { new URL(input.fileUrl) } catch { throw new Error('URL dokumen tidak valid') }
    return source
  }
  throw new Error('UPLOAD_REQUIRES_OBJECT_STORAGE_INTEGRATION')
}

export async function createCooperationDocument(input: { cooperationId: string; documentType: 'MOU' | 'PKS' | 'IA'; documentNumber?: string; title: string; documentSource?: DocumentSource; filePath?: string; fileUrl?: string; mimeType?: string; fileSize?: number; checksum?: string; issueDate?: Date; startDate?: Date; endDate?: Date }) {
  const scope = await requireScope()
  if (!input.title.trim()) throw new Error('Judul dokumen wajib diisi')
  const documentSource = validateDocumentInput(input)
  const ids = await scopedOrganizationalUnitIds(scope)
  const cooperation = await prisma.cooperation.findFirst({ where: { id: input.cooperationId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { organizationalUnitId: true } })
  if (!cooperation) throw new Error('NOT_FOUND')
  const document = await prisma.cooperationDocument.create({ data: { cooperationId: input.cooperationId, documentType: input.documentType, documentNumber: input.documentNumber, title: input.title.trim(), documentSource, filePath: input.filePath, fileUrl: input.fileUrl, mimeType: input.mimeType, fileSize: input.fileSize, checksum: input.checksum, issueDate: input.issueDate, startDate: input.startDate, endDate: input.endDate, uploadedById: scope.userId } })
  revalidatePath('/')
  return document
}

export async function listCooperationDocuments(cooperationId: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const cooperation = await prisma.cooperation.findFirst({ where: { id: cooperationId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { id: true } })
  if (!cooperation) throw new Error('NOT_FOUND')
  return prisma.cooperationDocument.findMany({ where: { cooperationId }, orderBy: { createdAt: 'desc' } })
}

export async function deleteCooperationDocument(id: string) {
  const scope = await requireScope(); const ids = await scopedOrganizationalUnitIds(scope)
  const document = await prisma.cooperationDocument.findFirst({ where: { id, cooperation: ids ? { organizationalUnitId: { in: ids } } : undefined } })
  if (!document) throw new Error('NOT_FOUND')
  const deleted = await prisma.cooperationDocument.delete({ where: { id } })
  revalidatePath('/')
  return deleted
}

export async function createActivityDocument(input: { activityId: string; title: string; documentSource?: DocumentSource; filePath?: string; fileUrl?: string; mimeType?: string; fileSize?: number; documentType?: string }) {
  const scope = await requireScope()
  if (!input.title.trim()) throw new Error('Judul dokumen wajib diisi')
  const documentSource = validateDocumentInput(input)
  const ids = await scopedOrganizationalUnitIds(scope)
  const activity = await prisma.cooperationActivity.findFirst({ where: { id: input.activityId, ...(ids ? { organizationalUnitId: { in: ids } } : {}) }, select: { id: true } })
  if (!activity) throw new Error('NOT_FOUND')
  return prisma.activityDocument.create({ data: { activityId: input.activityId, title: input.title.trim(), documentSource, filePath: input.filePath, fileUrl: input.fileUrl, mimeType: input.mimeType, fileSize: input.fileSize, documentType: input.documentType, uploadedById: scope.userId } })
}
