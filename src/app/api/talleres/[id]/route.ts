import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/talleres/[id] — Ver taller (cualquier autenticado con acceso)
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const allow = user.rol === 'SUPER_ADMIN' || user.tallerIds.includes(id)
    if (!allow) return fail('No autorizado para este taller', 403)
    const taller = await prisma.taller.findUnique({ where: { id } })
    if (!taller) return fail('Taller no encontrado', 404)
    return ok(taller)
  })
}

// PUT /api/talleres/[id] — Actualizar taller (SUPER_ADMIN o ADMIN asignado)
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const isAdminAssigned =
      user.rol === 'SUPER_ADMIN' || (user.rol === 'ADMIN' && user.tallerIds.includes(id))
    if (!isAdminAssigned) return fail('No autorizado para este taller', 403)

    const body = await parseBody<any>(req)
    try {
      const taller = await prisma.taller.update({ where: { id }, data: body })
      return ok(taller)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Taller no encontrado', 404)
      if (e?.code === 'P2002') return fail('Violación de unicidad', 409)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}

// DELETE /api/talleres/[id] — Soft delete (sólo SUPER_ADMIN)
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    try {
      const taller = await prisma.taller.update({
        where: { id },
        data: { activo: false, deletedAt: new Date() },
      })
      return ok(taller)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Taller no encontrado', 404)
      throw e
    }
  }, ['SUPER_ADMIN'])
}
