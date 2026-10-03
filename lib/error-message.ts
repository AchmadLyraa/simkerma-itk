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

export function errorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : ''
  if (messages[text]) return messages[text]
  if (text && !text.includes('Server Components render')) return text
  return 'Terjadi kesalahan. Coba lagi.'
}
