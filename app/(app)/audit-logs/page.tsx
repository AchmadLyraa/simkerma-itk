import { getAuditLogs } from '@/app/actions/audit-logs'
import { ModulePage, DataTable, EmptyState } from '@/components/module-page'

type AuditLog = Awaited<ReturnType<typeof getAuditLogs>>[number]

const summaryBySuffix: Record<string, string> = {
  create: 'Data dibuat',
  add: 'Data ditambahkan',
  update: 'Data diperbarui',
  delete: 'Data dihapus',
  remove: 'Data dihapus',
  deactivate: 'Data dinonaktifkan',
  submit: 'Diajukan untuk approval',
  approve: 'Disetujui',
  reject: 'Ditolak',
  assign_scope: 'Scope diberikan',
  revoke_scope: 'Scope dicabut',
}

const actionLabel: Record<string, string> = {
  'cooperation.create': 'Tambah kerja sama',
  'cooperation.update': 'Ubah kerja sama',
  'cooperation.submit': 'Ajukan kerja sama',
  'cooperation.approve': 'Setujui kerja sama',
  'cooperation.reject': 'Tolak kerja sama',
  'partner.create': 'Tambah mitra',
  'partner.update': 'Ubah mitra',
  'partner.deactivate': 'Nonaktifkan mitra',
  'partner_contact.create': 'Tambah kontak mitra',
  'partner_contact.update': 'Ubah kontak mitra',
  'partner_contact.delete': 'Hapus kontak mitra',
  'activity.create': 'Tambah kegiatan',
  'activity.update': 'Ubah kegiatan',
  'participant.add': 'Tambah peserta',
  'participant.remove': 'Hapus peserta',
  'document.create': 'Tambah dokumen',
  'document.delete': 'Hapus dokumen',
  'activity_document.create': 'Tambah dokumen kegiatan',
  'org_unit.create': 'Tambah unit organisasi',
  'org_unit.update': 'Ubah unit organisasi',
  'org_unit.delete': 'Hapus unit organisasi',
  'user.assign_scope': 'Beri scope pengguna',
  'user.revoke_scope': 'Cabut scope pengguna',
  'user.create': 'Tambah pengguna',
  'user.activate': 'Aktifkan pengguna',
  'user.deactivate': 'Nonaktifkan pengguna',
  'user.reset_password': 'Reset password pengguna',
}

export default async function AuditLogsPage() {
  const logs: AuditLog[] = await getAuditLogs()
  const rows = logs.map((log: AuditLog) => ({
    Waktu: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(log.timestamp),
    Aktor: log.user.name || log.user.email,
    Entitas: `${log.entityType} · ${log.entityId}`,
    Aksi: actionLabel[log.action] ?? log.action,
    Ringkasan: summaryBySuffix[log.action.split('.').pop() ?? ''] ?? log.action,
  }))

  return (
    <ModulePage title="Audit log" description="Histori perubahan read-only dalam scope organisasi Anda.">
      {rows.length > 0 ? <DataTable columns={['Waktu', 'Aktor', 'Entitas', 'Aksi', 'Ringkasan']} rows={rows} /> : <EmptyState text="Belum ada histori perubahan." />}
    </ModulePage>
  )
}
