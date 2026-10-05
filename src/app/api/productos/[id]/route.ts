import { prisma, parseTags, serializeTags } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/productos/[id] — Ver producto con tags parseados
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const p = await prisma.producto.findUnique({
      where: { id },
      include: { categoria: true },
    })
    if (!p || p.deletedAt) return fail('Producto no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(p.tallerId)) {
      return fail('No tienes acceso a ese producto', 403)
    }
    return ok({ ...p, tags: parseTags(p.tags) })
  })
}

// PUT /api/productos/[id] — Actualizar producto (serializar tags si vienen)
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const body = await parseBody<any>(req)
    const existing = await prisma.producto.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) return fail('Producto no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(existing.tallerId)) {
      return fail('No tienes acceso a ese producto', 403)
    }
    // Validar código de barras único si viene y es distinto
    if (body.codigoBarras && body.codigoBarras !== existing.codigoBarras) {
      const existe = await prisma.producto.findFirst({ where: { codigoBarras: body.codigoBarras, NOT: { id } } })
          || await prisma.pieza.findFirst({ where: { codigoBarras: body.codigoBarras, NOT: { id } } })
      if (existe) return fail('El código de barras ya existe', 409)
    }
    const updateData: any = { ...body }
    if (updateData.tags) updateData.tags = serializeTags(updateData.tags)
    try {
      const producto = await prisma.producto.update({
        where: { id },
        data: updateData,
        include: { categoria: true },
      })
      return ok({ ...producto, tags: parseTags(producto.tags) })
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Producto no encontrado', 404)
      if (e?.code === 'P2002') return fail('El código de barras ya existe', 409)
      if (e?.code === 'P2003') return fail('categoriaId o tallerId no existe', 400)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}

// DELETE /api/productos/[id] — Soft delete (activo: false)
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const existing = await prisma.producto.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) return fail('Producto no encontrado', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(existing.tallerId)) {
      return fail('No tienes acceso a ese producto', 403)
    }
    try {
      const producto = await prisma.producto.update({
        where: { id },
        data: { activo: false, deletedAt: new Date() },
      })
      return ok(producto)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Producto no encontrado', 404)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
