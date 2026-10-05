import { prisma, parseTags, serializeTags } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/piezas/[id] — Ver pieza con tags parseados
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const p = await prisma.pieza.findUnique({
      where: { id },
      include: { categoria: true },
    })
    if (!p || p.deletedAt) return fail('Pieza no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(p.tallerId)) {
      return fail('No tienes acceso a esa pieza', 403)
    }
    return ok({ ...p, tags: parseTags(p.tags) })
  })
}

// PUT /api/piezas/[id] — Actualizar pieza (serializar tags si vienen)
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const body = await parseBody<any>(req)
    const existing = await prisma.pieza.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) return fail('Pieza no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(existing.tallerId)) {
      return fail('No tienes acceso a esa pieza', 403)
    }
    // Validar código de barras único si viene y es distinto
    if (body.codigoBarras && body.codigoBarras !== existing.codigoBarras) {
      const existe = await prisma.pieza.findFirst({ where: { codigoBarras: body.codigoBarras, NOT: { id } } })
          || await prisma.producto.findFirst({ where: { codigoBarras: body.codigoBarras, NOT: { id } } })
      if (existe) return fail('El código de barras ya existe', 409)
    }
    const updateData: any = { ...body }
    if (updateData.tags) updateData.tags = serializeTags(updateData.tags)
    try {
      const pieza = await prisma.pieza.update({
        where: { id },
        data: updateData,
        include: { categoria: true },
      })
      return ok({ ...pieza, tags: parseTags(pieza.tags) })
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Pieza no encontrada', 404)
      if (e?.code === 'P2002') return fail('El código de barras ya existe', 409)
      if (e?.code === 'P2003') return fail('categoriaId o tallerId no existe', 400)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}

// DELETE /api/piezas/[id] — Soft delete (activo: false)
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const existing = await prisma.pieza.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) return fail('Pieza no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(existing.tallerId)) {
      return fail('No tienes acceso a esa pieza', 403)
    }
    try {
      const pieza = await prisma.pieza.update({
        where: { id },
        data: { activo: false, deletedAt: new Date() },
      })
      return ok(pieza)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Pieza no encontrada', 404)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
