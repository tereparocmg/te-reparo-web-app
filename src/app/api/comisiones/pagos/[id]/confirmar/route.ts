import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/comisiones/pagos/[id]/confirmar — Marcar pago como PAID
// Set status='PAID', paidAt=now, paidById=user.id
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const pago = await prisma.operatorPayment.findUnique({ where: { id } })
    if (!pago) return fail('Pago no encontrado', 404)
    if (pago.status === 'PAID') {
      return fail('El pago ya está confirmado', 400)
    }
    const actualizado = await prisma.operatorPayment.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidById: user.id,
      },
      include: {
        operario: true,
        taller: true,
        commissionEntries: true,
      },
    })
    return ok(normalizeDates(actualizado))
  }, ['SUPER_ADMIN', 'ADMIN'])
}
