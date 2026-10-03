'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DataTable, EmptyState, ModulePage } from '@/components/module-page'
import { createActivity, getActivitiesByCooperation } from '@/app/actions/activities'
import { getScopedOrganizationalUnits } from '@/app/actions/organizational-units'
import { errorMessage } from '@/lib/error-message'

const statusLabel: Record<string, string> = { ONGOING: 'Berjalan', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan' }
const formatDate = (value?: Date | string | null) => (value ? new Date(value).toLocaleDateString('id-ID') : '-')

export default function CooperationActivitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const [rows, setRows] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = (cooperationId: string) =>
    getActivitiesByCooperation(cooperationId)
      .then((data) => { setRows(data); setError(null) })
      .catch((e) => { setRows([]); setError(errorMessage(e)) })

  useEffect(() => {
    params.then(({ id }) => { setId(id); load(id) })
    getScopedOrganizationalUnits().then(setUnits).catch(() => setUnits([]))
  }, [params])

  return (
    <ModulePage
      title="Kegiatan kerja sama"
      description="Catat realisasi kegiatan dari kerja sama terpilih."
      error={error}
      fields={[
        { name: 'activityType', label: 'Jenis kegiatan (mis. Magang, MBKM, Penelitian)', required: true },
        { name: 'activityName', label: 'Nama kegiatan', required: true },
        { name: 'organizationalUnitId', label: 'Unit organisasi', options: units.map((x) => ({ label: `${x.name} (${x.type})`, value: x.id })), required: true },
        { name: 'startDate', label: 'Tanggal mulai', type: 'date' },
        { name: 'endDate', label: 'Tanggal selesai', type: 'date' },
        { name: 'description', label: 'Deskripsi', type: 'textarea' },
      ]}
      onSubmit={async (data) => {
        await createActivity({
          cooperationId: id,
          activityType: data.activityType,
          activityName: data.activityName,
          organizationalUnitId: data.organizationalUnitId,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          description: data.description || undefined,
        })
        await load(id)
      }}
    >
      <Link href={`/cooperations/${id}`} className="mb-4 inline-block text-sm font-semibold text-[#087f72]">← Kembali ke detail kerja sama</Link>
      {rows.length > 0 ? (
        <DataTable
          columns={['Kegiatan', 'Jenis', 'Periode', 'Peserta', 'Status', 'Aksi']}
          rows={rows.map((row) => ({
            Kegiatan: row.activityName,
            Jenis: row.activityType,
            Periode: `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
            Peserta: row.participants?.length ?? 0,
            Status: statusLabel[row.status] ?? row.status,
            Aksi: <Link className="font-semibold text-[#087f72]" href={`/activities/${row.id}/participants`}>Peserta</Link>,
          }))}
        />
      ) : (
        !error && <EmptyState text="Belum ada kegiatan." />
      )}
    </ModulePage>
  )
}
