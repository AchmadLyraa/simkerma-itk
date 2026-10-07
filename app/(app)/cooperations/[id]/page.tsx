'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  deleteCooperation,
  getCooperationById,
  getCooperationRegions,
  getTridharmaCategories,
  reopenCooperation,
  submitForApproval,
  updateCooperation,
} from '@/app/actions/cooperations'
import { getScopedOrganizationalUnits } from '@/app/actions/organizational-units'
import { listCooperationDocuments } from '@/app/actions/documents'
import { ActionModal, DataTable, EmptyState, ModulePage, type FormField } from '@/components/module-page'
import { errorMessage } from '@/lib/error-message'
import { DocumentLink } from '@/components/document-link'
import { CalendarCheck, ChevronRight, FileText } from 'lucide-react'


const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED_JURUSAN: 'Menunggu approval jurusan',
  SUBMITTED_FAKULTAS: 'Menunggu approval fakultas',
  SUBMITTED_INSTITUT: 'Menunggu approval institut',
  APPROVED: 'Disetujui',
  LOCKED: 'Terkunci',
  REJECTED: 'Ditolak',
}

const formatDateTime = (value: Date | string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const formatDate = (value?: Date | string | null) => (value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '-')
const toInputDate = (value?: Date | string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '')

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium">{children || '-'}</p></div>
}

