import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope, scopedOrganizationalUnitIds } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { putObject, signedDownloadUrl } from '@/lib/s3'

type Scope = Awaited<ReturnType<typeof requireScope>>
export type DocumentSource = 'LINK' | 'UPLOAD'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

export function validateDocumentInput(input: {
  documentSource?: DocumentSource
  fileUrl?: string
}) {
  const source = input.documentSource ?? 'LINK'
  if (source === 'LINK') {
    if (!input.fileUrl) throw new Error('URL dokumen wajib diisi')
    try {
      new URL(input.fileUrl)
    } catch {
      throw new Error('URL dokumen tidak valid')
    }
    return source
  }
  throw new Error('UPLOAD_REQUIRES_OBJECT_STORAGE_INTEGRATION')
}

function text(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function optionalDate(formData: FormData, name: string) {
  const value = text(formData, name)
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Format tanggal tidak valid')
  return date
}

export async function saveCooperationDocument(scope: Scope, formData: FormData) {
  const cooperationId = text(formData, 'cooperationId')
  const title = text(formData, 'title')
  const documentType = text(formData, 'documentType')
  const source = text(formData, 'documentSource')

  if (!title) throw new Error('Judul dokumen wajib diisi')
  if (!['MOU', 'PKS', 'IA'].includes(documentType)) {
    throw new Error('Tipe dokumen tidak valid')
  }
  if (source !== 'LINK' && source !== 'UPLOAD') throw new Error('Pilih sumber dokumen')

  const issueDate = optionalDate(formData, 'issueDate')
  const startDate = optionalDate(formData, 'startDate')
  const endDate = optionalDate(formData, 'endDate')
  if (startDate && endDate && endDate < startDate) {
    throw new Error('Tanggal berakhir tidak boleh sebelum tanggal mulai')
  }

  const ids = await scopedOrganizationalUnitIds(scope)
  const cooperation = await prisma.cooperation.findFirst({
    where: {
      id: cooperationId,
      ...(ids ? { organizationalUnitId: { in: ids } } : {}),
    },
    select: { id: true },
  })
  if (!cooperation) throw new Error('NOT_FOUND')

  let fileUrl: string | undefined
  let filePath: string | undefined
  let mimeType: string | undefined
  let fileSize: number | undefined

  if (source === 'LINK') {
    fileUrl = text(formData, 'fileUrl')
    validateDocumentInput({ documentSource: 'LINK', fileUrl })
  } else {
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      throw new Error('Pilih file yang akan diunggah')
    }
    if (file.size > MAX_FILE_SIZE) throw new Error('Ukuran file maksimal 10 MB')
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Tipe file harus PDF, Word, PNG, atau JPG')
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    filePath = `cooperations/${cooperationId}/${randomUUID()}-${safeName}`
    await putObject(filePath, Buffer.from(await file.arrayBuffer()), file.type)
    mimeType = file.type
    fileSize = file.size
  }

  const document = await prisma.cooperationDocument.create({
    data: {
      cooperationId,
      documentType: documentType as 'MOU' | 'PKS' | 'IA',
      documentNumber: text(formData, 'documentNumber') || undefined,
      title,
      documentSource: source,
      fileUrl,
      filePath,
      mimeType,
      fileSize,
      issueDate,
      startDate,
      endDate,
      uploadedById: scope.userId,
    },
  })
  await writeAuditLog({
    userId: scope.userId,
    action: 'document.create',
    entityType: 'CooperationDocument',
    entityId: document.id,
    newValue: document,
  })
  revalidatePath('/')
  return document
}

// URL tujuan untuk membuka dokumen: link langsung, atau link sementara dari S3.
export async function resolveDocumentUrl(scope: Scope, id: string) {
  const ids = await scopedOrganizationalUnitIds(scope)
  const document = await prisma.cooperationDocument.findFirst({
    where: {
      id,
      cooperation: ids ? { organizationalUnitId: { in: ids } } : undefined,
    },
  })
  if (!document) throw new Error('NOT_FOUND')
  if (document.documentSource === 'UPLOAD') {
    if (!document.filePath) throw new Error('File tidak ditemukan')
    return signedDownloadUrl(document.filePath)
  }
  if (!document.fileUrl) throw new Error('Link dokumen kosong')
  return document.fileUrl
}
