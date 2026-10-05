import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

// POST /api/clientes/migrar — Reasignar todas las garantías de un cliente a otro
// Body: { deId, aId }  →  Garantia.updateMany({ where: { clienteId: deId }, data: { clienteId: aId } })
export async function POST(req: Request) {
  return withAuth(req, async () => {
    const { deId, aId } = await parseBody<any>(req)
    if (!deId || !aId) return fail('Faltan campos obligatorios: deId, aId', 400)
    if (deId === aId) return fail('deId y aId deben ser distintos', 400)

    const [deCli, aCli] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: deId } }),
      prisma.cliente.findUnique({ where: { id: aId } }),
    ])
    if (!deCli || deCli.deletedAt) return fail('Cliente origen no encontrado', 404)
    if (!aCli || aCli.deletedAt) return fail('Cliente destino no encontrado', 404)

    const result = await prisma.garantia.updateMany({
      where: { clienteId: deId },
      data: { clienteId: aId },
    })
    return ok({ migradas: result.count, deId, aId })
  }, ['SUPER_ADMIN', 'ADMIN'])
}
