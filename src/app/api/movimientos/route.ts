import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/movimientos — Listar movimientos (?tallerId&fechaInicio&fechaFin&tipo)
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const tallerId = getParam(req, 'tallerId')
    const fechaInicio = getParam(req, 'fechaInicio')
    const fechaFin = getParam(req, 'fechaFin')
    const tipo = getParam(req, 'tipo') as 'INGRESO' | 'GASTO' | 'COMPRA' | null
    const where: any = {}
    if (user.rol === 'SUPER_ADMIN') {
      if (tallerId) where.tallerId = tallerId
    } else {
      where.tallerId = tallerId && user.tallerIds.includes(tallerId)
        ? tallerId
        : { in: user.tallerIds }
    }
    if (tipo) where.tipo = tipo
    if (fechaInicio || fechaFin) {
      where.fecha = {} as any
      if (fechaInicio) where.fecha.gte = new Date(fechaInicio)
      if (fechaFin) where.fecha.lte = new Date(fechaFin)
    }
    const movs = await prisma.movimiento.findMany({
      where,
      include: { taller: true, usuario: true, venta: true, servicio: true, compra: true },
      orderBy: { fecha: 'desc' },
    })
    return ok(normalizeDates(movs))
  })
}
