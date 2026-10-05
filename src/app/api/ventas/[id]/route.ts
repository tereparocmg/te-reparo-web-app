import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/ventas/[id] — Ver venta con todas sus relaciones
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        items: { include: { producto: true } },
        cliente: true, vendedor: true, operario: true,
        garantia: true, taller: true,
      },
    })
    if (!venta) return fail('Venta no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(venta.tallerId)) {
      return fail('No tienes acceso a esa venta', 403)
    }
    return ok(normalizeDates(venta))
  })
}
