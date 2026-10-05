// ============================================================
// Cloud Data Service — fetch helpers para la web admin super-admin
// ============================================================
// El super-admin no usa SQLite local; consume directo el Cloud API.
// El JWT + refresh token se guardan en localStorage (separados del
// cookie-based auth del local).
// ============================================================

const TOKEN_KEY = 'tereparo_cloud_token'
const REFRESH_KEY = 'tereparo_cloud_refresh'
const SERVER_URL_KEY = 'tereparo_cloud_server_url'

// ============================================================
// Token management (localStorage)
// ============================================================

export function getCloudServerUrl(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SERVER_URL_KEY)
}

export function setCloudServerUrl(url: string | null) {
  if (typeof window === 'undefined') return
  if (url) localStorage.setItem(SERVER_URL_KEY, url)
  else localStorage.removeItem(SERVER_URL_KEY)
}

export function getCloudToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setCloudTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearCloudTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function isLoggedInCloud(): boolean {
  return !!getCloudToken()
}

// ============================================================
// HTTP helpers
// ============================================================

async function cloudFetch<T = any>(path: string, opts?: RequestInit, timeoutMs = 30000): Promise<T> {
  const serverUrl = getCloudServerUrl()
  const token = getCloudToken()
  if (!serverUrl) throw new Error('No configurado: falta serverUrl del Cloud API (ve a Configuración → Sync)')
  if (!token) throw new Error('No autenticado en el cloud')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${serverUrl}${path}`, {
      ...opts,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
// Auth (cloud)
// ============================================================

export async function cloudLogin(email: string, password: string, serverUrl: string): Promise<{ user: any; accessToken: string; refreshToken: string }> {
  const cleanUrl = serverUrl.trim().replace(/\/$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${cleanUrl}/api/auth/login-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Credenciales inválidas')
    setCloudServerUrl(cleanUrl)
    setCloudTokens(data.accessToken, data.refreshToken)
    return {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function cloudLogout() {
  clearCloudTokens()
}

export async function cloudMe(): Promise<any> {
  return await cloudFetch('/api/auth/me')
}

// ============================================================
// Workshops list
// ============================================================

export async function cloudListWorkshops(): Promise<any[]> {
  return await cloudFetch('/api/admin/workshops')
}

export async function cloudGetWorkshopDashboard(workshopId: string): Promise<any> {
  return await cloudFetch(`/api/admin/workshops/${encodeURIComponent(workshopId)}/dashboard`)
}

// ============================================================
// Generic resource CRUD
// ============================================================

export async function cloudListResource(
  workshopId: string,
  tableName: string,
  page = 1,
  limit = 50,
): Promise<{ data: any[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) })
  return await cloudFetch(`/api/admin/workshops/${encodeURIComponent(workshopId)}/${encodeURIComponent(tableName)}?${q}`)
}

export async function cloudGetResource(workshopId: string, tableName: string, recordId: string): Promise<any> {
  return await cloudFetch(`/api/admin/workshops/${encodeURIComponent(workshopId)}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`)
}

export async function cloudCreateResource(workshopId: string, tableName: string, data: any): Promise<any> {
  return await cloudFetch(`/api/admin/workshops/${encodeURIComponent(workshopId)}/${encodeURIComponent(tableName)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function cloudUpdateResource(workshopId: string, tableName: string, recordId: string, data: any): Promise<any> {
  return await cloudFetch(`/api/admin/workshops/${encodeURIComponent(workshopId)}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function cloudDeleteResource(workshopId: string, tableName: string, recordId: string): Promise<any> {
  return await cloudFetch(`/api/admin/workshops/${encodeURIComponent(workshopId)}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`, {
    method: 'DELETE',
  })
}

// ============================================================
// Configuración (server URL del cloud)
// ============================================================

// Lee el server URL del SyncState local (configurado en Settings → Sync)
// Si no está ahí, fallback a localStorage (setCloudServerUrl).
export async function getCloudServerUrlFromSyncState(): Promise<string | null> {
  // El cloud-data-service es client-side; llamamos al local API.
  try {
    const res = await fetch('/api/sync/config')
    if (!res.ok) return null
    const data = await res.json()
    return data?.serverUrl || null
  } catch {
    return null
  }
}

// Inicializar el server URL desde SyncState (al cargar la app).
// Si ya estaba en localStorage, no sobreescribe.
export async function initCloudServerUrl() {
  if (getCloudServerUrl()) return // ya seteado
  const url = await getCloudServerUrlFromSyncState()
  if (url) setCloudServerUrl(url)
}
