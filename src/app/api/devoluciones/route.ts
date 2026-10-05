import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth, getParam } from '@/lib/api-helpers'
import { generateFolio } from '@/lib/folio'

// GET /api/devoluciones — Listar devoluciones (?tallerId=X)
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
    const devs = await prisma.devolucion.findMany({
      where,
      include: { taller: true, venta: true, servicio: true, revisadaPor: true },
      orderBy: { createdAt: 'desc' },
    })
    return ok(normalizeDates(devs))
  })
}

// POST /api/devoluciones — Crear devolución (estado=PENDIENTE_REVISION, folio D-XXX)
// Body: { ventaId?, servicioId?, motivo, tallerId, clienteId, notas?, tipo?, cantidad?, productoId?, piezaId? }
// Nota: el stock se restaura recién cuando la devolución es APROBADA (ver /revisar)
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { ventaId, servicioId, motivo, tallerId, notas, tipo, cantidad, productoId, piezaId } = dto
    if (!motivo || !tallerId) {
      return fail('Faltan campos: motivo, tallerId', 400)
    }
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(tallerId)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    // Derivar tipo si no viene explícito
    const tipoFinal: 'PRODUCTO' | 'PIEZA' = tipo || (servicioId ? 'PIEZA' : 'PRODUCTO')
    try {
      const dev = await prisma.devolucion.create({
        data: {
          folio: generateFolio('D'),
          tallerId,
          tipo: tipoFinal,
          ventaId: ventaId || null,
          servicioId: servicioId || null,
          productoId: productoId || null,
          piezaId: piezaId || null,
          cantidad: Number(cantidad) || 1,
          motivo,
          estado: 'PENDIENTE_REVISION',
        },
        include: { taller: true, venta: true, servicio: true, revisadaPor: true },
      })
      return ok(normalizeDates(dev), { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('Folio duplicado, reintente', 409)
      if (e?.code === 'P2003') return fail('Referencia inválida (ventaId/servicioId/productoId/piezaId)', 400)
      return fail(e.message || 'Error al crear devolución', 400)
    }
  })
}
