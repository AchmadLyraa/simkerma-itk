'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DataTable, EmptyState, ModulePage } from '@/components/module-page'
import { createCooperation, getCooperationRegions, getCooperations, getTridharmaCategories } from '@/app/actions/cooperations'
import { getPartners } from '@/app/actions/partners'
import { getScopedOrganizationalUnits } from '@/app/actions/organizational-units'
import { errorMessage } from '@/lib/error-message'

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED_JURUSAN: 'Menunggu jurusan',
  SUBMITTED_FAKULTAS: 'Menunggu fakultas',
  SUBMITTED_INSTITUT: 'Menunggu institut',
  APPROVED: 'Disetujui',
  LOCKED: 'Terkunci',
  REJECTED: 'Ditolak',
}

const split = (value?: string) => (value ? value.split(',') : [])

export default function CooperationsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [tridharma, setTridharma] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    getCooperations()
      .then((data) => { setRows(data); setError(null) })
      .catch((e) => { setRows([]); setError(errorMessage(e)) })

  useEffect(() => {
    load()
    getPartners().then(setPartners).catch(() => setPartners([]))
    getScopedOrganizationalUnits().then(setUnits).catch(() => setUnits([]))
    getCooperationRegions().then(setRegions).catch(() => setRegions([]))
    getTridharmaCategories().then(setTridharma).catch(() => setTridharma([]))
  }, [])

  return (
    <ModulePage
      title="Kerja sama"
      description="Kelola kerja sama, prodi terlibat, tridharma, dan wilayah."
      error={error}
      fields={[
        { name: 'name', label: 'Nama kerja sama', required: true },
        { name: 'partnerId', label: 'Mitra', options: partners.map((x) => ({ label: x.name, value: x.id })), required: true },
        { name: 'organizationalUnitId', label: 'Unit organisasi', options: units.map((x) => ({ label: `${x.name} (${x.type})`, value: x.id })), required: true },
        { name: 'regionId', label: 'Wilayah', options: regions.map((x) => ({ label: x.name, value: x.id })) },
        { name: 'startDate', label: 'Tanggal mulai', type: 'date' },
        { name: 'endDate', label: 'Tanggal berakhir', type: 'date' },
        { name: 'cpDiPks', label: 'Kontak di PKS' },
        { name: 'studyProgramIds', label: 'Program studi terlibat', multiple: true, options: units.filter((x) => x.type === 'STUDY_PROGRAM').map((x) => ({ label: x.name, value: x.id })) },
        { name: 'tridharmaCategoryIds', label: 'Kategori tridharma', multiple: true, options: tridharma.map((x) => ({ label: x.name, value: x.id })) },
      ]}
      onSubmit={async (data) => {
        const r = await createCooperation({
          name: data.name,
          partnerId: data.partnerId,
          organizationalUnitId: data.organizationalUnitId,
          regionId: data.regionId || undefined,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          cpDiPks: data.cpDiPks || undefined,
          studyProgramIds: split(data.studyProgramIds),
          tridharmaCategoryIds: split(data.tridharmaCategoryIds),
        })
        await load()
        return r
      }}
    >
      {rows.length > 0 ? (
        <DataTable
          columns={['Nama', 'Mitra', 'Periode', 'Status', 'Wilayah', 'Aksi']}
          rows={rows.map((row) => ({
            Nama: row.name,
            Mitra: row.partner?.name ?? '-',
            Periode: `${row.startDate ? new Date(row.startDate).toLocaleDateString('id-ID') : '-'} – ${row.endDate ? new Date(row.endDate).toLocaleDateString('id-ID') : '-'}`,
            Status: statusLabel[row.status] ?? row.status,
            Wilayah: row.region?.name ?? '-',
            Aksi: (
              <span className="flex gap-3">
                <Link className="font-semibold text-[#087f72]" href={`/cooperations/${row.id}`}>
                  Detail
                </Link>
                <Link className="font-semibold text-[#087f72]" href={`/cooperations/${row.id}/documents`}>
                  Dokumen
                </Link>
              </span>
            ),
          }))}
        />
      ) : (
        !error && <EmptyState text="Belum ada kerja sama dalam scope Anda." />
      )}
    </ModulePage>
  )
}
