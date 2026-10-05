import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'
import { generateFolio } from '@/lib/folio'

// POST /api/movimientos/compra — Registrar compra
// Body: { folio?, tallerId, proveedor?, items: [{ productoId, cantidad, costoUnitario, subtotal }], total? }
// Transacción: Compra + CompraItem, incrementa producto.stock, crea Movimiento tipo COMPRA
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { tallerId, proveedor, items, notas } = dto
    if (!tallerId || !Array.isArray(items) || items.length === 0) {
      return fail('Faltan campos: tallerId, items[]', 400)
    }
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(tallerId)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    const folio = dto.folio || generateFolio('C')
    const total = Number(dto.total ?? items.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0))
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date()
    try {
      const compra = await prisma.$transaction(async (tx) => {
        const c = await tx.compra.create({
          data: {
            folio, tallerId, proveedor: proveedor || null, total, fecha,
            notas: notas || null,
            items: {
              create: items.map((i: any) => ({
                productoId: i.productoId || null, piezaId: i.piezaId || null,
                cantidad: Number(i.cantidad), costoUnitario: Number(i.costoUnitario),
                subtotal: Number(i.subtotal),
              }, { timeout: 30000, maxWait: 10000 })),
            },
          },
          include: { items: true },
        })
        // Incrementar stock y actualizar costo unitario
        for (const item of items) {
          if (item.productoId) {
            const p = await tx.producto.findUnique({ where: { id: item.productoId } })
            if (p) {
              await tx.producto.update({
                where: { id: item.productoId },
                data: { stock: p.stock + Number(item.cantidad), precioCosto: Number(item.costoUnitario) },
              })
            }
          }
          if (item.piezaId) {
            const p = await tx.pieza.findUnique({ where: { id: item.piezaId } })
            if (p) {
              await tx.pieza.update({
                where: { id: item.piezaId },
                data: { stock: p.stock + Number(item.cantidad), costoUnitario: Number(item.costoUnitario) },
              })
            }
          }
        }
        await tx.movimiento.create({
          data: {
            tallerId, tipo: 'COMPRA', concepto: `Compra ${folio}`,
            monto: total, categoria: 'Inventario',
            usuarioId: user.id, compraId: c.id, fecha,
          },
        })
        return c
      })
      return ok(normalizeDates(compra), { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('Folio duplicado, reintente', 409)
      if (e?.code === 'P2003') return fail('Referencia inválida (productoId/piezaId/tallerId)', 400)
      return fail(e.message || 'Error al crear compra', 400)
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
