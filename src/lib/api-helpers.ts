// ============================================================
// API Helpers — utilidades para Next.js Route Handlers
// ============================================================

import { NextResponse } from 'next/server'
import { requireUser, requireRole } from './session'

// Tipos de respuesta
type ApiResponse = NextResponse

// Helper: respuesta JSON exitosa
export function ok<T>(data: T, init?: ResponseInit): ApiResponse {
  return NextResponse.json(data, init)
}

// Helper: respuesta de error
export function fail(message: string, status = 400, details?: any): ApiResponse {
  return NextResponse.json({ error: message, details }, { status })
}

// Helper: parsear el cuerpo JSON de la petición
export async function parseBody<T = any>(req: Request): Promise<T> {
  try {
    const text = await req.text()
    if (!text) return {} as T
    return JSON.parse(text) as T
  } catch {
    throw new Error('Cuerpo JSON inválido')
  }
}

// Helper: ejecuta un handler con manejo de errores y auth
// Si `roles` está vacío, requiere solo sesión. Si no, requiere uno de esos roles.
export async function withAuth<T>(
  req: Request,
  handler: (user: any) => Promise<T>,
  roles?: string[]
): Promise<ApiResponse | T> {
  try {
    const user = roles && roles.length
      ? await requireRole(...roles)
      : await requireUser()
    return await handler(user)
  } catch (e: any) {
    if (e.message === 'No autenticado') {
      return fail(e.message, 401)
    }
    if (e.message.startsWith('Requiere rol:')) {
      return fail(e.message, 403)
    }
    console.error('[API] Error:', e.message)
    return fail(e.message || 'Error interno', 500)
  }
}

// Helper: extraer parámetro de la URL
export function getParam(req: Request, name: string): string | null {
  const url = new URL(req.url)
  return url.searchParams.get(name)
}

// Helper: obtener ID de los params dinámicos
export function getIdFromParams(params: any): string {
  return params?.id || params?.[0]?.id || ''
}
