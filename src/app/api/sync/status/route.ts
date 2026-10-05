// ============================================================
// /api/sync/status — Estado del sync worker
// ============================================================

import { NextResponse } from 'next/server'
import { getStatus } from '@/lib/sync-worker'
import { requireUser } from '@/lib/session'

export async function GET() {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const status = await getStatus()
  return NextResponse.json(status)
}
