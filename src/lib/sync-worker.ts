// ============================================================
// Sync Worker — background job para Next.js + WebSocket client
// ============================================================
// Se arranca automáticamente al iniciar la app.
//
// Dos mecanismos de sync:
//   1. Polling: cada N segundos (configurable, default 30s), hace
//      pushPending() + pullFromCloud() contra el Cloud API.
//   2. WebSocket (Fase 4): mantiene conexión WS con el Cloud API.
//      Cuando el super-admin hace un cambio, el cloud emite
//      'sync-available' → el worker hace pullFromCloud() inmediato
//      → refresca la UI via Zustand bootstrapFromBackend().
//
// El estado se expone via API:
//   GET /api/sync/status
//   POST /api/sync/start  → arranca el worker
//   POST /api/sync/stop   → detiene el worker
//   POST /api/sync/tick   → fuerza una iteración inmediata
// ============================================================

import { tick, getQueueStats, checkInternet, getSyncState, pullFromCloud } from './sync-service'
import { bootstrapFromBackend } from './store'

// ============================================================
// WebSocket client (lazy import — solo en browser)
// ============================================================

type SocketClient = {
  connected: boolean
  on: (event: string, cb: (...args: any[]) => void) => void
  off: (event: string, cb?: (...args: any[]) => void) => void
  emit: (event: string, ...args: any[]) => void
  disconnect: () => void
  connect: () => void
} | null

// ============================================================
// Estado global del worker (singleton en memoria)
// ============================================================

type WorkerStatus = {
  running: boolean
  lastTickAt: Date | null
  nextTickAt: Date | null
  lastResult: { pushed: number; pulled: number; applied: number; errors: any[] } | null
  online: boolean
  wsConnected: boolean
  intervalMs: number
}

declare global {
  // eslint-disable-next-line no-var
  var __syncWorker: {
    status: WorkerStatus
    timer: NodeJS.Timeout | null
    isTicking: boolean
    socket: SocketClient
    wsReconnectAttempts: number
    wsReconnectTimer: NodeJS.Timeout | null
  } | undefined
}

if (!globalThis.__syncWorker) {
  globalThis.__syncWorker = {
    status: {
      running: false,
      lastTickAt: null,
      nextTickAt: null,
      lastResult: null,
      online: false,
      wsConnected: false,
      intervalMs: 30000,
    },
    timer: null,
    isTicking: false,
    socket: null,
    wsReconnectAttempts: 0,
    wsReconnectTimer: null,
  }
}

const worker = globalThis.__syncWorker!

// ============================================================
// Loop interno: una iteración del worker
// ============================================================

async function runTick() {
  if (worker.isTicking) return
  worker.isTicking = true

  try {
    const state = await getSyncState()
    if (!state?.syncEnabled || !state?.serverUrl || !state?.apiToken) {
      worker.status.online = false
      worker.status.lastResult = { pushed: 0, pulled: 0, applied: 0, errors: [] }
      return
    }

    const newIntervalMs = (state.syncIntervalSec || 30) * 1000
    if (newIntervalMs !== worker.status.intervalMs) {
      worker.status.intervalMs = newIntervalMs
      restartTimer()
    }

    const online = await checkInternet()
    worker.status.online = online

    if (!online) {
      worker.status.lastResult = { pushed: 0, pulled: 0, applied: 0, errors: [{ error: 'Sin conexión a internet' }] }
      return
    }

    const result = await tick()
    worker.status.lastResult = result
    worker.status.lastTickAt = new Date()

    // Si el WS no está conectado, intentar reconectar
    if (!worker.status.wsConnected) {
      connectWebSocket()
    }
  } catch (e: any) {
    console.error('[sync-worker] tick failed:', e)
    worker.status.lastResult = {
      pushed: 0, pulled: 0, applied: 0,
      errors: [{ error: e.message }],
    }
  } finally {
    worker.isTicking = false
  }
}

// ============================================================
// WebSocket connection management
// ============================================================

