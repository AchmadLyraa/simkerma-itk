'use client'
import { useEffect, useState } from 'react'
import { ActionModal, DataTable, EmptyState, ModulePage } from '@/components/module-page'
import { assignUserScope, createUser, getUsers, removeUserScope, resetUserPassword, setUserActive } from '@/app/actions/users'
import { getOrganizationalUnits } from '@/app/actions/organizational-units'
import { errorMessage } from '@/lib/error-message'

const roles = ['SUPER_ADMIN', 'PENGELOLA_INSTITUT', 'PENGELOLA_FAKULTAS', 'PENGELOLA_JURUSAN', 'PENGELOLA_PRODI']

export default function UsersPage() {
  const [rows, setRows] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<any>(null)

  const load = () =>
    getUsers()
      .then((data) => { setRows(data); setError(null) })
      .catch((e) => { setRows([]); setError(errorMessage(e)) })

  useEffect(() => {
    load()
    getOrganizationalUnits().then(setUnits).catch(() => setUnits([]))
  }, [])

  const unitOptions = units.map((x) => ({ label: `${x.name} (${x.type})`, value: x.id }))

  return (
    <>
      <ModulePage
        title="Manajemen pengguna"
        description="Admin membuat pengguna, mengatur role, scope unit organisasi, dan status akun."
        actionLabel="Tambah pengguna"
        error={error}
        fields={[
          { name: 'name', label: 'Nama lengkap', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'password', label: 'Password awal (minimal 8 karakter)', type: 'password', required: true },
          { name: 'role', label: 'Role', options: roles, required: true },
          { name: 'organizationalUnitId', label: 'Unit scope', options: unitOptions, required: true },
        ]}
        onSubmit={async (data) => {
          await createUser({
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role as any,
            organizationalUnitId: data.organizationalUnitId,
          })
          await load()
        }}
      >
        {rows.length > 0 ? (
          <DataTable
            columns={['Nama', 'Email', 'Status', 'Role', 'Scope', 'Aksi']}
            rows={rows.map((user) => ({
              Nama: user.name,
              Email: user.email,
              Status: user.isActive ? 'Aktif' : 'Nonaktif',
              Role: user.roles.map((x: any) => x.role.name).join(', ') || '-',
              Scope: user.scopes.map((x: any) => x.organizationalUnit.name).join(', ') || '-',
              Aksi: (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <button
                    className="font-semibold text-[#087f72]"
                    onClick={() => setModal({
                      title: `Role & scope: ${user.name}`,
                      fields: [
                        { name: 'role', label: 'Role', options: roles, required: true },
                        { name: 'organizationalUnitId', label: 'Unit scope', options: unitOptions, required: true },
                      ],
                      submit: async (d: Record<string, string>) => {
                        await assignUserScope({ userId: user.id, role: d.role as any, organizationalUnitId: d.organizationalUnitId })
                        await load()
                      },
                    })}
                  >
                    Role &amp; scope
                  </button>
                  <button
                    className="font-semibold text-[#087f72]"
                    onClick={() => setModal({
                      title: `Reset password: ${user.name}`,
                      fields: [{ name: 'password', label: 'Password baru (minimal 8 karakter)', type: 'password', required: true }],
                      submit: async (d: Record<string, string>) => { await resetUserPassword(user.id, d.password) },
                    })}
                  >
                    Reset password
                  </button>
                  <button
                    className="font-semibold text-red-600"
                    onClick={() => setModal({
                      title: `${user.isActive ? 'Nonaktifkan' : 'Aktifkan'} ${user.name}?`,
                      submitLabel: user.isActive ? 'Nonaktifkan' : 'Aktifkan',
                      fields: [],
                      submit: async () => { await setUserActive(user.id, !user.isActive); await load() },
                    })}
                  >
                    {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  {user.scopes.map((x: any) => (
                    <button
                      key={x.organizationalUnitId}
                      className="text-red-600"
                      onClick={() => setModal({
                        title: `Cabut scope ${x.organizationalUnit.name} dari ${user.name}?`,
                        submitLabel: 'Cabut',
                        fields: [],
                        submit: async () => { await removeUserScope(user.id, x.organizationalUnitId); await load() },
                      })}
                    >
                      Cabut {x.organizationalUnit.name}
                    </button>
                  ))}
                </div>
              ),
            }))}
          />
        ) : (
          !error && <EmptyState text="Belum ada pengguna untuk dikelola." />
        )}
      </ModulePage>
      {modal && <ActionModal title={modal.title} fields={modal.fields} submitLabel={modal.submitLabel} onSubmit={modal.submit} onClose={() => setModal(null)} />}
    </>
  )
}
