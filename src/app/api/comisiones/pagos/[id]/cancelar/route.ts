import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/comisiones/pagos/[id]/cancelar — Cancelar pago pendiente
// El schema de EstadoOperatorPayment solo tiene PENDING y PAID (no CANCELLED).
// Por eso "cancelar" = desvincular las comisiones (operatorPaymentId=null) y
// eliminar el OperatorPayment. Si el pago está PAID, no se puede cancelar.
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    const pago = await prisma.operatorPayment.findUnique({ where: { id } })
    if (!pago) return fail('Pago no encontrado', 404)
    if (pago.status === 'PAID') {
      return fail('No se puede cancelar un pago ya confirmado (PAID)', 400)
    }
    await prisma.$transaction(async (tx) => {
      await tx.commissionEntry.updateMany({
        where: { operatorPaymentId: id },
        data: { operatorPaymentId: null },
      }, { timeout: 30000, maxWait: 10000 })
      await tx.operatorPayment.delete({ where: { id } })
    })
    return ok({ ok: true, cancelled: id })
  }, ['SUPER_ADMIN', 'ADMIN'])
}
