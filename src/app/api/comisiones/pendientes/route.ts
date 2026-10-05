import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/comisiones/pendientes — Listar comisiones pendientes agrupadas por operario
// Query: ?tallerId=X
// Devuelve: [{ operarioId, operarioNombre, total, count, entries: [...] }]
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const tallerId = getParam(req, 'tallerId')
    const where: any = { estado: 'ACTIVE', operatorPaymentId: null }
    if (user.rol === 'SUPER_ADMIN') {
      if (tallerId) where.tallerId = tallerId
    } else {
      where.tallerId = tallerId && user.tallerIds.includes(tallerId)
        ? tallerId
        : { in: user.tallerIds }
    }
    const entries = await prisma.commissionEntry.findMany({
      where,
      include: { operario: true, venta: true, servicio: true },
      orderBy: { createdAt: 'desc' },
    })
    const porOperario = new Map<string, {
      operarioId: string
      operarioNombre: string
      total: number
      count: number
      entries: any[]
    }>()
    for (const e of entries) {
      if (!porOperario.has(e.operarioId)) {
        porOperario.set(e.operarioId, {
          operarioId: e.operarioId,
          operarioNombre: e.operario?.nombre || '—',
          total: 0,
          count: 0,
          entries: [],
        })
      }
      const g = porOperario.get(e.operarioId)!
      g.total = Math.round((g.total + e.amount) * 100) / 100
      g.count += 1
      g.entries.push(e)
    }
    return ok(normalizeDates(Array.from(porOperario.values())))
  })
}
