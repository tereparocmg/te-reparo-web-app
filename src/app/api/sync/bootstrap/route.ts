// /api/sync/bootstrap — Descarga completa desde cloud

import { NextResponse } from 'next/server'
import { bootstrapFromCloud } from '@/lib/sync-service'
import { requireRole } from '@/lib/session'

export async function POST() {
  let user
  try {
    user = await requireRole('SUPER_ADMIN')
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'No autenticado' ? 401 : 403 })
  }

  const result = await bootstrapFromCloud()
  return NextResponse.json(result)
}