export default function CooperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [row, setRow] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [modal, setModal] = useState<'submit' | 'edit' | 'reopen' | 'delete' | null>(null)
  const [units, setUnits] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [tridharma, setTridharma] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])

  const load = (id: string) => {
    listCooperationDocuments(id).then(setDocs).catch(() => setDocs([]))
    return getCooperationById(id)
      .then((data) => { setRow(data); setError(null) })
      .catch(() => setError('Kerja sama tidak ditemukan atau di luar scope Anda.'))
  }

  useEffect(() => {
    params.then(({ id }) => load(id))
    getScopedOrganizationalUnits().then(setUnits).catch(() => setUnits([]))
    getCooperationRegions().then(setRegions).catch(() => setRegions([]))
    getTridharmaCategories().then(setTridharma).catch(() => setTridharma([]))
  }, [params])

  const editFields: FormField[] = [
    { name: 'name', label: 'Nama kerja sama', required: true },
    { name: 'regionId', label: 'Wilayah (kosongkan jika tidak diubah)', options: regions.map((x) => ({ label: x.name, value: x.id })) },
    { name: 'startDate', label: 'Tanggal mulai', type: 'date' },
    { name: 'endDate', label: 'Tanggal berakhir', type: 'date' },
    { name: 'cpDiPks', label: 'Kontak di PKS' },
    { name: 'benefit', label: 'Manfaat', type: 'textarea' },
    { name: 'notes', label: 'Catatan', type: 'textarea' },
    { name: 'studyProgramIds', label: 'Program studi terlibat', multiple: true, options: units.filter((x) => x.type === 'STUDY_PROGRAM').map((x) => ({ label: x.name, value: x.id })) },
    { name: 'tridharmaCategoryIds', label: 'Kategori tridharma', multiple: true, options: tridharma.map((x) => ({ label: x.name, value: x.id })) },
  ]

  return (
    <>
      <ModulePage title={row?.name ?? 'Detail kerja sama'} description="Ringkasan, approval, dokumen, dan realisasi kerja sama.">
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {row && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href={`/cooperations/${row.id}/documents`}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#087f72] hover:shadow-sm"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-lg bg-[#e8f6f4] text-[#087f72]">
                    <FileText size={20} />
                  </div>
                  <p className="mt-4 font-bold text-slate-900">Dokumen</p>
                  <p className="mt-1 text-sm text-slate-500">
                    MoU, PKS, dan IA. Simpan sebagai link atau unggah file.
                  </p>
                  <p className="mt-3 text-xs font-semibold text-slate-600">
                    {row.documents.length} dokumen
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#087f72]">
                  Kelola dokumen
                  <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>

              <Link
                href={`/cooperations/${row.id}/activities`}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#087f72] hover:shadow-sm"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-lg bg-[#e8f6f4] text-[#087f72]">
                    <CalendarCheck size={20} />
                  </div>
                  <p className="mt-4 font-bold text-slate-900">Kegiatan</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Catat realisasi kegiatan dan peserta dari kerja sama ini.
                  </p>
                  <p className="mt-3 text-xs font-semibold text-slate-600">
                    {row.activities.length} kegiatan
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#087f72]">
                  Kelola kegiatan
                  <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>              <div className="rounded-xl border bg-white p-5">
                <p className="text-xs text-slate-500">Status</p>
                <p className="mt-2 font-bold">{statusLabel[row.status] ?? row.status}</p>
                {row.status === 'DRAFT' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setModal('edit')} className="rounded-lg border px-4 py-2 text-sm font-semibold">Ubah</button>
                    <button onClick={() => setModal('submit')} className="rounded-lg bg-[#087f72] px-4 py-2 text-sm font-semibold text-white">Ajukan untuk approval</button>
                  </div>
                )}
                {row.status === 'REJECTED' && (
                  <div className="mt-4">
                    <button onClick={() => setModal('reopen')} className="rounded-lg bg-[#087f72] px-4 py-2 text-sm font-semibold text-white">Kembalikan ke draft</button>
                  </div>
                )}
                {(row.status === 'DRAFT' || row.status === 'REJECTED') && (
                  <div className="mt-3">
                    <button
                      onClick={() => setModal('delete')}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600"
                    >
                      Hapus kerja sama
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-5 rounded-xl border bg-white p-5 sm:grid-cols-2">
              <Info label="Mitra">{row.partner?.name}</Info>
              <Info label="Wilayah">{row.region?.name}</Info>
              <Info label="Periode">{`${formatDate(row.startDate)} – ${formatDate(row.endDate)}`}</Info>
              <Info label="Kontak di PKS">{row.cpDiPks}</Info>
              <Info label="Program studi terlibat">{row.studyPrograms.map((p: any) => p.organizationalUnit.name).join(', ')}</Info>
              <Info label="Kategori tridharma">{row.tridharmaCategories.map((t: any) => t.tridharmaCategory.name).join(', ')}</Info>
              <Info label="Manfaat">{row.benefit}</Info>
              <Info label="Catatan">{row.notes}</Info>
            </div>

            <h2 className="mb-3 mt-8 text-lg font-bold">Dokumen</h2>
            {docs.length > 0 ? (
              <DataTable
                columns={['Judul', 'Tipe', 'Nomor', 'Link']}
                rows={docs.map((d: any) => ({
                  Judul: d.title,
                  Tipe: d.documentType,
                  Nomor: d.documentNumber ?? '-',
                  Link: <DocumentLink id={d.id} />,
                }))}
              />
            ) : (
              <EmptyState text="Belum ada dokumen. Tambahkan lewat Kelola dokumen." />
            )}
            <h2 className="mb-3 mt-8 text-lg font-bold">Histori approval</h2>
            {row.approvals.length > 0 ? (
              <DataTable
                columns={['Waktu', 'Aksi', 'Oleh', 'Catatan']}
                rows={row.approvals.map((a: any) => ({
                  Waktu: formatDateTime(a.createdAt),
                  Aksi: a.action === 'approved' ? 'Disetujui' : 'Ditolak',
                  Oleh: a.approvedBy?.name ?? '-',
                  Catatan: a.note ?? '-',
                }))}
              />
            ) : (
              <EmptyState text="Belum ada histori approval." />
            )}
          </>
        )}
        {!row && !error && <p className="text-sm text-slate-500">Memuat...</p>}
      </ModulePage>

      {modal === 'submit' && row && (
        <ActionModal
          title="Ajukan kerja sama ini untuk approval?"
          submitLabel="Ajukan"
          onSubmit={async () => { const r = await submitForApproval(row.id); await load(row.id); return r }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'reopen' && row && (
        <ActionModal
          title="Kembalikan kerja sama ini ke draft agar bisa diubah dan diajukan ulang?"
          submitLabel="Kembalikan"
          onSubmit={async () => { const r = await reopenCooperation(row.id); await load(row.id); return r }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'delete' && row && (
        <ActionModal
          title={`Hapus kerja sama "${row.name}"?`}
          submitLabel="Hapus"
          fields={[
            {
              name: 'info',
              label: 'Dokumen, kegiatan, peserta, dan histori approval kerja sama ini ikut terhapus. Tindakan ini tidak dapat dibatalkan.',
              disabled: true,
            },
          ]}
          onSubmit={async () => {
            const result = await deleteCooperation(row.id)
            if (result.ok) router.push('/cooperations')
            return result
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'edit' && row && (
        <ActionModal
          title={`Ubah kerja sama: ${row.name}`}
          fields={editFields}
          initialValues={{
            name: row.name,
            regionId: row.regionId ?? '',
            startDate: toInputDate(row.startDate),
            endDate: toInputDate(row.endDate),
            cpDiPks: row.cpDiPks ?? '',
            benefit: row.benefit ?? '',
            notes: row.notes ?? '',
            studyProgramIds: row.studyPrograms.map((p: any) => p.organizationalUnitId).join(','),
            tridharmaCategoryIds: row.tridharmaCategories.map((t: any) => t.tridharmaCategoryId).join(','),
          }}
          onSubmit={async (d) => {
            const r = await updateCooperation(row.id, {
              name: d.name,
              regionId: d.regionId || undefined,
              startDate: d.startDate ? new Date(d.startDate) : undefined,
              endDate: d.endDate ? new Date(d.endDate) : undefined,
              cpDiPks: d.cpDiPks,
              benefit: d.benefit,
              notes: d.notes,
              studyProgramIds: d.studyProgramIds ? d.studyProgramIds.split(',') : [],
              tridharmaCategoryIds: d.tridharmaCategoryIds ? d.tridharmaCategoryIds.split(',') : [],
            })
            await load(row.id)
            return r
          }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
