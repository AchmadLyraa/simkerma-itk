'use client'

import { useEffect, useMemo, useState } from 'react'
import { getDashboardSummary } from '@/app/actions/dashboard'
import { Building2, ClipboardCheck, FileText, Search, ShieldCheck, Users } from 'lucide-react'

type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>

type PartnerRow = {
  id: string
  name: string
  category?: { name: string } | null
  type?: string | null
  contacts?: { name: string }[]
  isActive: boolean
  updatedAt: Date | string
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED_JURUSAN: 'Menunggu review',
  SUBMITTED_FAKULTAS: 'Menunggu review',
  SUBMITTED_INSTITUT: 'Menunggu review',
  APPROVED: 'Disetujui',
  LOCKED: 'Terkunci',
}

function StatusBadge({ status }: { status: string }) {
  const label = statusLabel[status] ?? status
  const styles = label === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : label === 'Draft' ? 'bg-slate-100 text-slate-600 ring-slate-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles}`}><span className="size-1.5 rounded-full bg-current" />{label}</span>
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getDashboardSummary().then((data) => { if (active) setSummary(data) }).catch(() => { if (active) setError('Data dashboard tidak dapat dimuat.') })
    return () => { active = false }
  }, [])

  const partners = useMemo(() => {
    const rows = (summary?.recentPartners ?? []) as unknown as PartnerRow[]
    const normalized = query.trim().toLowerCase()
    return rows.filter((partner) => !normalized || partner.name.toLowerCase().includes(normalized) || (partner.category?.name ?? '').toLowerCase().includes(normalized))
  }, [summary, query])

  if (error) return <main className="grid min-h-screen place-items-center bg-[#f5f7fa] p-6 text-sm text-red-700">{error}</main>
  if (!summary) return <main className="grid min-h-screen place-items-center bg-[#f5f7fa] p-6 text-sm text-slate-500">Memuat ringkasan...</main>

  const cards = [
    { label: 'Total mitra', value: summary.partners, icon: Building2 },
    { label: 'Kerja sama', value: summary.cooperations, icon: ShieldCheck },
    { label: 'Menunggu approval', value: summary.pending, icon: ClipboardCheck },
    { label: 'Kegiatan', value: summary.activities, icon: Users },
  ]

  return <div className="min-h-screen bg-[#f5f7fa] text-[#172b4d]"><div className=""><main className="mx-auto max-w-[1400px] px-6 py-8 sm:px-10"><div className="mb-8"><p className="mb-2 text-sm font-medium text-[#35a99a]">Data aktual dari database</p><h2 className="text-2xl font-bold tracking-tight text-[#172b4d]">Pantau kerja sama fakultas</h2><p className="mt-1 text-sm text-[#718096]">Mitra, approval, kegiatan, dan masa berlaku dalam scope organisasi Anda.</p></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-[#e4eaf0] bg-white p-5"><div className="flex items-start justify-between"><p className="text-sm font-medium text-[#718096]">{label}</p><div className="rounded-lg bg-[#e8f6f4] p-2 text-[#087f72]"><Icon size={17} /></div></div><p className="mt-4 text-3xl font-bold text-[#172b4d]">{value}</p></div>)}</section><div className="mt-7 grid gap-6 xl:grid-cols-2"><section className="rounded-xl border border-[#e4eaf0] bg-white"><div className="border-b border-[#edf0f3] px-5 py-4"><h3 className="font-bold text-[#172b4d]">Approval menunggu</h3><p className="mt-1 text-xs text-[#718096]">Dihasilkan dari agregasi status kerja sama.</p></div><div className="divide-y divide-[#edf0f3]">{summary.pendingItems.map((item: { id: string; name: string; status: string }) => <div className="flex items-center gap-4 px-5 py-4" key={item.id}><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf7f5] text-[#087f72]"><FileText size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#253858]">{item.name}</p><p className="mt-1 text-xs text-[#718096]">{item.status}</p></div><StatusBadge status={item.status} /></div>)}{summary.pendingItems.length === 0 && <p className="p-5 text-sm text-slate-500">Tidak ada approval menunggu.</p>}</div></section><section className="rounded-xl border border-[#e4eaf0] bg-white"><div className="border-b border-[#edf0f3] px-5 py-4"><h3 className="font-bold text-[#172b4d]">Expiring soon</h3><p className="mt-1 text-xs text-[#718096]">Dokumen yang berakhir dalam 90 hari.</p></div><div className="divide-y divide-[#edf0f3]">{summary.expiringSoon.map((item: { id: string; name: string; endDate: Date | string | null }) => <div className="flex items-center justify-between px-5 py-4" key={item.id}><div><p className="text-sm font-semibold text-[#253858]">{item.name}</p><p className="mt-1 text-xs text-[#718096]">Berakhir {item.endDate ? formatDate(item.endDate) : '-'}</p></div><span className="text-xs font-semibold text-amber-700">Segera</span></div>)}{summary.expiringSoon.length === 0 && <p className="p-5 text-sm text-slate-500">Tidak ada dokumen mendekati masa berakhir.</p>}</div></section></div><section className="mt-7 rounded-xl border border-[#e4eaf0] bg-white"><div className="flex flex-col gap-4 border-b border-[#edf0f3] px-5 py-4 md:flex-row md:items-center md:justify-between"><div><h3 className="font-bold text-[#172b4d]">Mitra terbaru</h3><p className="mt-1 text-xs text-[#718096]">Diambil dari data mitra dalam scope Anda.</p></div><div className="relative w-full md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari mitra atau kategori" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#fafbfc] text-[11px] uppercase tracking-wider text-[#8a98a9]"><tr><th className="px-5 py-3">Nama mitra</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Kontak</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Diperbarui</th></tr></thead><tbody className="divide-y divide-[#edf0f3]">{partners.map((partner) => <tr key={partner.id}><td className="px-5 py-4 font-semibold">{partner.name}</td><td className="px-5 py-4 text-xs">{partner.category?.name ?? '-'}</td><td className="px-5 py-4 text-xs">{partner.contacts?.[0]?.name ?? '-'}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${partner.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{partner.isActive ? 'Aktif' : 'Nonaktif'}</span></td><td className="px-5 py-4 text-xs">{formatDate(partner.updatedAt)}</td></tr>)}{partners.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">Tidak ada mitra pada scope ini.</td></tr>}</tbody></table></div></section><section className="mt-7 grid gap-4 md:grid-cols-4">{[['Tahun', summary.byYear], ['Tridharma', summary.byTridharma], ['Wilayah', summary.byRegion], ['Kategori mitra', summary.byCategory]].map(([label, values]) => <div key={label as string} className="rounded-xl border border-[#e4eaf0] bg-white p-5"><p className="text-sm font-bold">{label as string}</p><div className="mt-3 space-y-2">{(values as { name?: string; year?: number; count: number }[]).map((value) => <div className="flex justify-between text-xs" key={`${value.name ?? value.year}`}> <span>{value.name ?? value.year}</span><strong>{value.count}</strong></div>)}</div></div>)}</section></main></div></div>
}
