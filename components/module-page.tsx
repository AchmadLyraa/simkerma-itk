'use client'

import { FormEvent, ReactNode, useState } from 'react'
import { errorMessage } from '@/lib/error-message'

export type FormField = {
  name: string
  label: string
  type?: string
  options?: (string | { label: string; value: string; disabled?: boolean })[]
  required?: boolean
  disabled?: boolean
  helpText?: string
  multiple?: boolean
  // Opsi dinamis yang bergantung pada isian lain di form (menggantikan `options` bila ada).
  getOptions?: (data: Record<string, string>) => (string | { label: string; value: string; disabled?: boolean })[]
}

type SubmitHandler = (data: Record<string, string>) => Promise<unknown> | unknown

type ModulePageProps = {
  title: string
  description: string
  actionLabel?: string
  onSubmit?: SubmitHandler
  fields?: FormField[]
  error?: string | null
  children?: ReactNode
}

export function ModulePage({ title, description, actionLabel = 'Tambah data', onSubmit, fields = [], error, children }: ModulePageProps) {
  const [open, setOpen] = useState(false)
  return (
    <main className="min-h-screen min-w-0 bg-[#f5f7fa] p-6 text-[#172b4d] sm:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#087f72]">SIMKERMA</p>
            <h1 className="mt-2 text-3xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          {onSubmit && <button onClick={() => setOpen(true)} className="rounded-lg bg-[#087f72] px-4 py-2.5 text-sm font-semibold text-white">{actionLabel}</button>}
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {children}
        {open && onSubmit && <ActionModal title={actionLabel} fields={fields} onSubmit={onSubmit} onClose={() => setOpen(false)} />}
      </div>
    </main>
  )
}

export function DataTable({ columns, rows }: { columns: string[]; rows: Record<string, ReactNode>[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>{columns.map((column) => <th key={column} className="px-5 py-3">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-slate-50">
              {columns.map((column) => <td key={column} className="px-5 py-4">{row[column]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-slate-500">{text}</div>
}

export function ActionModal({ title, fields = [], onSubmit, onClose, submitLabel = 'Simpan', initialValues }: {
  title: string
  fields?: FormField[]
  onSubmit: SubmitHandler
  onClose: () => void
  submitLabel?: string
  initialValues?: Record<string, string>
}) {
  const [data, setData] = useState<Record<string, string>>(initialValues ?? {})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (name: string, value: string) =>
    setData((prev) => {
      const next = { ...prev, [name]: value }
      // Kosongkan isian dinamis yang nilainya tidak lagi tersedia di opsi barunya.
      for (const f of fields) {
        if (f.getOptions && next[f.name]) {
          const valid = f.getOptions(next).some((o) => (typeof o === 'string' ? o : o.value) === next[f.name])
          if (!valid) next[f.name] = ''
        }
      }
      return next
    })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      const err = errorMessage(await onSubmit(data))
      if (err) { setFormError(err); return }
      onClose()
    } catch (e) {
      setFormError(errorMessage(e) ?? 'Terjadi kesalahan. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const labelClass = 'text-xs font-semibold text-slate-500'
  const inputClass = 'rounded-lg border p-3 text-sm'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="mt-5 grid gap-4">
          {fields.map((field) => {
            const options = field.getOptions ? field.getOptions(data) : field.options
            if (options && field.multiple) {
              const selected = (data[field.name] ?? '').split(',').filter(Boolean)
              return (
                <fieldset key={field.name} className="grid gap-2 rounded-lg border p-3">
                  <legend className={`px-1 ${labelClass}`}>{field.label}</legend>
                  {options.length === 0 && <span className="text-xs text-slate-500">Belum ada pilihan tersedia.</span>}
                  {options.map((option) => {
                    const item = typeof option === 'string' ? { label: option, value: option } : option
                    return (
                      <label key={item.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.includes(item.value)}
                          onChange={(e) => set(field.name, (e.target.checked ? [...selected, item.value] : selected.filter((v) => v !== item.value)).join(','))}
                        />
                        {item.label}
                      </label>
                    )
                  })}
                </fieldset>
              )
            }
            return (
              <label key={field.name} className="grid gap-1">
                <span className={labelClass}>{field.label}{field.required ? ' *' : ''}</span>
                {field.options ? (
                  <select disabled={field.disabled} required={field.required} value={data[field.name] ?? ''} onChange={(e) => set(field.name, e.target.value)} className={inputClass}>
                    <option value="">— Pilih —</option>
                    {field.options.map((option) => {
                      const item = typeof option === 'string' ? { label: option, value: option } : option
                      return <option key={item.value} value={item.value} disabled={item.disabled}>{item.label}</option>
                    })}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea disabled={field.disabled} required={field.required} value={data[field.name] ?? ''} onChange={(e) => set(field.name, e.target.value)} className={`min-h-24 ${inputClass}`} />
                ) : (
                  <input disabled={field.disabled} required={field.required} type={field.type ?? 'text'} value={data[field.name] ?? ''} onChange={(e) => set(field.name, e.target.value)} className={inputClass} />
                )}
                {field.helpText && <span className="text-xs text-slate-500">{field.helpText}</span>}
              </label>
            )
          })}
        </div>
        {formError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Batal</button>
          <button disabled={busy} className="rounded-lg bg-[#087f72] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Menyimpan...' : submitLabel}</button>
        </div>
      </form>
    </div>
  )
}
