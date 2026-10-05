import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

// GET /api/clientes — Listar todos los clientes (clientes son globales, no por taller)
export async function GET(req: Request) {
  return withAuth(req, async () => {
    const clientes = await prisma.cliente.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' },
    })
    return ok(clientes)
  })
}

// POST /api/clientes — Crear cliente (SUPER_ADMIN, ADMIN o VENDEDOR)
export async function POST(req: Request) {
  return withAuth(req, async () => {
    const body = await parseBody<any>(req)
    const { nombre, telefono, email, tipo, rfc, direccion, esClienteGeneral } = body
    if (!nombre) return fail('Falta campo obligatorio: nombre', 400)
    try {
      const cliente = await prisma.cliente.create({
        data: {
          nombre,
          telefono: telefono ?? null,
          email: email ?? null,
          tipo: tipo ?? 'PERSONA_NATURAL',
          rfc: rfc ?? null,
          direccion: direccion ?? null,
          esClienteGeneral: esClienteGeneral ?? false,
        },
      })
      return ok(cliente, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('Violación de unicidad', 409)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'])
}
