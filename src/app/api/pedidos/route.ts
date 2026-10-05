import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth, getParam } from '@/lib/api-helpers'
import { generateFolio } from '@/lib/folio'

// GET /api/pedidos — Listar pedidos internos (?tallerId=X)
// ADMIN/VENDEDOR filtra por taller(es) propio(s); SUPER_ADMIN ve todo o filtra
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const tallerId = getParam(req, 'tallerId')
    const where: any = {}
    if (user.rol === 'SUPER_ADMIN') {
      if (tallerId) where.tallerId = tallerId
    } else {
      where.tallerId = tallerId && user.tallerIds.includes(tallerId)
        ? tallerId
        : { in: user.tallerIds }
    }
    const pedidos = await prisma.pedidoInterno.findMany({
      where,
      include: { solicitante: true, taller: true, aprobadoPor: true },
      orderBy: { createdAt: 'desc' },
    })
    return ok(normalizeDates(pedidos))
  })
}

// POST /api/pedidos — Crear pedido interno (estado=PENDIENTE, folio P-XXX)
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { descripcion, cantidad, urgencia, tallerId, notas } = dto
    if (!descripcion || !tallerId || !cantidad) {
      return fail('Faltan campos: descripcion, cantidad, tallerId', 400)
    }
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(tallerId)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    try {
      const pedido = await prisma.pedidoInterno.create({
        data: {
          folio: generateFolio('P'),
          tallerId,
          solicitanteId: user.id,
          descripcion,
          cantidad: Number(cantidad),
          urgencia: urgencia || 'MEDIA',
          estado: 'PENDIENTE',
          notas: notas || null,
        },
        include: { solicitante: true, taller: true, aprobadoPor: true },
      })
      return ok(normalizeDates(pedido), { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('Folio duplicado, reintente', 409)
      if (e?.code === 'P2003') return fail('Referencia inválida (tallerId)', 400)
      return fail(e.message || 'Error al crear pedido', 400)
    }
  })
}
