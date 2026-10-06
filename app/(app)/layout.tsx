import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/sidebar'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const unit = user.organizationalUnitId
    ? await prisma.organizationalUnit.findUnique({ where: { id: user.organizationalUnitId }, select: { name: true } })
    : null
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Sidebar user={{ name: user.name, email: user.email, role: user.role, unitName: unit?.name ?? null }} />
      <div className="min-w-0 pl-[248px]">{children}</div>
    </div>
  )
}
