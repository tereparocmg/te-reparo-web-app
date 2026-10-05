// ============================================================
// Sync Service — puente entre SQLite local y Cloud API
// ============================================================
// Métodos:
//   - getState(): SyncState (config + stats)
//   - updateState(patch): actualiza config (URL, token, enabled)
//   - pushPending(): lee SyncQueue local y hace POST /api/sync/push
//   - pullFromCloud(): GET /api/sync/pull?since=cursor y aplica eventos
//   - bootstrap(): descarga completa inicial
//   - getQueueStats(): { pending, errors, lastError }
//
// El SyncWorker llama a pushPending + pullFromCloud cada N segundos.
// ============================================================

import { prisma, prismaRaw, normalizeDates } from './prisma'
import type { SyncState } from '@prisma/client'

// ============================================================
// Helpers HTTP
// ============================================================

async function apiFetch<T = any>(url: string, opts?: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(opts?.headers || {}),
      },
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    if (!res.ok) {
      const err: any = new Error(data?.error || `HTTP ${res.status}`)
      err.status = res.status
      err.data = data
      throw err
    }
    return data as T
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// Estado de sincronización (SyncState en DB local)
// ============================================================

export async function getSyncState(): Promise<SyncState | null> {
  return await prismaRaw.syncState.findUnique({ where: { id: 'default' } })
}

export async function updateSyncState(patch: Partial<SyncState>): Promise<SyncState> {
  const existing = await prismaRaw.syncState.findUnique({ where: { id: 'default' } })
  if (existing) {
    return await prismaRaw.syncState.update({
      where: { id: 'default' },
      data: patch,
    })
  }
  return await prismaRaw.syncState.create({
    data: {
      id: 'default',
      ...patch,
    } as any,
  })
}

export async function initSyncState(): Promise<SyncState> {
  return await updateSyncState({})
}

// ============================================================
// Stats de cola
// ============================================================

export async function getQueueStats() {
  const [pending, errors] = await Promise.all([
    prismaRaw.syncQueue.count(),
    prismaRaw.syncQueue.count({ where: { attempts: { gte: 3 } } }),
  ])
  const lastError = await prismaRaw.syncQueue.findFirst({
    where: { NOT: { lastError: null } },
    orderBy: { createdAt: 'desc' },
    select: { lastError: true, createdAt: true },
  })
  return { pending, errors, lastError: lastError?.lastError || null, lastErrorAt: lastError?.createdAt || null }
}

// ============================================================
// Ping: probar conexión con Cloud API
// ============================================================

export async function pingCloud(): Promise<{ ok: boolean; message: string; workshop?: any }> {
  const state = await getSyncState()
  if (!state?.serverUrl || !state?.apiToken) {
    return { ok: false, message: 'No configurado (falta serverUrl o apiToken)' }
  }
  try {
    const r = await apiFetch(`${state.serverUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${state.apiToken}` },
    }, 5000)
    return { ok: true, message: 'Conexión exitosa', workshop: r }
  } catch (e: any) {
    return { ok: false, message: e.message }
  }
}

// ============================================================
// PUSH: subir SyncQueue local → Cloud
// ============================================================

