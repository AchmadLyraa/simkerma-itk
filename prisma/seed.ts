import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from './generated/client'
import { adapter } from './adapter-pg'
import { hashPassword } from '../lib/password'

const prisma = new PrismaClient({ adapter })

type UnitJson = {
  institution: {
    faculties: {
      name: string
      departments: {
        name: string
        programs: { name: string }[]
      }[]
    }[]
  }
}

type UnitType = 'FACULTY' | 'DEPARTMENT' | 'STUDY_PROGRAM'

// Cari unit dengan nama, tipe, dan parent yang sama. Buat jika belum ada.
async function ensureUnit(name: string, type: UnitType, parentId: string) {
  const existing = await prisma.organizationalUnit.findFirst({
    where: { name, type, parentId },
    select: { id: true },
  })
  if (existing) return { id: existing.id, created: false }
  const row = await prisma.organizationalUnit.create({
    data: { name, type, parentId },
    select: { id: true },
  })
  return { id: row.id, created: true }
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@simkerma.test').trim().toLowerCase()
  // const password = process.env.SEED_ADMIN_PASSWORD
  // if (!password || password.length < 8) throw new Error('Isi SEED_ADMIN_PASSWORD (minimal 8 karakter) di .env')

  for (const name of ['SUPER_ADMIN', 'PENGELOLA_INSTITUT', 'PENGELOLA_FAKULTAS', 'PENGELOLA_JURUSAN', 'PENGELOLA_PRODI'] as const) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } })
  }
  for (const name of ['LOKAL', 'NASIONAL', 'INTERNASIONAL'] as const) {
    await prisma.cooperationRegion.upsert({ where: { name }, update: {}, create: { name } })
  }
  for (const name of ['Pendidikan', 'Penelitian', 'Pengabdian kepada Masyarakat']) {
    await prisma.tridharmaCategory.upsert({ where: { name }, update: {}, create: { name } })
  }
  for (const name of ['Industri', 'Perguruan Tinggi', 'Instansi Pemerintah', 'Lembaga Penelitian', 'Organisasi Nirlaba']) {
    await prisma.partnerCategory.upsert({ where: { name }, update: {}, create: { name } })
  }

  const root =
    (await prisma.organizationalUnit.findFirst({ where: { type: 'INSTITUTION', parentId: null } })) ??
    (await prisma.organizationalUnit.create({
      data: { name: process.env.SEED_INSTITUTION_NAME ?? 'Institut Teknologi Kalimantan', type: 'INSTITUTION' },
    }))

  const raw = readFileSync(
    join(process.cwd(), 'prisma', 'data', 'organizational-units.json'),
    'utf-8',
  )
  const units = JSON.parse(raw) as UnitJson
  let createdCount = 0

  for (const faculty of units.institution.faculties) {
    const f = await ensureUnit(faculty.name, 'FACULTY', root.id)
    if (f.created) createdCount++
    for (const department of faculty.departments) {
      const d = await ensureUnit(department.name, 'DEPARTMENT', f.id)
      if (d.created) createdCount++
      for (const program of department.programs) {
        const p = await ensureUnit(program.name, 'STUDY_PROGRAM', d.id)
        if (p.created) createdCount++
      }
    }
  }
  console.log(`Unit organisasi: ${createdCount} unit baru dibuat.`)

  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password || password.length < 8) throw new Error('Isi SEED_ADMIN_PASSWORD (minimal 8 karakter) di .env')

  // Hapus admin lama (kalau ada). UserRole dan UserOrganizationalUnit ikut terhapus lewat cascade.
  const removed = await prisma.user.deleteMany({ where: { email } })
  if (removed.count > 0) console.log(`Admin lama ${email} dihapus, dibuat ulang.`)

  const admin = await prisma.user.create({
    data: { name: 'Super Admin', email, passwordHash: await hashPassword(password) },
  })
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } })
  await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } })
  await prisma.userOrganizationalUnit.create({ data: { userId: admin.id, organizationalUnitId: root.id } })
  console.log(`Seed selesai. Admin: ${email}, unit root: ${root.name}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
