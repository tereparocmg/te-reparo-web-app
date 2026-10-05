// /api/sync/config — GET/PUT configuración de sync (serverUrl, apiToken, syncEnabled, interval)

import { NextResponse } from 'next/server'
import { requireUser, requireRole } from '@/lib/session'
import { getSyncState, updateSyncState, pingCloud } from '@/lib/sync-service'

// GET — Devuelve la config actual (sin exponer apiToken completo)
export async function GET() {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const state = await getSyncState()
  if (!state) {
    return NextResponse.json({
      workshopId: null,
      serverUrl: null,
      apiToken: null,
      syncEnabled: false,
      syncIntervalSec: 30,
      hasApiToken: false,
    })
  }

  return NextResponse.json({
    workshopId: state.workshopId,
    serverUrl: state.serverUrl,
    apiToken: state.apiToken, // Para que el super-admin pueda verlo completo en settings
    syncEnabled: state.syncEnabled,
    syncIntervalSec: state.syncIntervalSec || 30,
    hasApiToken: !!state.apiToken,
    lastPullAt: state.lastPullAt,
    lastPushAt: state.lastPushAt,
    lastError: state.lastError,
  })
}

// PUT — Actualizar config (solo SUPER_ADMIN)
export async function PUT(req: Request) {
  let user
  try {
    user = await requireRole('SUPER_ADMIN')
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'No autenticado' ? 401 : 403 })
  }

  const body = await req.json()
  const patch: any = {}
  if (body.serverUrl !== undefined) patch.serverUrl = body.serverUrl?.trim() || null
  if (body.apiToken !== undefined) patch.apiToken = body.apiToken?.trim() || null
  if (body.syncEnabled !== undefined) patch.syncEnabled = !!body.syncEnabled
  if (body.syncIntervalSec !== undefined) patch.syncIntervalSec = Math.max(5, Math.min(3600, Number(body.syncIntervalSec) || 30))
  if (body.workshopId !== undefined) patch.workshopId = body.workshopId?.trim() || null

  const updated = await updateSyncState(patch)
  return NextResponse.json({
    ok: true,
    state: {
      workshopId: updated.workshopId,
      serverUrl: updated.serverUrl,
      syncEnabled: updated.syncEnabled,
      syncIntervalSec: updated.syncIntervalSec,
      hasApiToken: !!updated.apiToken,
    },
  })
}
