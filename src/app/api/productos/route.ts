import { prisma, parseTags, serializeTags } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/productos — Listar productos (opcional ?tallerId=X)
// VENDEDOR ve sólo los de su(s) taller(es); SUPER_ADMIN ve todos (o filtra si pasa tallerId)
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const tallerIdParam = getParam(req, 'tallerId')
    const where: any = { deletedAt: null }
    if (user.rol === 'SUPER_ADMIN') {
      if (tallerIdParam) where.tallerId = tallerIdParam
    } else {
      where.tallerId = tallerIdParam && user.tallerIds.includes(tallerIdParam)
        ? tallerIdParam
        : { in: user.tallerIds }
    }
    const productos = await prisma.producto.findMany({
      where,
      include: { categoria: true },
      orderBy: { nombre: 'asc' },
    })
    return ok(productos.map((p) => ({ ...p, tags: parseTags(p.tags) })))
  })
}

// POST /api/productos — Crear producto (SUPER_ADMIN o ADMIN)
// Body incluye tags (array de strings) y operatorCommissionType/Value
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const body = await parseBody<any>(req)
    const { nombre, sku, codigoBarras, precioCosto, precioVenta, tallerId, tags } = body
    if (!nombre || !sku || !codigoBarras || precioCosto == null || precioVenta == null || !tallerId) {
      return fail('Faltan campos obligatorios: nombre, sku, codigoBarras, precioCosto, precioVenta, tallerId', 400)
    }
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(tallerId)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    // Validar código de barras único (Producto + Pieza)
    const existe = await prisma.producto.findFirst({ where: { codigoBarras } })
        || await prisma.pieza.findFirst({ where: { codigoBarras } })
    if (existe) return fail('El código de barras ya existe', 409)
    try {
      const producto = await prisma.producto.create({
        data: { ...body, tags: serializeTags(tags || []) },
        include: { categoria: true },
      })
      return ok({ ...producto, tags: parseTags(producto.tags) }, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('El código de barras ya existe', 409)
      if (e?.code === 'P2003') return fail('tallerId o categoriaId no existe', 400)
      throw e
    }
  }, ['SUPER_ADMIN', 'ADMIN'])
}
