import { prisma } from '@/lib/prisma'
import { ok, fail, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// POST /api/categorias/[id]/toggle — Invertir el flag `activa` (SUPER_ADMIN o ADMIN)
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const categoria = await prisma.categoria.findUnique({ where: { id } })
    if (!categoria || categoria.deletedAt) return fail('Categoría no encontrada', 404)
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(categoria.tallerId)) {
      return fail('No tienes acceso a esa categoría', 403)
    }
    try {
      const actualizada = await prisma.categoria.update({
        where: { id },
        data: { activa: !categoria.activa },
      })
      return ok(actualizada)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Categoría no encontrada', 404)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
