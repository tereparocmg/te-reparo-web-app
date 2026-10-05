// ============================================================
// Session Helper — cookie-based para Next.js
// ============================================================
// Usa una cookie httpOnly con el userId. Para app local de
// escritorio (no production-facing), una cookie firmada con
// HMAC es suficiente. Si más adelante se necesita JWT completo,
// se puede cambiar a `jose` sin tocar el resto del código.
// ============================================================

import { cookies } from 'next/headers'
import { prisma } from './prisma'

const COOKIE_NAME = 'tereparo_session'
const COOKIE_SECRET = process.env.SESSION_SECRET || 'tereparo-dev-secret-change-me'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 días

// ============ Firma HMAC simple ============

async function sign(value: string): Promise<string> {
  const { createHmac } = await import('crypto')
  const hmac = createHmac('sha256', COOKIE_SECRET).update(value).digest('hex')
  return `${value}.${hmac}`
}

async function verify(signed: string): Promise<string | null> {
  if (!signed) return null
  const [value, signature] = signed.split('.')
  if (!value || !signature) return null
  const expected = await sign(value)
  if (signed !== expected) return null
  return value
}

// ============ API pública ============

export async function setSession(userId: string): Promise<void> {
  const cookieStore = await cookies()
  const signed = await sign(userId)
  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const signed = cookieStore.get(COOKIE_NAME)?.value
  if (!signed) return null
  return await verify(signed)
}

export async function getCurrentUser() {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { talleres: { include: { taller: true } } },
  })
  if (!usuario || !usuario.activo) return null
  const { password, ...userData } = usuario
  return {
    ...userData,
    tallerIds: usuario.talleres.map(ut => ut.tallerId),
  }
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('No autenticado')
  }
  return user as any
}

export async function requireRole(...roles: string[]) {
  const user = await requireUser()
  if (!roles.includes(user.rol)) {
    throw new Error(`Requiere rol: ${roles.join(' o ')}`)
  }
  return user
}
