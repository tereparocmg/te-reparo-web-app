import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// PUT /api/configuracion/taller/[id] — Actualizar configuración por taller
// Roles: SUPER_ADMIN o ADMIN (el ADMIN debe estar asignado al taller).
// Body: campos editables del Taller (plantillaGarantia, limiteDescuento,
// garantiaProductoDias, garantiaServicioDias, horarioApertura, horarioCierre,
// metodosPago, formatoTicket, encargado, direccion, telefono, etc.)
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const taller = await prisma.taller.findUnique({ where: { id } })
    if (!taller) return fail('Taller no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(id)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    const permitidos: string[] = [
      'nombre', 'direccion', 'telefono', 'encargado', 'rfc', 'razonSocial',
      'ciudad', 'codigoPostal', 'limiteDescuento', 'horarioApertura', 'horarioCierre',
      'metodosPago', 'garantiaProductoDias', 'garantiaServicioDias',
      'plantillaGarantia', 'formatoTicket', 'activo',
    ]
    const data: any = {}
    for (const k of permitidos) {
      if (k in dto) data[k] = dto[k]
    }
    if (Object.keys(data).length === 0) {
      return fail('Ningún campo válido para actualizar', 400)
    }
    const actualizado = await prisma.taller.update({ where: { id }, data })
    return ok(normalizeDates(actualizado))
  }, ['SUPER_ADMIN', 'ADMIN'])
}
