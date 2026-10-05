import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/api-helpers'

// GET /api/auth/me — Usuario autenticado actual.
// getCurrentUser() ya elimina password y añade tallerIds.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return fail('No autenticado', 401)
  return ok(user)
}
