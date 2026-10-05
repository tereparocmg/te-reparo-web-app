import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/pedidos/[id]/convertir — Marcar pedido como CONVERTIDO
// (cambio de estado; el flujo real de conversión a compra/solicitud externa
// se gestiona fuera de esta ruta — aquí solo se actualiza el estado)
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    const pedido = await prisma.pedidoInterno.findUnique({ where: { id } })
    if (!pedido) return fail('Pedido no encontrado', 404)
    const actualizado = await prisma.pedidoInterno.update({
      where: { id },
      data: { estado: 'CONVERTIDO' },
      include: { solicitante: true, taller: true, aprobadoPor: true },
    })
    return ok(normalizeDates(actualizado))
  }, ['SUPER_ADMIN', 'ADMIN'])
}
