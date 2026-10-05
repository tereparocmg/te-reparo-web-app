import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/garantias/[id]/reasignar — Reasignar garantía a otro cliente
// Body: { clienteId }
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { clienteId } = dto
    if (!clienteId) return fail('Falta campo: clienteId', 400)
    const garantia = await prisma.garantia.findUnique({ where: { id } })
    if (!garantia) return fail('Garantía no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(garantia.tallerId)) {
      return fail('No tienes acceso a esa garantía', 403)
    }
    try {
      const actualizada = await prisma.garantia.update({
        where: { id },
        data: { clienteId },
        include: {
          cliente: true, venta: true, servicio: true,
          reclamaciones: true, taller: true,
        },
      })
      return ok(normalizeDates(actualizada))
    } catch (e: any) {
      if (e?.code === 'P2003') return fail('Referencia inválida (clienteId)', 400)
      return fail(e.message || 'Error al reasignar garantía', 400)
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
