'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ActionModal, DataTable, EmptyState, ModulePage } from '@/components/module-page'
import { DocumentLink } from '@/components/document-link'
import {
  deleteCooperationDocument,
  listCooperationDocuments,
} from '@/app/actions/documents'
import { errorMessage } from '@/lib/error-message'

const formatDate = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleDateString('id-ID') : '-'

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const [rows, setRows] = useState<any[]>([])
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<any>(null)

  const load = (cooperationId: string) =>
    listCooperationDocuments(cooperationId)
      .then((data) => {
        setRows(data)
        setError(null)
      })
      .catch((e) => {
        setRows([])
        setError(errorMessage(e))
      })

  const done = async (result: unknown) => {
    await load(id)
    return result
  }

  useEffect(() => {
    params.then(({ id }) => {
      setId(id)
      load(id)
    })
  }, [params])

  return (
    <>
      <ModulePage
        title="Dokumen kerja sama"
        description="Simpan dokumen sebagai link atau unggah file langsung."
        error={error}
        fields={[
          { name: 'title', label: 'Judul dokumen', required: true },
          { name: 'documentType', label: 'Tipe dokumen', options: ['MOU', 'PKS', 'IA'], required: true },
          { name: 'documentNumber', label: 'Nomor dokumen' },
          {
            name: 'documentSource',
            label: 'Sumber dokumen',
            options: [
              { label: 'Link eksternal', value: 'LINK' },
              { label: 'Unggah file', value: 'UPLOAD' },
            ],
            required: true,
          },
          {
            name: 'fileUrl',
            label: 'URL dokumen',
            helpText: 'Contoh: https://drive.google.com/...',
            showIf: (d) => d.documentSource === 'LINK',
          },
          {
            name: 'file',
            label: 'File (PDF, Word, PNG, JPG; maksimal 10 MB)',
            type: 'file',
            showIf: (d) => d.documentSource === 'UPLOAD',
          },
          { name: 'issueDate', label: 'Tanggal terbit', type: 'date' },
          { name: 'startDate', label: 'Tanggal mulai berlaku', type: 'date' },
          { name: 'endDate', label: 'Tanggal berakhir', type: 'date' },
        ]}
        onSubmit={async (data, files) => {
          const form = new FormData()
          form.set('cooperationId', id)
          for (const [key, value] of Object.entries(data)) form.set(key, value)
          if (data.documentSource === 'UPLOAD' && files.file) {
            form.set('file', files.file)
          }
          const response = await fetch('/api/documents', {
            method: 'POST',
            body: form,
          })
          // Sesi berakhir: proxy mengalihkan ke /login sehingga balasannya bukan JSON.
          const result = await response.json().catch(() => ({
            ok: false,
            error: 'Sesi Anda berakhir. Silakan masuk kembali.',
          }))
          return done(result)
        }}
      >
        <Link href={`/cooperations/${id}`} className="mb-4 inline-block text-sm font-semibold text-[#087f72]">
          ← Kembali ke detail kerja sama
        </Link>
        {rows.length > 0 ? (
          <DataTable
            columns={['Judul', 'Tipe', 'Nomor', 'Masa berlaku', 'Sumber', 'Aksi']}
            rows={rows.map((row) => ({
              Judul: row.title,
              Tipe: row.documentType,
              Nomor: row.documentNumber ?? '-',
              'Masa berlaku': `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
              Sumber: row.documentSource === 'UPLOAD' ? 'File' : 'Link',
              Aksi: (
                <span className="flex gap-3">
                  <DocumentLink id={row.id} />
                  <button onClick={() => setDeleting(row)} className="font-semibold text-red-600">
                    Hapus
                  </button>
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
