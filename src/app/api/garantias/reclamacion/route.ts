import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

// POST /api/garantias/reclamacion — Crear reclamación de garantía
// Body: { garantiaId, descripcion, resolucion?, motivoResolucion? }
// Default resolucion='REPARACION_SIN_COSTO' si no viene.
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { garantiaId, descripcion, resolucion, motivoResolucion } = dto
    if (!garantiaId || !descripcion) {
      return fail('Faltan campos: garantiaId, descripcion', 400)
    }
    const garantia = await prisma.garantia.findUnique({ where: { id: garantiaId } })
    if (!garantia) return fail('Garantía no encontrada', 404)
    try {
      const reclamo = await prisma.reclamacionGarantia.create({
        data: {
          garantiaId,
          descripcion,
          resolucion: resolucion || 'REPARACION_SIN_COSTO',
          motivoResolucion: motivoResolucion || null,
          atendidaPorId: user.id,
        },
        include: { garantia: true },
      })
      return ok(normalizeDates(reclamo), { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2003') return fail('Referencia inválida (garantiaId)', 400)
      return fail(e.message || 'Error al crear reclamación', 400)
    }
  })
}
