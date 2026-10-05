// /api/sync/tick — Forzar una iteración inmediata del worker

import { NextResponse } from 'next/server'
import { forceTick } from '@/lib/sync-worker'
import { requireUser } from '@/lib/session'

export async function POST() {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const status = await forceTick()
  return NextResponse.json({ ok: true, status })
}
