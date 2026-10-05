import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

// POST /api/movimientos/gasto — Registrar gasto
// Body: { concepto, monto, categoria, tallerId, notas? }
// Crea registro en Gasto (auditoría) y un Movimiento tipo GASTO con el user.id
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { concepto, monto, categoria, tallerId, notas } = dto
    if (!concepto || !Number.isFinite(Number(monto)) || !tallerId) {
      return fail('Faltan campos: concepto, monto, tallerId', 400)
    }
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(tallerId)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    const montoNum = Number(monto)
    if (montoNum <= 0) return fail('El monto debe ser mayor a 0', 400)
    const ahora = new Date()
    const result = await prisma.$transaction(async (tx) => {
      // 1. Gasto (registro de auditoría detalle)
      const gasto = await tx.gasto.create({
        data: {
          tallerId, concepto, monto: montoNum,
          categoria: categoria || 'Otros', fecha: ahora, notas: notas || null,
        },
      }, { timeout: 30000, maxWait: 10000 })
      // 2. Movimiento de caja
      await tx.movimiento.create({
        data: {
          tallerId, tipo: 'GASTO', concepto, monto: montoNum,
          categoria: categoria || 'Otros', usuarioId: user.id,
          fecha: ahora, notas: notas || null,
        },
      })
      return gasto
    })
    return ok(normalizeDates(result), { status: 201 })
  }, ['SUPER_ADMIN', 'ADMIN'])
}
