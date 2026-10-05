'use client'
import { useEffect, useState } from 'react'
import { ActionModal, DataTable, EmptyState, ModulePage, type FormField } from '@/components/module-page'
import { addPartner, getPartnerCategories, getPartners, removePartner, updatePartner } from '@/app/actions/partners'
import { addPartnerContact, deletePartnerContact, updatePartnerContact } from '@/app/actions/partner-contacts'
import { errorMessage } from '@/lib/error-message'

type ModalState = {
  title: string
  fields: FormField[]
  initialValues?: Record<string, string>
  submitLabel?: string
  submit: (data: Record<string, string>) => Promise<unknown>
}

const contactFields: FormField[] = [
  { name: 'name', label: 'Nama kontak', required: true },
  { name: 'position', label: 'Jabatan' },
  { name: 'phone', label: 'Telepon' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'isPrimary', label: 'Kontak utama', options: [{ label: 'Ya', value: 'true' }, { label: 'Tidak', value: 'false' }] },
]

export default function PartnersPage() {
  const [rows, setRows] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [modal, setModal] = useState<ModalState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    getPartners()
      .then((data) => { setRows(data); setError(null) })
      .catch((e) => { setRows([]); setError(errorMessage(e)) })

  // Muat ulang daftar, lalu teruskan hasil action ke modal (modal yang menampilkan error).
  const done = async (result: unknown) => { await load(); return result }

  useEffect(() => {
    load()
    getPartnerCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const partnerFields: FormField[] = [
    { name: 'name', label: 'Nama mitra', required: true },
    { name: 'categoryId', label: 'Kategori mitra', options: categories.map((x) => ({ label: x.name, value: x.id })), required: true },
    { name: 'address', label: 'Alamat' },
    { name: 'website', label: 'Website' },
  ]

  return (
    <>
      <ModulePage
        title="Mitra & kontak"
        description="Kelola mitra dan kontak dalam scope unit organisasi Anda."
        error={error}
        fields={partnerFields}
        onSubmit={async (data) =>
          done(await addPartner({ name: data.name, categoryId: data.categoryId, address: data.address || undefined, website: data.website || undefined }))
        }
      >
        {rows.length > 0 ? (
          <DataTable
            columns={['Mitra', 'Kategori', 'Unit organisasi', 'Status', 'Aksi', 'Kontak']}
            rows={rows.map((row) => ({
              Mitra: row.name,
              Kategori: row.category?.name ?? '-',
              'Unit organisasi': row.organizationalUnit?.name ?? '-',
              Status: row.isActive ? 'Aktif' : 'Nonaktif',
              Aksi: (
                <div className="flex gap-3">
                  <button
                    className="font-semibold text-[#087f72]"
                    onClick={() => setModal({
                      title: `Ubah mitra: ${row.name}`,
                      fields: partnerFields,
                      initialValues: { name: row.name, categoryId: row.categoryId, address: row.address ?? '', website: row.website ?? '' },
                      submit: async (d) => done(await updatePartner(row.id, { name: d.name, categoryId: d.categoryId, address: d.address, website: d.website })),
                    })}
                  >
                    Ubah
                  </button>
                  <button
                    className="font-semibold text-red-600"
                    onClick={() => setModal({
                      title: `Nonaktifkan mitra "${row.name}"?`,
                      submitLabel: 'Nonaktifkan',
                      fields: [],
                      submit: async () => done(await removePartner(row.id)),
                    })}
                  >
                    Nonaktifkan
                  </button>
                </div>
              ),
              Kontak: (
                <div className="space-y-1">
                  {row.contacts.map((contact: any) => (
                    <div key={contact.id} className="flex flex-wrap items-center gap-x-2">
                      <span>{contact.name}{contact.position ? ` (${contact.position})` : ''}{contact.isPrimary ? ' ★' : ''}</span>
                      <button
                        className="text-xs font-semibold text-[#087f72]"
                        onClick={() => setModal({
                          title: `Ubah kontak: ${contact.name}`,
                          fields: contactFields,
                          initialValues: { name: contact.name, position: contact.position ?? '', phone: contact.phone ?? '', email: contact.email ?? '', isPrimary: String(contact.isPrimary) },
                          submit: async (d) => done(await updatePartnerContact(contact.id, { name: d.name, position: d.position, phone: d.phone, email: d.email, isPrimary: d.isPrimary === 'true' })),
                        })}
                      >
                        Ubah
                      </button>
                      <button
                        className="text-xs font-semibold text-red-600"
                        onClick={() => setModal({
                          title: `Hapus kontak "${contact.name}"?`,
                          submitLabel: 'Hapus',
                          fields: [],
                          submit: async () => done(await deletePartnerContact(contact.id)),
                        })}
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                  <button
                    className="text-xs font-semibold text-[#087f72]"
                    onClick={() => setModal({
                      title: `Tambah kontak untuk ${row.name}`,
                      fields: contactFields,
                      submit: async (d) => done(await addPartnerContact(row.id, { name: d.name, position: d.position || undefined, phone: d.phone || undefined, email: d.email || undefined, isPrimary: d.isPrimary === 'true' })),
                    })}
                  >
                    + Kontak
                  </button>
                </div>
              ),
            }))}
          />
        ) : (
          !error && <EmptyState text="Belum ada mitra dalam scope Anda." />
        )}
      </ModulePage>
      {modal && <ActionModal title={modal.title} fields={modal.fields} initialValues={modal.initialValues} submitLabel={modal.submitLabel} onSubmit={modal.submit} onClose={() => setModal(null)} />}
    </>
  )
}
