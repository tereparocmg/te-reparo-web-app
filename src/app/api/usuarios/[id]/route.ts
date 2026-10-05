import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/usuarios/[id] — Ver usuario (SUPER_ADMIN o propio usuario)
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async (user) => {
    const allow = user.rol === 'SUPER_ADMIN' || user.id === id
    if (!allow) return fail('No autorizado', 403)

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: { talleres: { include: { taller: true } } },
    })
    if (!usuario) return fail('Usuario no encontrado', 404)
    const { password, talleres, ...userData } = usuario
    return ok({ ...userData, tallerIds: talleres.map((ut) => ut.tallerId) })
  })
}

// PUT /api/usuarios/[id] — Actualizar usuario (sólo SUPER_ADMIN)
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    const body = await parseBody<any>(req)
    const { tallerIds, ...userData } = body

    // Reasignar talleres si viene el array
    if (Array.isArray(tallerIds)) {
      await prisma.usuarioTaller.deleteMany({ where: { usuarioId: id } })
      if (tallerIds.length > 0) {
        await prisma.usuarioTaller.createMany({
          data: tallerIds.map((tallerId: string) => ({ usuarioId: id, tallerId })),
        })
      }
    }

    try {
      const usuario = await prisma.usuario.update({
        where: { id },
        data: {
          ...userData,
          email: userData.email ? String(userData.email).toLowerCase() : undefined,
        },
        include: { talleres: { include: { taller: true } } },
      })
      const { password, talleres, ...updated } = usuario
      return ok({ ...updated, tallerIds: talleres.map((ut) => ut.tallerId) })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('El email ya está registrado', 409)
      if (e?.code === 'P2025') return fail('Usuario no encontrado', 404)
      if (e?.code === 'P2003') return fail('Taller inválido (FK)', 400)
      throw e
    }
  }, ['SUPER_ADMIN'])
}

// DELETE /api/usuarios/[id] — Soft delete (sólo SUPER_ADMIN)
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    try {
      const usuario = await prisma.usuario.update({
        where: { id },
        data: { activo: false, deletedAt: new Date() },
      })
      const { password, ...userData } = usuario
      return ok(userData)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Usuario no encontrado', 404)
      throw e
    }
  }, ['SUPER_ADMIN'])
}
