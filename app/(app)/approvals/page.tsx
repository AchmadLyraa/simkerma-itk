'use client'
import { useEffect, useState } from 'react'
import { ActionModal, DataTable, EmptyState, ModulePage } from '@/components/module-page'
import { approveCooperation, getPendingApprovals, rejectCooperation } from '@/app/actions/cooperations'
import { errorMessage } from '@/lib/error-message'

const levelLabel: Record<string, string> = { SUBMITTED_JURUSAN: 'Jurusan', SUBMITTED_FAKULTAS: 'Fakultas', SUBMITTED_INSTITUT: 'Institut' }

export default function ApprovalsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [rejecting, setRejecting] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    getPendingApprovals()
      .then((data) => { setRows(data); setError(null) })
      .catch((e) => { setRows([]); setError(errorMessage(e)) })

  useEffect(() => { load() }, [])

  async function approve(id: string) {
    const err = errorMessage(await approveCooperation(id))
    if (err) setError(err)
    else await load()
  }

  return (
    <>
      <ModulePage title="Approval kerja sama" description="Review kerja sama sesuai level organisasi Anda." error={error}>
        {rows.length > 0 ? (
          <DataTable
            columns={['Kerja sama', 'Pengaju', 'Menunggu level', 'Aksi']}
            rows={rows.map((row) => ({
              'Kerja sama': row.name,
              Pengaju: row.createdBy?.name ?? '-',
              'Menunggu level': levelLabel[row.status] ?? row.status,
              Aksi: (
                <span className="flex gap-3">
                  <button onClick={() => approve(row.id)} className="font-semibold text-[#087f72]">Setujui</button>
                  <button onClick={() => setRejecting(row)} className="font-semibold text-red-600">Tolak</button>
                </span>
              ),
            }))}
          />
        ) : (
          !error && <EmptyState text="Tidak ada kerja sama yang menunggu tindakan Anda." />
        )}
      </ModulePage>
      {rejecting && (
        <ActionModal
          title={`Tolak: ${rejecting.name}`}
          submitLabel="Tolak"
          fields={[{ name: 'note', label: 'Alasan penolakan', type: 'textarea', required: true }]}
          onSubmit={async (data) => {
            const r = await rejectCooperation(rejecting.id, data.note)
            await load()
            return r
          }}
          onClose={() => setRejecting(null)}
        />
      )}
    </>
  )
}
