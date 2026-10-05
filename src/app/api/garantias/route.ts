import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/garantias — Listar garantías (?tallerId=X)
// Include cliente, venta, servicio, reclamaciones
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const tallerId = getParam(req, 'tallerId')
    const where: any = {}
    if (user.rol === 'SUPER_ADMIN') {
      if (tallerId) where.tallerId = tallerId
    } else {
      where.tallerId = tallerId && user.tallerIds.includes(tallerId)
        ? tallerId
        : { in: user.tallerIds }
    }
    const garantias = await prisma.garantia.findMany({
      where,
      include: {
        cliente: true,
        venta: true,
        servicio: true,
        reclamaciones: true,
        taller: true,
        usuario: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(normalizeDates(garantias))
  })
}
