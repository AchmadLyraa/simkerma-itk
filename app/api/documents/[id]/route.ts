import { NextResponse } from 'next/server'
import { requireScope } from '@/lib/rbac'
import { errorMessage } from '@/lib/error-message'
import { resolveDocumentUrl } from '@/lib/documents'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const scope = await requireScope()
    const url = await resolveDocumentUrl(scope, id)
    return NextResponse.redirect(url, 302)
  } catch (e) {
    const message = errorMessage(e) ?? 'Terjadi kesalahan. Coba lagi.'
    return new NextResponse(message, { status: 404 })
  }
}
