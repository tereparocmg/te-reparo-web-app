import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/comisiones/pagos/[id] — Ver un pago a operario con relaciones
// (No hay PUT/DELETE: los pagos son inmutables; el estado cambia solo vía
//  /confirmar o /cancelar)
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const pago = await prisma.operatorPayment.findUnique({
      where: { id },
      include: {
        operario: true,
        taller: true,
        commissionEntries: {
          include: { venta: true, servicio: true },
        },
      },
    })
    if (!pago) return fail('Pago no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(pago.tallerId)) {
      return fail('No tienes acceso a ese pago', 403)
    }
    return ok(normalizeDates(pago))
  })
}
