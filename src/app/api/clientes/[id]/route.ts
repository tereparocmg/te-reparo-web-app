import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET /api/clientes/[id] — Ver cliente
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    const cliente = await prisma.cliente.findUnique({ where: { id } })
    if (!cliente || cliente.deletedAt) return fail('Cliente no encontrado', 404)
    return ok(cliente)
  })
}

// PUT /api/clientes/[id] — Actualizar cliente (SUPER_ADMIN, ADMIN o VENDEDOR)
// Nota: el campo esClienteGeneral NO se puede modificar desde aquí (lo gestiona el seed).
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    const body = await parseBody<any>(req)
    const { esClienteGeneral, ...resto } = body
    try {
      const cliente = await prisma.cliente.update({ where: { id }, data: resto })
      return ok(cliente)
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Cliente no encontrado', 404)
      if (e?.code === 'P2002') return fail('Violación de unicidad', 409)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'])
}

// DELETE /api/clientes/[id] — Hard delete (SUPER_ADMIN o ADMIN)
// Cliente General (id === 'cliente-general' o esClienteGeneral=true) no se puede eliminar.
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  return withAuth(req, async () => {
    if (id === 'cliente-general') return fail('No se puede eliminar el cliente general', 400)
    const cli = await prisma.cliente.findUnique({ where: { id } })
    if (!cli || cli.deletedAt) return fail('Cliente no encontrado', 404)
    if (cli.esClienteGeneral) return fail('No se puede eliminar el cliente general', 400)
    try {
      await prisma.cliente.delete({ where: { id } })
      return ok({ id })
    } catch (e: any) {
      if (e?.code === 'P2025') return fail('Cliente no encontrado', 404)
      if (e?.code === 'P2003') return fail('No se puede eliminar: tiene registros asociados', 400)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
