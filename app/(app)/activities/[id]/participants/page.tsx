'use client'
import { useEffect, useState } from 'react'
import { DataTable, EmptyState, ModulePage } from '@/components/module-page'
import { addParticipant, getActivityParticipants, removeParticipant } from '@/app/actions/activities'
import { getScopedOrganizationalUnits } from '@/app/actions/organizational-units'
import { errorMessage } from '@/lib/error-message'

export default function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const [rows, setRows] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = (activityId: string) =>
    getActivityParticipants(activityId)
      .then((data) => { setRows(data); setError(null) })
      .catch((e) => { setRows([]); setError(errorMessage(e)) })

  useEffect(() => {
    params.then(({ id }) => { setId(id); load(id) })
    getScopedOrganizationalUnits().then(setUnits).catch(() => setUnits([]))
  }, [params])

  async function remove(participantId: string) {
    const err = errorMessage(await removeParticipant(participantId))
    if (err) setError(err)
    else await load(id)
  }

  return (
    <ModulePage
      title="Peserta kegiatan"
      description="Kelola peserta dan unit organisasi asalnya."
      error={error}
      fields={[
        { name: 'name', label: 'Nama peserta', required: true },
        { name: 'identityNumber', label: 'Nomor identitas', required: true },
        { name: 'identityType', label: 'Tipe identitas', options: ['NIM', 'NIP', 'NIPH'], required: true },
        { name: 'organizationalUnitId', label: 'Unit organisasi', options: units.map((x) => ({ label: `${x.name} (${x.type})`, value: x.id })), required: true },
      ]}
      onSubmit={async (data) => {
        const r = await addParticipant({
          activityId: id,
          name: data.name,
          identityNumber: data.identityNumber,
          identityType: data.identityType as 'NIM' | 'NIP' | 'NIPH',
          organizationalUnitId: data.organizationalUnitId,
        })
        await load(id)
        return r
      }}
    >
      {rows.length > 0 ? (
        <DataTable
          columns={['Nama', 'Identitas', 'Unit organisasi', 'Aksi']}
          rows={rows.map((row) => ({
            Nama: row.name,
            Identitas: `${row.identityType}: ${row.identityNumber}`,
            'Unit organisasi': row.organizationalUnit?.name ?? '-',
            Aksi: <button onClick={() => remove(row.id)} className="font-semibold text-red-600">Hapus</button>,
          }))}
        />
      ) : (
        !error && <EmptyState text="Belum ada peserta kegiatan." />
      )}
    </ModulePage>
  )
}
