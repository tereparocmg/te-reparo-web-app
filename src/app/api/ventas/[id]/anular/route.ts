import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/ventas/[id]/anular — Anular venta (restaura stock, invalida garantías,
// cancela comisiones no pagadas, elimina movimiento, marca estado=ANULADA)
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const venta = await prisma.venta.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!venta) return fail('Venta no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(venta.tallerId)) {
      return fail('No tienes acceso a esa venta', 403)
    }
    if (venta.estado === 'ANULADA') return fail('La venta ya está anulada', 400)
    const anulada = await prisma.$transaction(async (tx) => {
      // 1. Restaurar stock de cada item
      for (const item of venta.items) {
        const prod = await tx.producto.findUnique({ where: { id: item.productoId } })
        if (prod) {
          await tx.producto.update({
            where: { id: item.productoId },
            data: { stock: prod.stock + item.cantidad },
          }, { timeout: 30000, maxWait: 10000 })
        }
      }
      // 2. Invalidar garantías
      await tx.garantia.updateMany({
        where: { ventaId: id },
        data: { estado: 'INVALIDADA' },
      })
      // 3. Cancelar comisiones no pagadas
      await tx.commissionEntry.updateMany({
        where: { ventaId: id, estado: 'ACTIVE', operatorPaymentId: null },
        data: { estado: 'CANCELLED' },
      })
      // 4. Eliminar movimientos asociados
      await tx.movimiento.deleteMany({ where: { ventaId: id } })
      // 5. Marcar venta como ANULADA
      return await tx.venta.update({
        where: { id },
        data: { estado: 'ANULADA' },
        include: {
          items: { include: { producto: true } },
          cliente: true, garantia: true,
        },
      })
    })
    return ok(normalizeDates(anulada))
  }, ['SUPER_ADMIN', 'ADMIN'])
}
