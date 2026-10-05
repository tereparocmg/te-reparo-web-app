import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/pedidos/[id]/aprobar — Aprobar/Rechazar pedido
// Body: { aprobar: boolean, notas? }
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { aprobar, notas } = dto
    if (typeof aprobar !== 'boolean') {
      return fail('Falta campo booleano: aprobar', 400)
    }
    const pedido = await prisma.pedidoInterno.findUnique({ where: { id } })
    if (!pedido) return fail('Pedido no encontrado', 404)
    const actualizado = await prisma.pedidoInterno.update({
      where: { id },
      data: {
        estado: aprobar ? 'APROBADO' : 'RECHAZADO',
        aprobadoPorId: user.id,
        fechaAprobacion: new Date(),
        notas: notas || pedido.notas,
      },
      include: { solicitante: true, taller: true, aprobadoPor: true },
    })
    return ok(normalizeDates(actualizado))
  }, ['SUPER_ADMIN', 'ADMIN'])
}
