import { redirect } from 'next/navigation'
import { getCurrentUser, signIn } from '@/app/actions/auth'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  if (await getCurrentUser()) redirect('/')
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#102a43] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[#35b8a5] text-xl font-bold text-white">S</div><div><p className="font-bold tracking-wide text-[#102a43]">SIMKERMA</p><p className="text-xs text-slate-500">Institut Teknologi Kalimantan</p></div></div>
        <h1 className="text-2xl font-bold text-[#172b4d]">Masuk ke SIMKERMA</h1><p className="mt-2 text-sm text-slate-500">Kelola kerja sama fakultas secara terpusat.</p>
        {error && <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Email atau kata sandi tidak valid.</p>}
        <form action={signIn} className="mt-7 space-y-4"><label className="block text-sm font-semibold text-[#253858]">Email<input name="email" type="email" required className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-[#35b8a5]" /></label><label className="block text-sm font-semibold text-[#253858]">Kata sandi<input name="password" type="password" required className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-[#35b8a5]" /></label><button className="h-11 w-full rounded-lg bg-[#087f72] font-semibold text-white hover:bg-[#066b61]">Masuk</button></form>
      </section>
    </main>
  )
}
