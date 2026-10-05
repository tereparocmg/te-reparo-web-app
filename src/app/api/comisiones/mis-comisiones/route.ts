import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/comisiones/mis-comisiones — Comisiones por ventas hechas por el usuario actual
// Workaround: el usuario actual (Usuario/Vendedor) no es Operario, pero la FK de
// CommissionEntry apunta a Operario. Filtramos por venta.vendedorId = user.id
// (las comisiones son generadas por ventas/servicios y, aunque el operario es el
// receptor de la comisión, el vendedor "ve" las comisiones sobre sus ventas).
// Query: ?soloPendientes=true → filtra operatorPaymentId=null
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const soloPendientes = getParam(req, 'soloPendientes') === 'true'
    const where: any = {
      ventaId: { not: null },
      venta: { vendedorId: user.id },
    }
    if (soloPendientes) {
      where.operatorPaymentId = null
      where.estado = 'ACTIVE'
    }
    const entries = await prisma.commissionEntry.findMany({
      where,
      include: {
        operario: true,
        venta: true,
        servicio: true,
        operatorPayment: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    const total = Math.round(
      entries.reduce((s, e) => s + e.amount, 0) * 100,
    ) / 100
    return ok(normalizeDates({ entries, total, count: entries.length }))
  })
}
