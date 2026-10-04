const messages: Record<string, string> = {
  UNAUTHORIZED: 'Sesi Anda berakhir. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak memiliki izin untuk tindakan ini.',
  FORBIDDEN_SCOPE: 'Data berada di luar scope organisasi Anda.',
  NOT_FOUND: 'Data tidak ditemukan atau berada di luar scope Anda.',
  INVALID_TRANSITION: 'Status kerja sama saat ini tidak mengizinkan tindakan ini.',
  LOCKED_STATUS: 'Kerja sama sudah diajukan dan tidak dapat diubah.',
  UNIT_IN_USE: 'Unit masih memiliki unit anak atau pengguna terkait.',
  UPLOAD_REQUIRES_OBJECT_STORAGE_INTEGRATION: 'Upload file belum tersedia. Gunakan link dokumen.',
}

const FALLBACK = 'Terjadi kesalahan. Coba lagi.'

function translate(text: string) {
  if (messages[text]) return messages[text]
  if (/prisma|Invalid `/i.test(text)) return 'Terjadi kesalahan pada database. Coba lagi.'
  if (text && !text.includes('Server Components render')) return text
  return FALLBACK
}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

// Terima Error (hasil throw) atau hasil action { ok, ... }.
// Kembalikan teks error, atau null jika sukses.
export function errorMessage(value: unknown): string | null {
  if (value instanceof Error) return translate(value.message)
  if (value && typeof value === 'object' && 'ok' in value) {
    const r = value as { ok: boolean; error?: string }
    return r.ok ? null : r.error ?? FALLBACK
  }
  return null
}

// Hanya dipakai di file action (server): error dikembalikan sebagai data
// supaya pesannya sampai ke browser di mode production.
export async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    console.error(e)
    return { ok: false, error: translate(e instanceof Error ? e.message : '') }
  }
}
