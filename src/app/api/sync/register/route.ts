// /api/sync/register — Registrar el taller local contra Cloud API
// Recibe { serverUrl, name, address?, phone? } y hace POST /api/auth/register-workshop
// al cloud. Guarda el workshopId + apiToken en SyncState.

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { getSyncState, updateSyncState } from '@/lib/sync-service'

async function apiFetch<T = any>(url: string, body?: any, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    if (!res.ok) {
      const err: any = new Error(data?.error || `HTTP ${res.status}`)
      err.status = res.status
      throw err
    }
    return data as T
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(req: Request) {
  let user
  try {
    user = await requireRole('SUPER_ADMIN')
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'No autenticado' ? 401 : 403 })
  }

  const body = await req.json()
  const { serverUrl, name, address, phone } = body

  if (!serverUrl || !name) {
    return NextResponse.json({ error: 'Faltan campos: serverUrl, name' }, { status: 400 })
  }

  // Normalizar URL: quitar trailing slash
  const cleanUrl = serverUrl.trim().replace(/\/$/, '')

  try {
    const response = await apiFetch<{ workshop: any; apiToken: string }>(
      `${cleanUrl}/api/auth/register-workshop`,
      { name, address, phone },
      15000,
    )

    // Guardar en SyncState
    await updateSyncState({
      workshopId: response.workshop.id,
      apiToken: response.apiToken,
      serverUrl: cleanUrl,
      syncEnabled: true,
    })

    return NextResponse.json({
      ok: true,
      workshop: response.workshop,
      apiToken: response.apiToken,
      serverUrl: cleanUrl,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: `No se pudo registrar el taller: ${e.message}` },
      { status: 502 },
    )
  }
}
