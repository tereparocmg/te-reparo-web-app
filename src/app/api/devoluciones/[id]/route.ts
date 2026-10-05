import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/devoluciones/[id] — Ver devolución con relaciones
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const dev = await prisma.devolucion.findUnique({
      where: { id },
      include: { taller: true, venta: true, servicio: true, revisadaPor: true },
    })
    if (!dev) return fail('Devolución no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(dev.tallerId)) {
      return fail('No tienes acceso a esa devolución', 403)
    }
    return ok(normalizeDates(dev))
  })
}
