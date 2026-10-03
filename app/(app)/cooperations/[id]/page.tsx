'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCooperationById, submitForApproval } from '@/app/actions/cooperations'
import { ActionModal, DataTable, EmptyState, ModulePage } from '@/components/module-page'

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED_JURUSAN: 'Menunggu approval jurusan',
  SUBMITTED_FAKULTAS: 'Menunggu approval fakultas',
  SUBMITTED_INSTITUT: 'Menunggu approval institut',
  APPROVED: 'Disetujui',
  LOCKED: 'Terkunci',
  REJECTED: 'Ditolak',
}

const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function CooperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [row, setRow] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const load = (id: string) =>
    getCooperationById(id)
      .then((data) => { setRow(data); setError(null) })
      .catch(() => setError('Kerja sama tidak ditemukan atau di luar scope Anda.'))

  useEffect(() => { params.then(({ id }) => load(id)) }, [params])

  async function submit() {
    try {
      await submitForApproval(row.id)
      await load(row.id)
    } catch {
      setError('Gagal mengajukan. Hanya pembuat kerja sama (atau super admin) yang dapat mengajukan.')
    }
  }

  return (
    <>
      <ModulePage title={row?.name ?? 'Detail kerja sama'} description="Ringkasan, approval, dokumen, dan realisasi kerja sama.">
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {row && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link href={`/cooperations/${row.id}/documents`} className="rounded-xl border bg-white p-5 font-semibold hover:border-[#087f72]">Dokumen</Link>
              <Link href={`/cooperations/${row.id}/activities`} className="rounded-xl border bg-white p-5 font-semibold hover:border-[#087f72]">Kegiatan</Link>
              <div className="rounded-xl border bg-white p-5">
                <p className="text-xs text-slate-500">Status</p>
                <p className="mt-2 font-bold">{statusLabel[row.status] ?? row.status}</p>
                <p className="mt-2 text-sm text-slate-500">{row.partner?.name}</p>
                {row.status === 'DRAFT' && (
                  <button onClick={() => setConfirming(true)} className="mt-4 rounded-lg bg-[#087f72] px-4 py-2 text-sm font-semibold text-white">Ajukan untuk approval</button>
                )}
              </div>
            </div>
            <h2 className="mb-3 mt-8 text-lg font-bold">Histori approval</h2>
            {row.approvals.length > 0 ? (
              <DataTable
                columns={['Waktu', 'Aksi', 'Oleh', 'Catatan']}
                rows={row.approvals.map((a: any) => ({
                  Waktu: formatDate(a.createdAt),
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
      {confirming && <ActionModal title="Ajukan kerja sama ini untuk approval?" onSubmit={submit} onClose={() => setConfirming(false)} />}
    </>
  )
}
