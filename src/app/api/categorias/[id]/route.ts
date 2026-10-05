import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/categorias/[id] — Ver categoría
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    const categoria = await prisma.categoria.findUnique({ where: { id } })
    if (!categoria || categoria.deletedAt) return fail('Categoría no encontrada', 404)
    return ok(categoria)
  })
}

// PUT /api/categorias/[id] — Actualizar categoría (SUPER_ADMIN o ADMIN)
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const body = await parseBody<any>(req)
    const categoria = await prisma.categoria.findUnique({ where: { id } })
    if (!categoria || categoria.deletedAt) return fail('Categoría no encontrada', 404)
    // ADMIN sólo puede tocar categorías de sus talleres
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(categoria.tallerId)) {
      return fail('No tienes acceso a esa categoría', 403)
    }
    try {
      const actualizada = await prisma.categoria.update({ where: { id }, data: body })
      return ok(actualizada)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Categoría no encontrada', 404)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}

// DELETE /api/categorias/[id] — Hard delete (SUPER_ADMIN o ADMIN)
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const categoria = await prisma.categoria.findUnique({ where: { id } })
    if (!categoria || categoria.deletedAt) return fail('Categoría no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(categoria.tallerId)) {
      return fail('No tienes acceso a esa categoría', 403)
    }
    try {
      await prisma.categoria.delete({ where: { id } })
      return ok({ id })
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Categoría no encontrada', 404)
      if (e?.code === 'P2003') return fail('No se puede eliminar: tiene productos o piezas asociados', 400)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
