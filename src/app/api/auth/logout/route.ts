import { clearSession } from '@/lib/session'
import { ok } from '@/lib/api-helpers'

// POST /api/auth/logout — Cierre de sesión
export async function POST() {
  await clearSession()
  return ok({ ok: true })
}
