'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { createSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

// Urutan prioritas jika satu user punya beberapa role.
const ROLE_PRIORITY = ['SUPER_ADMIN', 'PENGELOLA_INSTITUT', 'PENGELOLA_FAKULTAS', 'PENGELOLA_JURUSAN', 'PENGELOLA_PRODI'] as const

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, isActive: true } })
  const valid = user && user.isActive && (await verifyPassword(password, user.passwordHash))
  if (!user || !valid) redirect('/login?error=1')
  const cookieJar = await cookies()
  cookieJar.set(SESSION_COOKIE, await createSessionToken(user.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  redirect('/')
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return null
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      roles: { select: { role: { select: { name: true } } } },
      scopes: { select: { organizationalUnitId: true } },
    },
  })
  if (!user || !user.isActive) return null
  const names: string[] = user.roles.map((r) => r.role.name)
  const role = ROLE_PRIORITY.find((r) => names.includes(r))
  if (!role) return null
  return { id: user.id, email: user.email, name: user.name, role, organizationalUnitId: user.scopes[0]?.organizationalUnitId ?? null }
}

export async function signOut() {
  const cookieJar = await cookies()
  cookieJar.delete(SESSION_COOKIE)
  redirect('/login')
}
