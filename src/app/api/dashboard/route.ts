import { prisma } from '@/lib/prisma'
import { ok, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/dashboard — Resumen ejecutivo
// Devuelve: { ingresosHoy, gastosHoy, comprasHoy, balanceHoy,
//   ventasCountHoy, serviciosCountHoy, totalProductos, totalPiezas,
//   productosStockBajo, pedidosPendientes }
// Filtra por taller para no-superadmin (o por ?tallerId=X si se pasa)
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const tallerIdParam = getParam(req, 'tallerId')
    let tallerIds: string[] | undefined
    if (user.rol === 'SUPER_ADMIN') {
      tallerIds = tallerIdParam ? [tallerIdParam] : undefined
    } else {
      tallerIds =
        tallerIdParam && user.tallerIds.includes(tallerIdParam)
          ? [tallerIdParam]
          : user.tallerIds
    }
    const whereTaller = tallerIds ? { tallerId: { in: tallerIds } } : {}

    // Rango "hoy"
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)
    const rangoFecha = { gte: hoy, lt: manana }

    // Movimientos del día
    const movsHoy = await prisma.movimiento.findMany({
      where: { ...whereTaller, fecha: rangoFecha },
      select: { tipo: true, monto: true },
    })
    const ingresosHoy = Math.round(
      movsHoy.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0) * 100,
    ) / 100
    const gastosHoy = Math.round(
      movsHoy.filter((m) => m.tipo === 'GASTO').reduce((s, m) => s + m.monto, 0) * 100,
    ) / 100
    const comprasHoy = Math.round(
      movsHoy.filter((m) => m.tipo === 'COMPRA').reduce((s, m) => s + m.monto, 0) * 100,
    ) / 100
    const balanceHoy = Math.round((ingresosHoy - gastosHoy - comprasHoy) * 100) / 100

    // Counts del día
    const [ventasCountHoy, serviciosCountHoy] = await Promise.all([
      prisma.venta.count({
        where: { ...whereTaller, createdAt: rangoFecha, estado: 'COMPLETADA' },
      }),
      prisma.servicio.count({
        where: { ...whereTaller, createdAt: rangoFecha },
      }),
    ])

    // Inventario
    const [totalProductos, totalPiezas, productosStockBajo, pedidosPendientes] =
      await Promise.all([
        prisma.producto.count({ where: { ...whereTaller, activo: true } }),
        prisma.pieza.count({ where: { ...whereTaller, activo: true } }),
        prisma.producto.count({
          where: {
            ...whereTaller,
            activo: true,
            stock: { lte: prisma.producto.fields.stockMinimo },
          },
        }),
        prisma.pedidoInterno.count({
          where: { ...whereTaller, estado: 'PENDIENTE' },
        }),
      ])

    return ok({
      ingresosHoy,
      gastosHoy,
      comprasHoy,
      balanceHoy,
      ventasCountHoy,
      serviciosCountHoy,
      totalProductos,
      totalPiezas,
      productosStockBajo,
      pedidosPendientes,
    })
  })
}
