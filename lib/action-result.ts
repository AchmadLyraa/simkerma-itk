import { errorMessage } from '@/lib/error-message'

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

// Dipakai di server action: error dikembalikan sebagai data, bukan di-throw,
// supaya pesannya sampai ke browser di mode production.
export async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    console.error(e)
    const text = e instanceof Error ? e.message : ''
    // Jangan bocorkan detail internal Prisma ke user.
    if (/prisma|Invalid `/i.test(text)) return { ok: false, error: 'Terjadi kesalahan pada database. Coba lagi.' }
    return { ok: false, error: errorMessage(e) }
  }
}

// Dipakai di client: ubah hasil kembali menjadi throw, jadi blok catch
// yang sudah ada (modal, banner) tetap bekerja tanpa perubahan.
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error)
  return result.data
}
