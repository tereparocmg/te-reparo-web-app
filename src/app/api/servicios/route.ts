import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth, getParam } from '@/lib/api-helpers'

// GET /api/servicios — Listar servicios (?tallerId)
// VENDEDOR/ADMIN filtra por su(s) taller(es); SUPER_ADMIN ve todo o filtra
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const tallerId = getParam(req, 'tallerId')
    const where: any = {}
    if (user.rol === 'SUPER_ADMIN') {
      if (tallerId) where.tallerId = tallerId
    } else {
      where.tallerId = tallerId && user.tallerIds.includes(tallerId)
        ? tallerId
        : { in: user.tallerIds }
    }
    const servicios = await prisma.servicio.findMany({
      where,
      include: {
        cliente: true, operario: true, taller: true,
        piezasUtilizadas: { include: { pieza: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(normalizeDates(servicios))
  })
}

// POST /api/servicios — Crear servicio (con piezasUtilizadas anidadas y stock decrement)
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const {
      clienteId, operarioId, tipo, marca, modelo, imei,
      problemaReportado, diagnostico, descripcionServicio,
      estado, piezasUtilizadas, precioManoObra, subtotalPiezas,
      total, metodoPago, pagado, garantiaDias, notas, tallerId,
    } = dto
    if (!tallerId || !operarioId) {
      return fail('Faltan campos: tallerId, operarioId', 400)
    }
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(tallerId)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    const piezas = Array.isArray(piezasUtilizadas) ? piezasUtilizadas : []
    const folio = (dto.folio as string) || `SRV-${Date.now().toString(36).toUpperCase()}`
    const ahora = new Date()
    try {
      const servicio = await prisma.$transaction(async (tx) => {
        // 1. Validar + decrementar stock de piezas
        for (const p of piezas) {
          const pieza = await tx.pieza.findUnique({ where: { id: p.piezaId } })
          if (!pieza) throw new Error(`Pieza ${p.piezaId} no encontrada`)
          if (pieza.stock < Number(p.cantidad)) {
            throw new Error(`Stock insuficiente para ${pieza.nombre}`)
          }
          await tx.pieza.update({
            where: { id: p.piezaId },
            data: { stock: pieza.stock - Number(p.cantidad) },
          }, { timeout: 30000, maxWait: 10000 })
        }
        // 2. Crear servicio con piezasUtilizadas anidadas
        const s = await tx.servicio.create({
          data: {
            folio, tallerId, clienteId: clienteId || 'cliente-general',
            operarioId, tipo: tipo || 'ELECTRONICA',
            marca: marca || '', modelo: modelo || '', imei,
            problemaReportado: problemaReportado || '',
            diagnostico: diagnostico || null,
            descripcionServicio: descripcionServicio || '',
            estado: estado || 'COMPLETADO',
            precioManoObra: Number(precioManoObra || 0),
            subtotalPiezas: Number(subtotalPiezas || piezas.reduce((s: number, p: any) => s + Number(p.subtotal || 0), 0)),
            total: Number(total ?? (Number(precioManoObra || 0) + piezas.reduce((s: number, p: any) => s + Number(p.subtotal || 0), 0))),
            metodoPago: metodoPago || 'Efectivo',
            pagado: pagado === true, garantiaDias: garantiaDias ?? 90,
            notas: notas || null,
            piezasUtilizadas: {
              create: piezas.map((p: any) => ({
                piezaId: p.piezaId, cantidad: Number(p.cantidad),
                costoUnitario: Number(p.costoUnitario),
                precioVenta: Number(p.precioVenta),
                subtotal: Number(p.subtotal),
              })),
            },
          },
          include: { piezasUtilizadas: { include: { pieza: true } } },
        })
        // 3. Movimiento de ingreso (igual que el servicio Electron original)
        await tx.movimiento.create({
          data: {
            tallerId, tipo: 'INGRESO', concepto: `Servicio ${folio}`,
            monto: s.total, categoria: 'Servicio de reparación',
            usuarioId: user.id, servicioId: s.id, fecha: ahora,
          },
        })
        return s
      })
      return ok(normalizeDates(servicio), { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('Folio duplicado, reintente', 409)
      if (e?.code === 'P2003') return fail('Referencia inválida (clienteId/operarioId/tallerId)', 400)
      return fail(e.message || 'Error al crear servicio', 400)
    }
  })
}