async function connectWebSocket() {
  // Solo en browser (no en SSR)
  if (typeof window === 'undefined') return

  const state = await getSyncState()
  if (!state?.serverUrl || !state?.apiToken || !state?.syncEnabled) return

  // Si ya hay un socket conectado, no hacer nada
  if (worker.socket?.connected) {
    worker.status.wsConnected = true
    return
  }

  // Limpiar socket anterior
  if (worker.socket) {
    try { worker.socket.disconnect() } catch {}
    worker.socket = null
  }

  try {
    // Dynamic import de socket.io-client
    const { io } = await import('socket.io-client')
    const wsUrl = state.serverUrl.replace(/\/$/, '')
    const socket = io(wsUrl, {
      auth: { token: state.apiToken },
      transports: ['websocket'],
      reconnection: false, // gestionamos reconnect manualmente con backoff
      timeout: 10000,
    })

    socket.on('connect', () => {
      console.log('[sync-worker] WebSocket conectado al cloud')
      worker.status.wsConnected = true
      worker.wsReconnectAttempts = 0
    })

    socket.on('disconnect', (reason: string) => {
      console.log('[sync-worker] WebSocket desconectado:', reason)
      worker.status.wsConnected = false
      scheduleReconnect()
    })

    socket.on('connect_error', (error: any) => {
      console.warn('[sync-worker] WebSocket connect error:', error.message)
      worker.status.wsConnected = false
      scheduleReconnect()
    })

    // —— Evento 'sync-available' (Phase 4) ——
    // El cloud emite esto cuando el super-admin hace un cambio que
    // afecta a este taller. Hacemos pull inmediato + refrescamos UI.
    socket.on('sync-available', async (data: any) => {
      console.log('[sync-worker] WS evento sync-available:', data?.tableName, data?.recordId)
      try {
        const result = await pullFromCloud(200)
        console.log('[sync-worker] Pull inmediato:', result.applied, 'eventos aplicados')
        // Refrescar UI via Zustand bootstrapFromBackend
        await bootstrapFromBackend()
        console.log('[sync-worker] UI refrescada via bootstrapFromBackend')
      } catch (e: any) {
        console.error('[sync-worker] Error en pull inmediato:', e.message)
      }
    })

    worker.socket = socket as any
  } catch (e: any) {
    console.error('[sync-worker] No se pudo importar socket.io-client:', e.message)
  }
}

function scheduleReconnect() {
  // Limpiar timer anterior
  if (worker.wsReconnectTimer) {
    clearTimeout(worker.wsReconnectTimer)
    worker.wsReconnectTimer = null
  }

  // Backoff exponencial: 2s, 4s, 8s, 16s, 30s, 30s, ...
  worker.wsReconnectAttempts++
  const delay = Math.min(30000, Math.pow(2, worker.wsReconnectAttempts) * 1000)
  console.log(`[sync-worker] WS reconnect en ${delay / 1000}s (intento ${worker.wsReconnectAttempts})`)

  worker.wsReconnectTimer = setTimeout(() => {
    connectWebSocket()
  }, delay)
}

function disconnectWebSocket() {
  if (worker.socket) {
    try { worker.socket.disconnect() } catch {}
    worker.socket = null
  }
  if (worker.wsReconnectTimer) {
    clearTimeout(worker.wsReconnectTimer)
    worker.wsReconnectTimer = null
  }
  worker.status.wsConnected = false
  worker.wsReconnectAttempts = 0
  console.log('[sync-worker] WebSocket desconectado')
}

// ============================================================
// API pública del worker
// ============================================================

export function startWorker(intervalMs?: number) {
  if (worker.status.running) return
  worker.status.running = true
  if (intervalMs) worker.status.intervalMs = intervalMs

  console.log(`[sync-worker] Arrancado (intervalo: ${worker.status.intervalMs}ms)`)

  // Tick inmediato
  setTimeout(runTick, 1000)

  // Ticks periódicos
  worker.timer = setInterval(runTick, worker.status.intervalMs)
  worker.status.nextTickAt = new Date(Date.now() + worker.status.intervalMs)

  // Conectar WebSocket
  setTimeout(connectWebSocket, 2000)
}

export function stopWorker() {
  if (worker.timer) {
    clearInterval(worker.timer)
    worker.timer = null
  }
  disconnectWebSocket()
  worker.status.running = false
  worker.status.nextTickAt = null
  console.log('[sync-worker] Detenido')
}

export function restartTimer() {
  if (worker.timer) {
    clearInterval(worker.timer)
    worker.timer = setInterval(runTick, worker.status.intervalMs)
    worker.status.nextTickAt = new Date(Date.now() + worker.status.intervalMs)
  }
}

export async function forceTick() {
  await runTick()
  return getStatus()
}

export async function getStatus(): Promise<{
  running: boolean
  online: boolean
  wsConnected: boolean
  lastTickAt: string | null
  nextTickAt: string | null
  lastResult: any
  queue: { pending: number; errors: number; lastError: string | null; lastErrorAt: string | null }
  state: any
}> {
  const [queue, state] = await Promise.all([getQueueStats(), getSyncState()])
  return {
    running: worker.status.running,
    online: worker.status.online,
    wsConnected: worker.status.wsConnected,
    lastTickAt: worker.status.lastTickAt?.toISOString() ?? null,
    nextTickAt: worker.status.nextTickAt?.toISOString() ?? null,
    lastResult: worker.status.lastResult,
    queue,
    state: state ? {
      workshopId: state.workshopId,
      serverUrl: state.serverUrl,
      syncEnabled: state.syncEnabled,
      syncIntervalSec: state.syncIntervalSec,
      lastPullAt: state.lastPullAt?.toISOString() ?? null,
      lastPushAt: state.lastPushAt?.toISOString() ?? null,
      lastError: state.lastError,
    } : null,
  }
}

// Auto-arrancar al importar este módulo
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    startWorker()
  }, 5000)
}
