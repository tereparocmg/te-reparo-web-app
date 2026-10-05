// /api/sync/ping — Probar conexión con Cloud API

import { NextResponse } from 'next/server'
import { pingCloud } from '@/lib/sync-service'
import { requireUser } from '@/lib/session'

export async function POST() {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const result = await pingCloud()
  return NextResponse.json(result)
}
