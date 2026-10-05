import { prisma } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/categorias — Listar categorías (opcional ?tallerId=X&tipo=PRODUCTO|PIEZA)
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const tallerId = getParam(req, 'tallerId')
    const tipo = getParam(req, 'tipo')

    // VENDEDOR sólo ve categorías de su taller; ADMIN si pide uno de sus talleres.
    const filterTaller = user.rol === 'SUPER_ADMIN'
      ? tallerId
      : (tallerId && user.tallerIds.includes(tallerId) ? tallerId : { in: user.tallerIds })

    const where: any = { deletedAt: null }
    if (filterTaller) where.tallerId = filterTaller
    if (tipo) where.tipo = tipo

    const categorias = await prisma.categoria.findMany({ where, orderBy: { nombre: 'asc' } })
    return ok(categorias)
  })
}

// POST /api/categorias — Crear categoría (SUPER_ADMIN o ADMIN)
// Body: { nombre, tipo, activa?, tallerId }
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const body = await parseBody<any>(req)
    const { nombre, tipo, activa, tallerId } = body
    if (!nombre || !tipo || !tallerId) {
      return fail('Faltan campos obligatorios: nombre, tipo, tallerId', 400)
    }
    if (!['PRODUCTO', 'PIEZA'].includes(tipo)) {
      return fail('tipo inválido (debe ser PRODUCTO o PIEZA)', 400)
    }
    // ADMIN sólo puede crear en sus talleres asignados
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(tallerId)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    try {
      const categoria = await prisma.categoria.create({
        data: { nombre, tipo, activa: activa ?? true, tallerId },
      })
      return ok(categoria, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2003') return fail('tallerId no existe', 400)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
