import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/servicios/[id] — Ver servicio con relaciones
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const s = await prisma.servicio.findUnique({
      where: { id },
      include: {
        cliente: true, operario: true, taller: true,
        piezasUtilizadas: { include: { pieza: true } },
        garantia: true,
      },
    })
    if (!s) return fail('Servicio no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(s.tallerId)) {
      return fail('No tienes acceso a ese servicio', 403)
    }
    return ok(normalizeDates(s))
  })
}

// PUT /api/servicios/[id] — Actualizar servicio
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const body = await parseBody<any>(req)
    const existing = await prisma.servicio.findUnique({ where: { id } })
    if (!existing) return fail('Servicio no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(existing.tallerId)) {
      return fail('No tienes acceso a ese servicio', 403)
    }
    // No permitir alterar PKs ni folio desde el body
    const { id: _id, folio: _folio, createdAt: _c, ...data } = body
    try {
      const s = await prisma.servicio.update({
        where: { id },
        data,
        include: {
          cliente: true, operario: true,
          piezasUtilizadas: { include: { pieza: true } },
        },
      })
      return ok(normalizeDates(s))
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Servicio no encontrado', 404)
      if (e?.code === 'P2003') return fail('Referencia inválida (clienteId/operarioId/tallerId)', 400)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
