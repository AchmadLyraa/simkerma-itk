'use client'
import { useEffect, useState } from 'react'
import { ActionModal, DataTable, EmptyState, ModulePage, type FormField } from '@/components/module-page'
import { createOrganizationalUnit, deleteOrganizationalUnit, getOrganizationalUnits, updateOrganizationalUnit } from '@/app/actions/organizational-units'
import { errorMessage } from '@/lib/error-message'

type UnitType = 'INSTITUTION' | 'FACULTY' | 'DEPARTMENT' | 'STUDY_PROGRAM'
type ModalState = { title: string; fields: FormField[]; initialValues?: Record<string, string>; submitLabel?: string; submit: (data: Record<string, string>) => Promise<unknown> }

const types: UnitType[] = ['INSTITUTION', 'FACULTY', 'DEPARTMENT', 'STUDY_PROGRAM']

export default function OrganizationalUnitsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [modal, setModal] = useState<ModalState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    getOrganizationalUnits()
      .then((data) => { setRows(data); setError(null) })
      .catch((e) => { setRows([]); setError(errorMessage(e)) })

  const done = async (result: unknown) => { await load(); return result }

  useEffect(() => { load() }, [])

  const parentOptions = (excludeId?: string) => [
    { label: 'Tanpa parent', value: '' },
    ...rows.filter((x) => x.id !== excludeId).map((x) => ({ label: `${x.name} (${x.type})`, value: x.id })),
  ]
  const unitFields = (excludeId?: string): FormField[] => [
    { name: 'name', label: 'Nama unit', required: true },
    { name: 'type', label: 'Tipe unit', options: types, required: true },
    { name: 'parentId', label: 'Parent unit', options: parentOptions(excludeId) },
  ]

  return (
    <>
      <ModulePage
        title="Unit organisasi"
        description="Admin mengelola struktur organisasi."
        error={error}
        fields={unitFields()}
        onSubmit={async (data) =>
          done(await createOrganizationalUnit({ name: data.name, type: data.type as UnitType, parentId: data.parentId || undefined }))
        }
      >
        {rows.length > 0 ? (
          <DataTable
            columns={['Nama unit', 'Tipe', 'Parent', 'Aksi']}
            rows={rows.map((row) => ({
              'Nama unit': row.name,
              Tipe: row.type,
              Parent: row.parent?.name ?? '-',
              Aksi: (
                <div className="flex gap-3">
                  <button
                    className="font-semibold text-[#087f72]"
                    onClick={() => setModal({
                      title: `Ubah unit: ${row.name}`,
                      fields: unitFields(row.id),
                      initialValues: { name: row.name, type: row.type, parentId: row.parentId ?? '' },
                      submit: async (d) => done(await updateOrganizationalUnit(row.id, { name: d.name, type: d.type as UnitType, parentId: d.parentId || null })),
                    })}
                  >
                    Ubah
                  </button>
                  <button
                    className="font-semibold text-red-600"
                    onClick={() => setModal({
                      title: `Hapus unit "${row.name}"?`,
                      submitLabel: 'Hapus',
                      fields: [],
                      submit: async () => done(await deleteOrganizationalUnit(row.id)),
                    })}
                  >
                    Hapus
                  </button>
                </div>
              ),
            }))}
          />
        ) : (
          !error && <EmptyState text="Belum ada unit organisasi." />
        )}
      </ModulePage>
      {modal && <ActionModal title={modal.title} fields={modal.fields} initialValues={modal.initialValues} submitLabel={modal.submitLabel} onSubmit={modal.submit} onClose={() => setModal(null)} />}
    </>
  )
}
