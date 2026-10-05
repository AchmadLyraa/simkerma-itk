'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ActionModal, DataTable, EmptyState, ModulePage, type FormField } from '@/components/module-page'
import { createActivity, getActivitiesByCooperation, updateActivity } from '@/app/actions/activities'
import { getScopedOrganizationalUnits } from '@/app/actions/organizational-units'
import { errorMessage } from '@/lib/error-message'

type ActivityStatus = 'ONGOING' | 'COMPLETED' | 'CANCELLED'
const statusLabel: Record<string, string> = { ONGOING: 'Berjalan', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan' }
const formatDate = (value?: Date | string | null) => (value ? new Date(value).toLocaleDateString('id-ID') : '-')
const toInputDate = (value?: Date | string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '')

export default function CooperationActivitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const [rows, setRows] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<any>(null)

  const load = (cooperationId: string) =>
    getActivitiesByCooperation(cooperationId)
      .then((data) => { setRows(data); setError(null) })
      .catch((e) => { setRows([]); setError(errorMessage(e)) })

  const done = async (result: unknown) => { await load(id); return result }

  useEffect(() => {
    params.then(({ id }) => { setId(id); load(id) })
    getScopedOrganizationalUnits().then(setUnits).catch(() => setUnits([]))
  }, [params])

  const baseFields: FormField[] = [
    { name: 'activityType', label: 'Jenis kegiatan (mis. Magang, MBKM, Penelitian)', required: true },
    { name: 'activityName', label: 'Nama kegiatan', required: true },
    { name: 'startDate', label: 'Tanggal mulai', type: 'date' },
    { name: 'endDate', label: 'Tanggal selesai', type: 'date' },
    { name: 'description', label: 'Deskripsi', type: 'textarea' },
  ]
  const createFields: FormField[] = [
    baseFields[0],
    baseFields[1],
    { name: 'organizationalUnitId', label: 'Unit organisasi', options: units.map((x) => ({ label: `${x.name} (${x.type})`, value: x.id })), required: true },
    ...baseFields.slice(2),
  ]
  const editFields: FormField[] = [
    ...baseFields,
    { name: 'status', label: 'Status', options: Object.entries(statusLabel).map(([value, label]) => ({ value, label })), required: true },
  ]

  return (
    <>
      <ModulePage
        title="Kegiatan kerja sama"
        description="Catat realisasi kegiatan dari kerja sama terpilih."
        error={error}
        fields={createFields}
        onSubmit={async (data) =>
          done(await createActivity({
            cooperationId: id,
            activityType: data.activityType,
            activityName: data.activityName,
            organizationalUnitId: data.organizationalUnitId,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
            description: data.description || undefined,
          }))
        }
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
              Aksi: (
                <span className="flex gap-3">
                  <Link className="font-semibold text-[#087f72]" href={`/activities/${row.id}/participants`}>Peserta</Link>
                  <button className="font-semibold text-[#087f72]" onClick={() => setEditing(row)}>Ubah</button>
                </span>
              ),
            }))}
          />
        ) : (
          !error && <EmptyState text="Belum ada kegiatan." />
        )}
      </ModulePage>
      {editing && (
        <ActionModal
          title={`Ubah kegiatan: ${editing.activityName}`}
          fields={editFields}
          initialValues={{
            activityType: editing.activityType,
            activityName: editing.activityName,
            startDate: toInputDate(editing.startDate),
            endDate: toInputDate(editing.endDate),
            description: editing.description ?? '',
            status: editing.status,
          }}
          onSubmit={async (d) =>
            done(await updateActivity(editing.id, {
              activityType: d.activityType,
              activityName: d.activityName,
              startDate: d.startDate ? new Date(d.startDate) : undefined,
              endDate: d.endDate ? new Date(d.endDate) : undefined,
              description: d.description,
              status: d.status as ActivityStatus,
            }))
          }
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
