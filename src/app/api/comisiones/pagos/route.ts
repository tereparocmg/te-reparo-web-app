import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth, getParam } from '@/lib/api-helpers'
import { generateFolio } from '@/lib/folio'

// GET /api/comisiones/pagos — Listar todos los pagos a operarios (?tallerId=X)
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
    const pagos = await prisma.operatorPayment.findMany({
      where,
      include: {
        operario: true,
        taller: true,
        commissionEntries: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(normalizeDates(pagos))
  }, ['SUPER_ADMIN', 'ADMIN'])
}

// POST /api/comisiones/pagos — Crear pago a operario
// Body: { operarioId, tallerId, commissionEntryIds: [string], notas? }
// Transacción: crea OperatorPayment (folio OP-XXX, status=PENDING) + vincula entries
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { operarioId, tallerId, commissionEntryIds, notas } = dto
    if (!operarioId || !tallerId || !Array.isArray(commissionEntryIds) || commissionEntryIds.length === 0) {
      return fail('Faltan campos: operarioId, tallerId, commissionEntryIds[]', 400)
    }
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(tallerId)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    try {
      const pago = await prisma.$transaction(async (tx) => {
        const entradas = await tx.commissionEntry.findMany({
          where: {
            id: { in: commissionEntryIds },
            estado: 'ACTIVE',
            operatorPaymentId: null,
          },
        }, { timeout: 30000, maxWait: 10000 })
        if (entradas.length === 0) {
          throw new Error('No hay comisiones válidas (puede que ya estén pagadas o canceladas)')
        }
        const amount = Math.round(
          entradas.reduce((s, ce) => s + ce.amount, 0) * 100,
        ) / 100
        const nuevo = await tx.operatorPayment.create({
          data: {
            folio: generateFolio('OP'),
            operarioId,
            tallerId,
            amount,
            date: new Date(),
            status: 'PENDING',
            notas: notas || null,
          },
        })
        await tx.commissionEntry.updateMany({
          where: { id: { in: entradas.map((e) => e.id) } },
          data: { operatorPaymentId: nuevo.id },
        })
        return nuevo
      })
      const pagoConRel = await prisma.operatorPayment.findUnique({
        where: { id: pago.id },
        include: { operario: true, taller: true, commissionEntries: true },
      })
      return ok(normalizeDates(pagoConRel), { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('Folio duplicado, reintente', 409)
      if (e?.code === 'P2003') return fail('Referencia inválida (operarioId/tallerId)', 400)
      return fail(e.message || 'Error al crear pago', 400)
    }
  })
}
