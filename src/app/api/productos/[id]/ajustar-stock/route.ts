import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/productos/[id]/ajustar-stock — Ajustar stock (delta puede ser negativo)
// Body: { delta: number }
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const { delta } = await parseBody<any>(req)
    if (typeof delta !== 'number' || isNaN(delta)) {
      return fail('Falta campo obligatorio: delta (number)', 400)
    }
    const prod = await prisma.producto.findUnique({ where: { id } })
    if (!prod || prod.deletedAt) return fail('Producto no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(prod.tallerId)) {
      return fail('No tienes acceso a ese producto', 403)
    }
    try {
      const nuevoStock = Math.max(0, prod.stock + delta)
      const actualizado = await prisma.producto.update({
        where: { id },
        data: { stock: nuevoStock },
      })
      return ok(actualizado)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Producto no encontrado', 404)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
