import { prisma } from '@/lib/prisma'
import { ok, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/validar/codigo-barras?codigo=X&excludeId=Y
// Devuelve { exists: boolean } — true si el código ya está en uso en Producto o Pieza (excluyendo excludeId)
export async function GET(req: Request) {
  return withAuth(req, async () => {
    const codigo = getParam(req, 'codigo')
    const excludeId = getParam(req, 'excludeId')
    if (!codigo) return ok({ exists: false })

    const notClause = excludeId ? { id: excludeId } : undefined
    const enProductos = await prisma.producto.findFirst({
      where: { codigoBarras: codigo, NOT: notClause ?? {} },
    })
    if (enProductos) return ok({ exists: true })
    const enPiezas = await prisma.pieza.findFirst({
      where: { codigoBarras: codigo, NOT: notClause ?? {} },
    })
    return ok({ exists: !!enPiezas })
  })
}
