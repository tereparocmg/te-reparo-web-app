import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

// GET /api/usuarios — Listar todos los usuarios (sólo SUPER_ADMIN)
export async function GET(req: Request) {
  return withAuth(req, async () => {
    const usuarios = await prisma.usuario.findMany({
      where: { deletedAt: null },
      include: { talleres: { include: { taller: true } } },
      orderBy: { nombre: 'asc' },
    })
    const data = usuarios.map(({ password, talleres, ...u }) => ({
      ...u,
      tallerIds: talleres.map((ut) => ut.tallerId),
    }))
    return ok(data)
  }, ['SUPER_ADMIN'])
}

// POST /api/usuarios — Crear usuario (sólo SUPER_ADMIN)
export async function POST(req: Request) {
  return withAuth(req, async () => {
    const body = await parseBody<any>(req)
    const { email, password, nombre, rol, telefono, tallerIds } = body

    if (!email || !password || !nombre || !rol) {
      return fail('Faltan campos obligatorios: email, password, nombre, rol', 400)
    }

    try {
      const usuario = await prisma.usuario.create({
        data: {
          email: String(email).toLowerCase(),
          password,
          nombre,
          rol,
          telefono: telefono ?? null,
          talleres: Array.isArray(tallerIds) && tallerIds.length
            ? { create: tallerIds.map((tallerId: string) => ({ tallerId })) }
            : undefined,
        },
        include: { talleres: { include: { taller: true } } },
      })
      const { password: _pwd, talleres, ...userData } = usuario
      return ok({ ...userData, tallerIds: talleres.map((ut) => ut.tallerId) }, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('El email ya está registrado', 409)
      if (e?.code === 'P2003') return fail('Taller inválido (FK)', 400)
      throw e
    }
  }, ['SUPER_ADMIN'])
}
