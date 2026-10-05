'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ActionModal, DataTable, EmptyState, ModulePage } from '@/components/module-page'
import { createCooperationDocument, deleteCooperationDocument, listCooperationDocuments } from '@/app/actions/documents'
import { errorMessage } from '@/lib/error-message'

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const [rows, setRows] = useState<any[]>([])
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<any>(null)

  const load = (cooperationId: string) =>
    listCooperationDocuments(cooperationId)
      .then((data) => { setRows(data); setError(null) })
      .catch((e) => { setRows([]); setError(errorMessage(e)) })

  const done = async (result: unknown) => { await load(id); return result }

  useEffect(() => { params.then(({ id }) => { setId(id); load(id) }) }, [params])

  return (
    <>
      <ModulePage
        title="Dokumen kerja sama"
        description="Kelola dokumen LINK dan UPLOAD untuk kerja sama ini."
        error={error}
        fields={[
          { name: 'title', label: 'Judul dokumen', required: true },
          { name: 'documentNumber', label: 'Nomor dokumen' },
          { name: 'documentType', label: 'Tipe dokumen', options: ['MOU', 'PKS', 'IA'], required: true },
          { name: 'documentSource', label: 'Sumber dokumen', options: [{ label: 'Link eksternal', value: 'LINK' }, { label: 'Upload — menunggu integrasi storage', value: 'UPLOAD', disabled: true }], required: true },
          { name: 'fileUrl', label: 'URL dokumen', required: true },
        ]}
        onSubmit={async (data) =>
          done(await createCooperationDocument({
            cooperationId: id,
            title: data.title,
            documentNumber: data.documentNumber || undefined,
            documentType: data.documentType as 'MOU' | 'PKS' | 'IA',
            documentSource: 'LINK',
            fileUrl: data.fileUrl,
          }))
        }
      >
        <Link href={`/cooperations/${id}`} className="mb-4 inline-block text-sm font-semibold text-[#087f72]">← Kembali ke detail kerja sama</Link>
        {rows.length > 0 ? (
          <DataTable
            columns={['Judul', 'Tipe', 'Sumber', 'Status', 'Aksi']}
            rows={rows.map((row) => ({
              Judul: row.title,
              Tipe: row.documentType,
              Sumber: row.documentSource,
              Status: row.status,
              Aksi: (
                <span className="flex gap-3">
                  {row.fileUrl && <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#087f72]">Buka</a>}
                  <button onClick={() => setDeleting(row)} className="font-semibold text-red-600">Hapus</button>
                </span>
              ),
            }))}
          />
        ) : (
          !error && <EmptyState text="Belum ada dokumen untuk kerja sama ini." />
        )}
      </ModulePage>
      {deleting && (
        <ActionModal
          title={`Hapus dokumen "${deleting.title}"?`}
          submitLabel="Hapus"
          onSubmit={async () => done(await deleteCooperationDocument(deleting.id))}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}
