'use client'
import { useEffect, useState } from 'react'
import { changeOwnPassword, getCurrentUser } from '@/app/actions/auth'
import { ModulePage } from '@/components/module-page'

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  PENGELOLA_INSTITUT: 'Pengelola institut',
  PENGELOLA_FAKULTAS: 'Pengelola fakultas',
  PENGELOLA_JURUSAN: 'Pengelola jurusan',
  PENGELOLA_PRODI: 'Pengelola prodi',
}

export default function AccountPage() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => { getCurrentUser().then(setUser).catch(() => setUser(null)) }, [])

  return (
    <ModulePage
      title="Akun saya"
      description="Informasi akun dan keamanan."
      actionLabel="Ganti password"
      fields={[
        { name: 'current', label: 'Password saat ini', type: 'password', required: true },
        { name: 'next', label: 'Password baru (minimal 8 karakter)', type: 'password', required: true },
        { name: 'confirm', label: 'Ulangi password baru', type: 'password', required: true },
      ]}
      onSubmit={async (d) => {
        if (d.next !== d.confirm) return { ok: false, error: 'Konfirmasi password tidak sama' }
        const r = await changeOwnPassword(d.current, d.next)
        if (r.ok) setDone(true)
        return r
      }}
    >
      {done && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password berhasil diganti.</p>}
      <div className="grid gap-5 rounded-xl border bg-white p-5 sm:grid-cols-3">
        <div><p className="text-xs text-slate-500">Nama</p><p className="mt-1 text-sm font-medium">{user?.name ?? '-'}</p></div>
        <div><p className="text-xs text-slate-500">Email</p><p className="mt-1 text-sm font-medium">{user?.email ?? '-'}</p></div>
        <div><p className="text-xs text-slate-500">Role</p><p className="mt-1 text-sm font-medium">{user ? roleLabel[user.role] ?? user.role : '-'}</p></div>
      </div>
    </ModulePage>
  )
}
