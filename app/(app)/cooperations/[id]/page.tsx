'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCooperationById } from '@/app/actions/cooperations'
import { ModulePage } from '@/components/module-page'
export default function CooperationDetailPage({ params }: { params: Promise<{ id: string }> })
{ const [row,setRow]=useState<any>(null); useEffect(()=>{params.then(({id})=>getCooperationById(id).then(setRow))},[params]); return <ModulePage title={row?.name ?? 'Detail kerja sama'} description="Ringkasan, approval, dokumen, dan realisasi kerja sama."><div className="grid gap-4 sm:grid-cols-3"><Link href="./documents" className="rounded-xl border bg-white p-5 font-semibold hover:border-[#087f72]">Dokumen</Link><Link href="./activities" className="rounded-xl border bg-white p-5 font-semibold hover:border-[#087f72]">Kegiatan</Link><div className="rounded-xl border bg-white p-5"><p className="text-xs text-slate-500">Status</p><p className="mt-2 font-bold">{row?.status ?? 'Memuat...'}</p><p className="mt-2 text-sm text-slate-500">{row?.partner?.name ?? ''}</p></div></div></ModulePage>}
