import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/auth'
import { Sidebar } from '@/components/sidebar'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Sidebar user={{ name: user.name, role: user.role }} />
      <div className="min-w-0 pl-[248px]">{children}</div>
    </div>
  )
}
