import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, withAuth } from '@/lib/api-helpers'

// GET /api/comisiones/mis-pagos — Pagos a operarios que incluyan comisiones por
// ventas hechas por el usuario actual.
// Workaround: OperatorPayment no tiene FK a Usuario, solo a Operario.
// Filtramos los pagos cuyo operario tiene al menos una commissionEntry asociada
// a una venta cuyo vendedor es el usuario actual.
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const pagos = await prisma.operatorPayment.findMany({
      where: {
        commissionEntries: {
          some: { venta: { vendedorId: user.id } },
        },
      },
      include: {
        operario: true,
        commissionEntries: {
          where: { venta: { vendedorId: user.id } },
          include: { venta: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(normalizeDates(pagos))
  })
}
