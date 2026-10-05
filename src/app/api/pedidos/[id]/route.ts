import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/pedidos/[id] — Ver pedido con relaciones
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const pedido = await prisma.pedidoInterno.findUnique({
      where: { id },
      include: { solicitante: true, taller: true, aprobadoPor: true },
    })
    if (!pedido) return fail('Pedido no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(pedido.tallerId)) {
      return fail('No tienes acceso a ese pedido', 403)
    }
    return ok(normalizeDates(pedido))
  })
}

// DELETE /api/pedidos/[id] — Eliminar pedido (solo solicitante o ADMIN/SUPER_ADMIN)
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const pedido = await prisma.pedidoInterno.findUnique({ where: { id } })
    if (!pedido) return fail('Pedido no encontrado', 404)
    const esAutor = pedido.solicitanteId === user.id
    const esAdmin = user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN'
    if (!esAutor && !esAdmin) {
      return fail('Solo el solicitante o un administrador puede eliminar el pedido', 403)
    }
    await prisma.pedidoInterno.delete({ where: { id } })
    return ok({ ok: true })
  })
}
