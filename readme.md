# SIMKERMA

Cooperation management system for a university. It manages partners,
cooperations, multi-level approval, documents, activities, participants,
organizational units, users, role-based access, and an audit log.

## Stack

- Next.js 16 (App Router) and React 19
- TypeScript
- Prisma 7 with PostgreSQL
- Tailwind CSS v4
- S3-compatible object storage for uploaded documents (optional)

## Requirements

- Node.js 20.9 or newer
- pnpm
- A running PostgreSQL database (local or hosted)
- An S3-compatible bucket, only if you want file upload (link documents work without it)

## Setup

### 1. Install pnpm

```bash
npm install -g pnpm
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Create the database

Create an empty PostgreSQL database, for example:

```bash
createdb simkerma
```

### 4. Configure environment variables

Create a file named `.env` in the project root:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/simkerma"

# Session signing secret. Must be at least 32 characters.
# Generate one with: openssl rand -base64 48
NEXTAUTH_SECRET="replace-with-a-long-random-string"

# First super admin account, created by the seed
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="choose-a-password-of-8-or-more-characters"
SEED_INSTITUTION_NAME="Institut Teknologi Kalimantan"

# Object storage (only needed for file upload)
S3_ENDPOINT_URL="https://sgp1.digitaloceanspaces.com"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_BUCKET="your-bucket-name"
S3_REGION="sgp1"
```

Notes:
- `DATABASE_URL`, `NEXTAUTH_SECRET`, and `SEED_ADMIN_PASSWORD` are required.
- `SEED_ADMIN_EMAIL` defaults to `admin@simkerma.test` if omitted.
- `S3_ENDPOINT_URL` must not include the bucket name.
- Never commit `.env`.

### 5. Generate the Prisma client

```bash
pnpm prisma:generate
```

Run this again whenever `prisma/schema.prisma` changes.

### 6. Create the database tables

```bash
pnpm exec prisma db push
```

This project does not use migration files. Do not run `db:reset` on a
database that contains data, because it deletes everything.

### 7. Seed initial data

```bash
pnpm prisma:seed
```

The seed creates:
- the five roles (SUPER_ADMIN, PENGELOLA_INSTITUT, PENGELOLA_FAKULTAS,
  PENGELOLA_JURUSAN, PENGELOLA_PRODI)
- cooperation regions and tridharma categories
- partner categories
- the root institution unit
- the super admin account from your `.env`

It is safe to run again, with one exception: the super admin account is
deleted and recreated every time, using the password currently in `.env`.
If that admin already created cooperations, documents, or approvals, the
delete is refused by the database and the seed fails.

### 8. Build and start

For production:

```bash
pnpm build
pnpm start
```

For development with hot reload:

```bash
pnpm dev
```

The app runs at http://localhost:3000. Log in with the admin email and
password from your `.env`.

## First steps after logging in

1. Open "Unit organisasi" and create the structure:
   Institution, then Faculty, then Department, then Study Program.
   Each unit must have a parent of the type directly above it.
2. Open "Pengguna" and create users. The role must match the unit type:
   - PENGELOLA_INSTITUT: Institution
   - PENGELOLA_FAKULTAS: Faculty
   - PENGELOLA_JURUSAN: Department
   - PENGELOLA_PRODI: Study Program
3. Each manager logs in, adds partners, and creates cooperations.

## Approval flow

A cooperation is submitted to the level directly above its creator.
Each approval moves it up one level.

```
Study Program -> Department -> Faculty -> Institute -> APPROVED
```

- A rejection requires a reason and sets the status to REJECTED.
- The creator can reopen a rejected cooperation, edit it, and submit again.
- Nobody can approve or reject a cooperation they created (super admin excepted).

## Useful commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm prisma:generate` | Generate the Prisma client |
| `pnpm prisma:studio` | Open a web UI to browse the database |
| `pnpm prisma:seed` | Run the seed |
| `pnpm exec tsc --noEmit` | Type check |
| `pnpm lint` | Lint |

## Troubleshooting

- `Cannot find module '@/prisma/generated/client'`: run `pnpm prisma:generate`.
- `relation "..." does not exist`: run `pnpm exec prisma db push`.
- `NEXTAUTH_SECRET wajib diisi`: the secret is missing or shorter than 32 characters.
- Seed says `Isi SEED_ADMIN_PASSWORD`: set it in `.env` (8 or more characters).
- Login redirects back to `/login`: the cookie is signed with `NEXTAUTH_SECRET`;
  changing the secret logs everyone out.
- Upload fails: check the S3 variables, that the endpoint has no bucket name in it,
  and that the access key has write permission.
- Files larger than 10 MB, or types other than PDF, Word, PNG, and JPG, are rejected.
