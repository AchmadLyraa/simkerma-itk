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

export async function setUserRoleScope(input: { userId: string; role: RoleName; organizationalUnitId: string }) {
  return safe(async () => {
    const scope = await requireAdmin()
    if (input.userId === scope.userId) throw new Error('Tidak dapat mengubah role atau scope akun sendiri')
    if (!ROLES.includes(input.role)) throw new Error('Role tidak valid')
    const [user, role, unit] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, roles: { select: { role: { select: { name: true } } } }, scopes: { select: { organizationalUnitId: true } } } }),
      prisma.role.findUnique({ where: { name: input.role } }),
      prisma.organizationalUnit.findUnique({ where: { id: input.organizationalUnitId } }),
    ])
    if (!user || !role || !unit) throw new Error('NOT_FOUND')
    assertRoleMatchesUnit(input.role, unit.type)

    const wasAdmin = user.roles.some((r) => r.role.name === 'SUPER_ADMIN')
    if (wasAdmin && input.role !== 'SUPER_ADMIN') {
      const otherAdmins = await prisma.user.count({
        where: { id: { not: user.id }, isActive: true, roles: { some: { role: { name: 'SUPER_ADMIN' } } } },
      })
      if (otherAdmins === 0) throw new Error('Tidak dapat menurunkan super admin aktif terakhir')
    }

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: user.id } }),
      prisma.userOrganizationalUnit.deleteMany({ where: { userId: user.id } }),
      prisma.userRole.create({ data: { userId: user.id, roleId: role.id } }),
      prisma.userOrganizationalUnit.create({ data: { userId: user.id, organizationalUnitId: unit.id } }),
    ])
    await writeAuditLog({
      userId: scope.userId,
      action: 'user.set_role_scope',
      entityType: 'User',
      entityId: user.id,
      oldValue: { roles: user.roles.map((r) => r.role.name), scopes: user.scopes.map((s) => s.organizationalUnitId) },
      newValue: { role: input.role, organizationalUnitId: unit.id },
    })
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
    if (!isActive) {
      const otherAdmins = await prisma.user.count({
        where: { id: { not: userId }, isActive: true, roles: { some: { role: { name: 'SUPER_ADMIN' } } } },
      })
      const target = await prisma.user.count({ where: { id: userId, roles: { some: { role: { name: 'SUPER_ADMIN' } } } } })
      if (target > 0 && otherAdmins === 0) throw new Error('Tidak dapat menonaktifkan super admin aktif terakhir')
    }
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
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } } })
    // Password sengaja tidak masuk audit log.
    await writeAuditLog({ userId: scope.userId, action: 'user.reset_password', entityType: 'User', entityId: userId })
    revalidatePath('/users')
  })
}
