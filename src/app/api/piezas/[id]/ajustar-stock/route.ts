import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/piezas/[id]/ajustar-stock — Ajustar stock (delta puede ser negativo)
// Body: { delta: number }
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const { delta } = await parseBody<any>(req)
    if (typeof delta !== 'number' || isNaN(delta)) {
      return fail('Falta campo obligatorio: delta (number)', 400)
    }
    const pz = await prisma.pieza.findUnique({ where: { id } })
    if (!pz || pz.deletedAt) return fail('Pieza no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(pz.tallerId)) {
      return fail('No tienes acceso a esa pieza', 403)
    }
    try {
      const nuevoStock = Math.max(0, pz.stock + delta)
      const actualizado = await prisma.pieza.update({
        where: { id },
        data: { stock: nuevoStock },
      })
      return ok(actualizado)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Pieza no encontrada', 404)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
