import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

// GET /api/talleres — Listar talleres. SUPER_ADMIN ve todos, resto ve sólo los asignados.
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const where =
      user.rol === 'SUPER_ADMIN'
        ? { deletedAt: null }
        : { deletedAt: null, id: { in: user.tallerIds } }
    const talleres = await prisma.taller.findMany({
      where,
      orderBy: { nombre: 'asc' },
    })
    return ok(talleres)
  })
}

// POST /api/talleres — Crear taller (sólo SUPER_ADMIN)
export async function POST(req: Request) {
  return withAuth(req, async () => {
    const body = await parseBody<any>(req)
    const { nombre, direccion, telefono } = body
    if (!nombre || !direccion || !telefono) {
      return fail('Faltan campos obligatorios: nombre, direccion, telefono', 400)
    }
    try {
      const taller = await prisma.taller.create({ data: body })
      return ok(taller, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('Violación de unicidad', 409)
      throw e
    }
  }, ['SUPER_ADMIN'])
}