export async function pushPending(maxBatchSize = 50): Promise<{ pushed: number; failed: number; errors: any[] }> {
  const state = await getSyncState()
  if (!state?.serverUrl || !state?.apiToken || !state.syncEnabled) {
    return { pushed: 0, failed: 0, errors: [] }
  }

  // Leer batch de SyncQueue ordenado por prioridad + createdAt
  const batch = await prismaRaw.syncQueue.findMany({
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: maxBatchSize,
  })

  if (batch.length === 0) {
    return { pushed: 0, failed: 0, errors: [] }
  }

  // Armar payload para /api/sync/push
  const entries = batch.map((q) => {
    let payload: any = {}
    try { payload = JSON.parse(q.payload) } catch {}
    // Para bulk operations, el worker del cloud debe fetch & apply todos los
    // registros locales con syncedAt = null. Por ahora, skip bulk entries.
    if (q.recordId.startsWith('__bulk_')) {
      return null
    }
    return {
      id: q.id,
      tableName: q.tableName,
      recordId: q.recordId,
      operation: q.operation as 'INSERT' | 'UPDATE' | 'DELETE',
      payload,
    }
  }).filter(Boolean)

  if (entries.length === 0) {
    // Si solo había bulk entries, las removemos del queue (no soportadas en MVP)
    await prismaRaw.syncQueue.deleteMany({
      where: { id: { in: batch.map((b) => b.id) } },
    })
    return { pushed: batch.length, failed: 0, errors: [] }
  }

  try {
    const response = await apiFetch<{ processedIds: string[]; errors: any[] }>(
      `${state.serverUrl}/api/sync/push`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.apiToken}` },
        body: JSON.stringify({ batch: entries }),
      },
      30000,
    )

    const processed = new Set(response.processedIds || [])
    const errors = response.errors || []

    // Procesar resultados: para cada entry del batch, ver si fue procesado
    for (const q of batch) {
      if (q.recordId.startsWith('__bulk_')) {
        continue
      }
      if (processed.has(q.id)) {
        // Marcar el registro correspondiente como syncedAt = now y bumpear syncVersion
        try {
          const modelName = q.tableName.charAt(0).toUpperCase() + q.tableName.slice(1)
          const delegate = (prismaRaw as any)[q.tableName]
          if (delegate) {
            // Si fue DELETE y ya estaba soft-deleted, no hacer nada más
            if (q.operation === 'DELETE') {
              // Ya está soft-deleted localmente; dejar
            } else {
              // Marcar como synced
              await delegate.update({
                where: { id: q.recordId },
                data: { syncedAt: new Date() },
              }).catch(() => {})
            }
          }
        } catch (e) {
          console.error('[sync] Failed to mark record as synced:', e)
        }
        // Remover del queue
        await prismaRaw.syncQueue.delete({ where: { id: q.id } }).catch(() => {})
      } else {
        // Ver si está en errors
        const errEntry = errors.find((e: any) => e.id === q.id)
        if (errEntry) {
          // Conflict / error: incrementar attempts, guardar lastError
          await prismaRaw.syncQueue.update({
            where: { id: q.id },
            data: {
              attempts: { increment: 1 },
              lastError: errEntry.error || 'unknown error',
            },
          }).catch(() => {})

          // Si ya tiene muchos intentos, dejar en cola para auditoría pero no reintentar
          if (q.attempts >= 5) {
            console.warn(`[sync] Entry ${q.id} failed ${q.attempts} times, leaving in queue`)
          }
        }
      }
    }

    await updateSyncState({
      lastPushAt: new Date(),
      lastError: errors.length > 0 ? `${errors.length} errores en último push` : null,
    })

    return {
      pushed: processed.size,
      failed: errors.length,
      errors,
    }
  } catch (e: any) {
    // Error de red o 5xx del cloud — mantener en cola, incrementar attempts
    await updateSyncState({
      lastError: `push failed: ${e.message}`,
    })

    // Incrementar attempts en todos los del batch
    await prismaRaw.syncQueue.updateMany({
      where: { id: { in: batch.map((b) => b.id) } },
      data: {
        attempts: { increment: 1 },
        lastError: e.message,
      },
    })

    return { pushed: 0, failed: batch.length, errors: [{ error: e.message }] }
  }
}

// ============================================================
// PULL: bajar cambios Cloud → local
// ============================================================

export async function pullFromCloud(maxEvents = 200): Promise<{ pulled: number; applied: number; nextCursor: string | null }> {
  const state = await getSyncState()
  if (!state?.serverUrl || !state?.apiToken || !state.syncEnabled) {
    return { pulled: 0, applied: 0, nextCursor: null }
  }

  const since = state.lastPullCursor || '0'

  try {
    const response = await apiFetch<{ events: any[]; nextCursor: string | null }>(
      `${state.serverUrl}/api/sync/pull?since=${encodeURIComponent(since)}&limit=${maxEvents}`,
      {
        headers: { Authorization: `Bearer ${state.apiToken}` },
      },
      30000,
    )

    const events = response.events || []
    let applied = 0

    for (const event of events) {
      try {
        await applyCloudEvent(event)
        applied++
      } catch (e: any) {
        console.error(`[sync] Failed to apply event ${event.id}:`, e)
      }
    }

    // Avanzar cursor
    await updateSyncState({
      lastPullAt: new Date(),
      lastPullCursor: response.nextCursor || String(events.length > 0 ? Math.floor(Date.now() / 1000) : since),
      lastError: null,
    })

    return { pulled: events.length, applied, nextCursor: response.nextCursor }
  } catch (e: any) {
    await updateSyncState({ lastError: `pull failed: ${e.message}` })
    return { pulled: 0, applied: 0, nextCursor: null }
  }
}

// ============================================================
// Aplicar un evento del cloud a la DB local
// ============================================================

async function applyCloudEvent(event: any): Promise<void> {
  const { tableName, recordId, operation, payload } = event
  if (!tableName || !recordId) return

  // El delegate es prismaRaw[tableName] (sin extensión para no re-encolar)
  const delegate = (prismaRaw as any)[tableName]
  if (!delegate) {
    console.warn(`[sync] Unknown table: ${tableName}`)
    return
  }

  try {
    if (operation === 'DELETE') {
      // Soft-delete local (si la tabla tiene deletedAt)
      try {
        await delegate.update({
          where: { id: recordId },
          data: { deletedAt: new Date() },
        })
      } catch {
        // Si no existe, ignorar
      }
    } else {
      // INSERT o UPDATE → upsert
      const data = { ...payload }
      // Limpiar campos que no existen en el schema local
      delete data.cloudVersion
      delete data.originWorkshopId
      delete data.lastSyncedFromWorkshopAt
      delete data.lastSyncedToWorkshopAt

      // Marcar como synced
      data.syncedAt = new Date()

      // Manejar fechas: si llegan como string ISO, convertir a Date
      for (const k of ['createdAt', 'updatedAt', 'fecha', 'fechaInicio', 'fechaVencimiento', 'fechaEntrega', 'fechaAprobacion', 'fechaRevision', 'paidAt', 'date', 'ultimoSync']) {
        if (data[k] && typeof data[k] === 'string') {
          data[k] = new Date(data[k])
        }
      }

      try {
        await delegate.upsert({
          where: { id: recordId },
          create: data,
          update: data,
        })
      } catch (e: any) {
        // Si falla por FK invalida (referencia a registro que aún no llegó), skip por ahora
        if (e?.code === 'P2003') {
          console.warn(`[sync] FK violation for ${tableName}/${recordId}, will retry in next pull`)
          throw e
        }
        // P2002 = unique violation (probablemente ya existe con otro ID, skip)
        if (e?.code === 'P2002') {
          console.warn(`[sync] Duplicate ${tableName}/${recordId}, skipping`)
          return
        }
        throw e
      }
    }
  } catch (e: any) {
    console.error(`[sync] Error applying event for ${tableName}/${recordId}:`, e)
    throw e
  }
}

// ============================================================
// Bootstrap: descarga completa inicial
// ============================================================

export async function bootstrapFromCloud(): Promise<{ ok: boolean; message: string; counts: Record<string, number> }> {
  const state = await getSyncState()
  if (!state?.serverUrl || !state?.apiToken) {
    return { ok: false, message: 'No configurado', counts: {} }
  }

  try {
    const response = await apiFetch<Record<string, any[]>>(
      `${state.serverUrl}/api/sync/bootstrap`,
      {
        headers: { Authorization: `Bearer ${state.apiToken}` },
      },
      60000,
    )

    const counts: Record<string, number> = {}

    for (const [tableName, records] of Object.entries(response)) {
      const delegate = (prismaRaw as any)[tableName]
      if (!delegate) continue

      let count = 0
      for (const record of records) {
        try {
          const data = { ...record }
          delete data.cloudVersion
          delete data.originWorkshopId
          delete data.lastSyncedFromWorkshopAt
          delete data.lastSyncedToWorkshopAt
          data.syncedAt = new Date()

          // Convertir fechas ISO → Date
          for (const k of ['createdAt', 'updatedAt', 'fecha', 'fechaInicio', 'fechaVencimiento', 'fechaEntrega', 'fechaAprobacion', 'fechaRevision', 'paidAt', 'date', 'ultimoSync']) {
            if (data[k] && typeof data[k] === 'string') {
              data[k] = new Date(data[k])
            }
          }

          await delegate.upsert({
            where: { id: record.id },
            create: data,
            update: data,
          })
          count++
        } catch (e) {
          console.error(`[sync] bootstrap ${tableName}/${record.id}:`, e)
        }
      }
      counts[tableName] = count
    }

    await updateSyncState({
      lastPullAt: new Date(),
      lastPullCursor: String(Math.floor(Date.now() / 1000)),
      lastError: null,
    })

    return { ok: true, message: 'Bootstrap completado', counts }
  } catch (e: any) {
    return { ok: false, message: e.message, counts: {} }
  }
}

// ============================================================
// TICK: una iteración del worker (push + pull)
// ============================================================

export async function tick(): Promise<{ pushed: number; pulled: number; applied: number; errors: any[] }> {
  const pushResult = await pushPending()
  const pullResult = await pullFromCloud()
  return {
    pushed: pushResult.pushed,
    pulled: pullResult.pulled,
    applied: pullResult.applied,
    errors: pushResult.errors,
  }
}

// ============================================================
// Verificar conexión a internet (sin tocar la cloud API)
// ============================================================

export async function checkInternet(): Promise<boolean> {
  try {
    // HEAD request a un endpoint público rápido
    await fetch('https://www.google.com', { method: 'HEAD', signal: AbortSignal.timeout(3000) })
    return true
  } catch {
    return false
  }
}
