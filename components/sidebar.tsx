'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, ClipboardCheck, FileText, LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

const ALL = ['SUPER_ADMIN', 'PENGELOLA_INSTITUT', 'PENGELOLA_FAKULTAS', 'PENGELOLA_JURUSAN', 'PENGELOLA_PRODI']
const APPROVERS = ['SUPER_ADMIN', 'PENGELOLA_INSTITUT', 'PENGELOLA_FAKULTAS', 'PENGELOLA_JURUSAN']

const links = [
  { href: '/', label: 'Ringkasan', icon: LayoutDashboard, roles: ALL },
  { href: '/partners', label: 'Mitra & kontak', icon: Users, roles: ALL },
  { href: '/cooperations', label: 'Kerja sama', icon: ShieldCheck, roles: ALL },
  { href: '/approvals', label: 'Approval', icon: ClipboardCheck, roles: APPROVERS },
  { href: '/organizational-units', label: 'Unit organisasi', icon: Building2, roles: ['SUPER_ADMIN'] },
  { href: '/users', label: 'Pengguna', icon: Users, roles: ['SUPER_ADMIN'] },
  { href: '/audit-logs', label: 'Audit log', icon: FileText, roles: ALL },
]

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  PENGELOLA_INSTITUT: 'Pengelola institut',
  PENGELOLA_FAKULTAS: 'Pengelola fakultas',
  PENGELOLA_JURUSAN: 'Pengelola jurusan',
  PENGELOLA_PRODI: 'Pengelola prodi',
}

export function Sidebar({ user }: { user: { name: string; email: string; role: string; unitName: string | null } }) {
  const pathname = usePathname()
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`))
  const initials = user.name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col bg-[#102a43] text-slate-300">
      <div className="flex h-[78px] items-center gap-3 border-b border-white/10 px-7">
        <div className="grid size-9 place-items-center rounded-xl bg-[#35b8a5] text-white"><Building2 size={19} /></div>
        <div>
          <p className="text-sm font-bold tracking-wide text-white">SIMKERMA</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">ITK</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 pt-7">
        <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Menu utama</p>
        {links.filter((l) => l.roles.includes(user.role)).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive(href) ? 'bg-white/10 font-medium text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon size={18} />{label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        <Link href="/account" aria-current={isActive('/account') ? 'page' : undefined} className="flex items-center gap-3 rounded-lg p-1 hover:bg-white/10">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d5f3ed] text-xs font-bold text-[#087f72]">{initials}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        </Link>
        <p className="mt-3 text-xs font-semibold text-[#35b8a5]">{roleLabel[user.role] ?? user.role}</p>
        <p className="truncate text-xs text-slate-400">{user.unitName ?? 'Tanpa unit'}</p>
        <form action={signOut} className="mt-3">
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/10 hover:text-white">
            <LogOut size={18} />Keluar
          </button>
        </form>
      </div>
    </aside>
  )
}
