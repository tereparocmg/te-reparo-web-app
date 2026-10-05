import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/devoluciones/[id]/revisar — Aprobar/Rechazar devolución
// Body: { estado: 'APROBADA' | 'RECHAZADA', notas? }
// Si APROBADA: restaura stock al inventario en una transacción.
//   - Para devoluciones con productoId: +cantidad al stock del producto.
//   - Para devoluciones con piezaId: +cantidad al stock de la pieza.
// Registra revisadaPorId=usuario actual, fechaRevision=now.
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { estado, notas } = dto
    if (estado !== 'APROBADA' && estado !== 'RECHAZADA') {
      return fail('estado debe ser APROBADA o RECHAZADA', 400)
    }
    const dev = await prisma.devolucion.findUnique({ where: { id } })
    if (!dev) return fail('Devolución no encontrada', 404)
    if (dev.estado !== 'PENDIENTE_REVISION') {
      return fail('La devolución ya fue revisada', 400)
    }
    const actualizada = await prisma.$transaction(async (tx) => {
      if (estado === 'APROBADA') {
        if (dev.productoId) {
          const p = await tx.producto.findUnique({ where: { id: dev.productoId } })
          if (p) {
            await tx.producto.update({
              where: { id: dev.productoId },
              data: { stock: p.stock + dev.cantidad },
            }, { timeout: 30000, maxWait: 10000 })
          }
        } else if (dev.piezaId) {
          const pz = await tx.pieza.findUnique({ where: { id: dev.piezaId } })
          if (pz) {
            await tx.pieza.update({
              where: { id: dev.piezaId },
              data: { stock: pz.stock + dev.cantidad },
            })
          }
        }
      }
      return await tx.devolucion.update({
        where: { id },
        data: {
          estado,
          revisadaPorId: user.id,
          fechaRevision: new Date(),
          notasRevision: notas || null,
        },
        include: { taller: true, venta: true, servicio: true, revisadaPor: true },
      })
    })
    return ok(normalizeDates(actualizada))
  }, ['SUPER_ADMIN', 'ADMIN'])
}
