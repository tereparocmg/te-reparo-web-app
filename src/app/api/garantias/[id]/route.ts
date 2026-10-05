import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/garantias/[id] — Ver garantía con relaciones
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const garantia = await prisma.garantia.findUnique({
      where: { id },
      include: {
        cliente: true,
        venta: { include: { items: { include: { producto: true } } } },
        servicio: { include: { piezasUtilizadas: { include: { pieza: true } } } },
        reclamaciones: true,
        taller: true,
        usuario: true,
      },
    })
    if (!garantia) return fail('Garantía no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(garantia.tallerId)) {
      return fail('No tienes acceso a esa garantía', 403)
    }
    return ok(normalizeDates(garantia))
  })
}
