import { prisma } from '@/lib/prisma'
import { ok, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/movimientos/resumen-dia — Resumen de caja del día
// Query: ?tallerId=X → { ingresosHoy, gastosHoy, comprasHoy, balanceHoy }
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
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)
    where.fecha = { gte: hoy, lt: manana }
    const movs = await prisma.movimiento.findMany({ where, select: { tipo: true, monto: true } })
    const ingresosHoy = movs.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0)
    const gastosHoy = movs.filter((m) => m.tipo === 'GASTO').reduce((s, m) => s + m.monto, 0)
    const comprasHoy = movs.filter((m) => m.tipo === 'COMPRA').reduce((s, m) => s + m.monto, 0)
    const balanceHoy = ingresosHoy - gastosHoy - comprasHoy
    return ok({
      ingresosHoy: Math.round(ingresosHoy * 100) / 100,
      gastosHoy: Math.round(gastosHoy * 100) / 100,
      comprasHoy: Math.round(comprasHoy * 100) / 100,
      balanceHoy: Math.round(balanceHoy * 100) / 100,
      totalMovimientos: movs.length,
    })
  })
}
