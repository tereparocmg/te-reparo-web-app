import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/operarios/[id] — Ver operario
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    const operario = await prisma.operario.findUnique({ where: { id } })
    if (!operario) return fail('Operario no encontrado', 404)
    return ok(operario)
  })
}

// PUT /api/operarios/[id] — Actualizar operario (SUPER_ADMIN o ADMIN)
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    const body = await parseBody<any>(req)
    try {
      const operario = await prisma.operario.update({ where: { id }, data: body })
      return ok(operario)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Operario no encontrado', 404)
      if (e?.code === 'P2002') return fail('Violación de unicidad', 409)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}

// DELETE /api/operarios/[id] — Soft delete (sólo SUPER_ADMIN)
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    try {
      const operario = await prisma.operario.update({
        where: { id },
        data: { activo: false },
      })
      return ok(operario)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Operario no encontrado', 404)
      throw e
    }
  }, ['SUPER_ADMIN'])
}
