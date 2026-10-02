'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, ClipboardCheck, FileText, LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

const links = [
  { href: '/', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/partners', label: 'Mitra & kontak', icon: Users },
  { href: '/cooperations', label: 'Kerja sama', icon: ShieldCheck },
  { href: '/approvals', label: 'Approval', icon: ClipboardCheck },
  { href: '/organizational-units', label: 'Unit organisasi', icon: Building2 },
  { href: '/users', label: 'Pengguna', icon: Users },
  { href: '/audit-logs', label: 'Audit log', icon: FileText },
]

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  PENGELOLA_INSTITUT: 'Pengelola institut',
  PENGELOLA_FAKULTAS: 'Pengelola fakultas',
  PENGELOLA_JURUSAN: 'Pengelola jurusan',
  PENGELOLA_PRODI: 'Pengelola prodi',
}

export function Sidebar({ user }: { user: { name: string; role: string } }) {
  const pathname = usePathname()
  const initials = user.name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`))

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col bg-[#102a43] text-slate-300">
      <div className="flex h-[78px] items-center gap-3 border-b border-white/10 px-7">
        <div className="grid size-9 place-items-center rounded-xl bg-[#35b8a5] text-white"><Building2 size={19} /></div>
        <div>
          <p className="text-sm font-bold tracking-wide text-white">SIMKERMA</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Universitas Nusantara</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 pt-7">
        <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Menu utama</p>
        {links.map(({ href, label, icon: Icon }) => (
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
      <div className="flex items-center gap-3 border-t border-white/10 px-7 py-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d5f3ed] text-xs font-bold text-[#087f72]">{initials}</div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{user.name}</p>
          <p className="truncate text-[10px] text-slate-400">{roleLabel[user.role] ?? user.role}</p>
        </div>
      </div>
      <form action={signOut} className="border-t border-white/10 p-4">
        <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/10 hover:text-white">
          <LogOut size={18} />Keluar
        </button>
      </form>
    </aside>
  )
}
