'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireScope } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { hashPassword } from '@/lib/password'
import { safe } from '@/lib/error-message'

const ROLES = ['SUPER_ADMIN', 'PENGELOLA_INSTITUT', 'PENGELOLA_FAKULTAS', 'PENGELOLA_JURUSAN', 'PENGELOLA_PRODI'] as const
type RoleName = (typeof ROLES)[number]

const roleUnitType: Record<string, string> = {
  PENGELOLA_INSTITUT: 'INSTITUTION',
  PENGELOLA_FAKULTAS: 'FACULTY',
  PENGELOLA_JURUSAN: 'DEPARTMENT',
  PENGELOLA_PRODI: 'STUDY_PROGRAM',
}

function assertRoleMatchesUnit(role: string, unitType: string) {
  const expected = roleUnitType[role]
  if (expected && expected !== unitType) throw new Error('Role tidak sesuai dengan tipe unit yang dipilih')
}

async function requireAdmin() {
  const scope = await requireScope()
  if (String(scope.role) !== 'SUPER_ADMIN') throw new Error('FORBIDDEN')
  return scope
}

export async function getUsers() {
  await requireAdmin()
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      roles: { select: { role: { select: { name: true } } } },
      scopes: { select: { organizationalUnitId: true, organizationalUnit: { select: { name: true } } } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function assignUserScope(input: { userId: string; role: RoleName; organizationalUnitId: string }) {
  return safe(async () => {
    const scope = await requireAdmin()
    const [user, role, unit] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.userId } }),
      prisma.role.findUnique({ where: { name: input.role } }),
      prisma.organizationalUnit.findUnique({ where: { id: input.organizationalUnitId } }),
    ])
    if (!user || !role || !unit) throw new Error('NOT_FOUND')
    assertRoleMatchesUnit(input.role, unit.type)
    await prisma.$transaction([
      prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} }),
      prisma.userOrganizationalUnit.upsert({ where: { userId_organizationalUnitId: { userId: user.id, organizationalUnitId: unit.id } }, create: { userId: user.id, organizationalUnitId: unit.id }, update: {} }),
    ])
    await writeAuditLog({ userId: scope.userId, action: 'user.assign_scope', entityType: 'User', entityId: user.id, newValue: { role: input.role, organizationalUnitId: unit.id } })
    revalidatePath('/users')
  })
}

export async function removeUserScope(userId: string, organizationalUnitId: string) {
  return safe(async () => {
    const scope = await requireAdmin()
    if (userId === scope.userId) throw new Error('Tidak dapat mencabut scope akun sendiri')
    await prisma.userOrganizationalUnit.delete({ where: { userId_organizationalUnitId: { userId, organizationalUnitId } } })
    await writeAuditLog({ userId: scope.userId, action: 'user.revoke_scope', entityType: 'User', entityId: userId, oldValue: { organizationalUnitId } })
    revalidatePath('/users')
  })
}

export async function createUser(input: { name: string; email: string; password: string; role: RoleName; organizationalUnitId: string }) {
  return safe(async () => {
    const scope = await requireAdmin()
    const name = input.name?.trim()
    const email = input.email?.trim().toLowerCase()
    if (!name) throw new Error('Nama wajib diisi')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email tidak valid')
    if (!input.password || input.password.length < 8) throw new Error('Password minimal 8 karakter')
    if (!ROLES.includes(input.role)) throw new Error('Role tidak valid')
    const [role, unit, existing] = await Promise.all([
      prisma.role.findUnique({ where: { name: input.role } }),
      prisma.organizationalUnit.findUnique({ where: { id: input.organizationalUnitId } }),
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ])
    if (!role || !unit) throw new Error('NOT_FOUND')
    if (existing) throw new Error('Email sudah terdaftar')
    assertRoleMatchesUnit(input.role, unit.type)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(input.password),
        roles: { create: { roleId: role.id } },
        scopes: { create: { organizationalUnitId: unit.id } },
      },
      select: { id: true, name: true, email: true },
    })
    await writeAuditLog({ userId: scope.userId, action: 'user.create', entityType: 'User', entityId: user.id, newValue: { name, email, role: input.role, organizationalUnitId: unit.id } })
    revalidatePath('/users')
    return user
  })
}

export async function setUserActive(userId: string, isActive: boolean) {
  return safe(async () => {
    const scope = await requireAdmin()
    if (userId === scope.userId) throw new Error('Tidak dapat menonaktifkan akun sendiri')
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } })
    if (!existing) throw new Error('NOT_FOUND')
    await prisma.user.update({ where: { id: userId }, data: { isActive } })
    await writeAuditLog({ userId: scope.userId, action: isActive ? 'user.activate' : 'user.deactivate', entityType: 'User', entityId: userId, oldValue: { isActive: existing.isActive }, newValue: { isActive } })
    revalidatePath('/users')
  })
}

export async function resetUserPassword(userId: string, newPassword: string) {
  return safe(async () => {
    const scope = await requireAdmin()
    if (!newPassword || newPassword.length < 8) throw new Error('Password minimal 8 karakter')
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!existing) throw new Error('NOT_FOUND')
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } })
    // Password sengaja tidak masuk audit log.
    await writeAuditLog({ userId: scope.userId, action: 'user.reset_password', entityType: 'User', entityId: userId })
    revalidatePath('/users')
  })
}
