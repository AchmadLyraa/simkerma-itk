'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { safe } from '@/lib/error-message'
import { deleteObject } from '@/lib/s3'
import { validateDocumentInput, type DocumentSource } from '@/lib/documents'

export async function listCooperationDocuments(cooperationId: string) {
  const scope = await requireScope()
  const ids = await scopedOrganizationalUnitIds(scope)
  const cooperation = await prisma.cooperation.findFirst({
    where: {
      id: cooperationId,
      ...(ids ? { organizationalUnitId: { in: ids } } : {}),
    },
    select: { id: true },
  })
  if (!cooperation) throw new Error('NOT_FOUND')
  return prisma.cooperationDocument.findMany({
    where: { cooperationId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function deleteCooperationDocument(id: string) {
  return safe(async () => {
    const scope = await requireScope()
    const ids = await scopedOrganizationalUnitIds(scope)
    const document = await prisma.cooperationDocument.findFirst({
      where: {
        id,
        cooperation: ids ? { organizationalUnitId: { in: ids } } : undefined,
      },
    })
    if (!document) throw new Error('NOT_FOUND')
    await prisma.cooperationDocument.delete({ where: { id } })
    if (document.documentSource === 'UPLOAD' && document.filePath) {
      // Gagal hapus file di bucket tidak boleh menggagalkan penghapusan data.
      await deleteObject(document.filePath).catch((e) => console.error(e))
    }
    await writeAuditLog({
      userId: scope.userId,
      action: 'document.delete',
      entityType: 'CooperationDocument',
      entityId: id,
      oldValue: document,
    })
    revalidatePath('/')
  })
}

export async function createActivityDocument(input: {
  activityId: string
  title: string
  documentSource?: DocumentSource
  filePath?: string
  fileUrl?: string
  mimeType?: string
  fileSize?: number
  documentType?: string
}) {
  return safe(async () => {
    const scope = await requireScope()
    if (!input.title?.trim()) throw new Error('Judul dokumen wajib diisi')
    const documentSource = validateDocumentInput(input)
    const ids = await scopedOrganizationalUnitIds(scope)
    const activity = await prisma.cooperationActivity.findFirst({
      where: {
        id: input.activityId,
        ...(ids ? { organizationalUnitId: { in: ids } } : {}),
      },
      select: { id: true },
    })
    if (!activity) throw new Error('NOT_FOUND')
    const row = await prisma.activityDocument.create({
      data: {
        activityId: input.activityId,
        title: input.title.trim(),
        documentSource,
        filePath: input.filePath,
        fileUrl: input.fileUrl,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        documentType: input.documentType,
        uploadedById: scope.userId,
      },
    })
    await writeAuditLog({
      userId: scope.userId,
      action: 'activity_document.create',
      entityType: 'ActivityDocument',
      entityId: row.id,
      newValue: row,
    })
    return row
  })
}
