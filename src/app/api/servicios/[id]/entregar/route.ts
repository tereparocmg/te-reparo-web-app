import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'
import { generateFolio, addDays } from '@/lib/folio'

type Params = { params: Promise<{ id: string }> }

// POST /api/servicios/[id]/entregar — Marca servicio como ENTREGADO y crea garantía
// Body: { garantiaDias, cobertura? }
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const body = await parseBody<any>(req)
    const garantiaDias = Number(body.garantiaDias ?? 0)
    if (!Number.isFinite(garantiaDias) || garantiaDias < 0) {
      return fail('garantiaDias debe ser un número no negativo', 400)
    }
    const servicio = await prisma.servicio.findUnique({ where: { id } })
    if (!servicio) return fail('Servicio no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(servicio.tallerId)) {
      return fail('No tienes acceso a ese servicio', 403)
    }
    const fechaEntrega = new Date()
    const result = await prisma.$transaction(async (tx) => {
      // 1. Marcar servicio como entregado + pagado
      await tx.servicio.update({
        where: { id },
        data: { estado: 'ENTREGADO', fechaEntrega, pagado: true },
      }, { timeout: 30000, maxWait: 10000 })
      // 2. Crear garantía de servicio (tipo=SERVICIO)
      if (garantiaDias > 0) {
        await tx.garantia.create({
          data: {
            folio: generateFolio('G'), tallerId: servicio.tallerId,
            clienteId: servicio.clienteId, servicioId: id, tipo: 'SERVICIO',
            fechaInicio: fechaEntrega, duracionDias: garantiaDias,
            fechaVencimiento: addDays(fechaEntrega, garantiaDias),
            descripcionCobertura: body.cobertura || 'Garantía por servicio de reparación.',
            estado: 'ACTIVA', emitidaPorId: user.id,
          },
        })
      }
      return await tx.servicio.findUnique({
        where: { id },
        include: {
          piezasUtilizadas: { include: { pieza: true } },
          garantia: true,
        },
      })
    })
    return ok(normalizeDates(result))
  })
}
