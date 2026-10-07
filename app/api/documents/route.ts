import { NextResponse } from 'next/server'
import { requireScope } from '@/lib/rbac'
import { safe } from '@/lib/error-message'
import { saveCooperationDocument } from '@/lib/documents'

export async function POST(request: Request) {
  const result = await safe(async () => {
    const scope = await requireScope()
    const formData = await request.formData()
    return saveCooperationDocument(scope, formData)
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
