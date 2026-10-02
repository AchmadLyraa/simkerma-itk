import { getAuditLogs } from '@/app/actions/audit-logs'
import { ModulePage, DataTable, EmptyState } from '@/components/module-page'

type AuditLog = Awaited<ReturnType<typeof getAuditLogs>>[number]

export default async function AuditLogsPage() {
  const logs: AuditLog[] = await getAuditLogs()
  const rows = logs.map((log: AuditLog) => ({
    Waktu: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(log.timestamp),
    Aktor: log.user.name || log.user.email,
    Entitas: `${log.entityType} · ${log.entityId}`,
    Aksi: log.action,
    Ringkasan: log.newValue ? 'Data diperbarui' : log.oldValue ? 'Data dihapus' : 'Data dibuat',
  }))

  return (
    <ModulePage title="Audit log" description="Histori perubahan read-only dalam scope organisasi Anda.">
      {rows.length > 0 ? <DataTable columns={['Waktu', 'Aktor', 'Entitas', 'Aksi', 'Ringkasan']} rows={rows} /> : <EmptyState text="Belum ada histori perubahan." />}
    </ModulePage>
  )
}

