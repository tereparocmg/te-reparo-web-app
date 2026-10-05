import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

// GET /api/operarios — Listar todos los operarios (operarios son globales, no por taller)
export async function GET(req: Request) {
  return withAuth(req, async () => {
    const operarios = await prisma.operario.findMany({
      orderBy: { nombre: 'asc' },
    })
    return ok(operarios)
  })
}

// POST /api/operarios — Crear operario (SUPER_ADMIN o ADMIN)
export async function POST(req: Request) {
  return withAuth(req, async () => {
    const body = await parseBody<any>(req)
    const { nombre, telefono, especialidad } = body
    if (!nombre || !especialidad) {
      return fail('Faltan campos obligatorios: nombre, especialidad', 400)
    }
    try {
      const operario = await prisma.operario.create({
        data: {
          nombre,
          telefono: telefono ?? null,
          especialidad,
          activo: body.activo ?? true,
        },
      })
      return ok(operario, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('Violación de unicidad', 409)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
