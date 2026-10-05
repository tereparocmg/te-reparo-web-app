// /api/sync/stop — Detener el sync worker

import { NextResponse } from 'next/server'
import { stopWorker, getStatus } from '@/lib/sync-worker'
import { requireUser } from '@/lib/session'

export async function POST() {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  stopWorker()
  const status = await getStatus()
  return NextResponse.json({ ok: true, status })
}
