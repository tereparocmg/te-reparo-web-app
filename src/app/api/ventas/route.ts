import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth, getParam } from '@/lib/api-helpers'
import { generateFolio, addDays } from '@/lib/folio'

// GET /api/ventas — Listar ventas (?tallerId&fechaInicio&fechaFin)
// VENDEDOR/ADMIN filtra por su(s) taller(es); SUPER_ADMIN ve todo o filtra
export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const tallerId = getParam(req, 'tallerId')
    const fechaInicio = getParam(req, 'fechaInicio')
    const fechaFin = getParam(req, 'fechaFin')
    const where: any = {}
    if (user.rol === 'SUPER_ADMIN') {
      if (tallerId) where.tallerId = tallerId
    } else {
      where.tallerId = tallerId && user.tallerIds.includes(tallerId)
        ? tallerId
        : { in: user.tallerIds }
    }
    if (fechaInicio || fechaFin) {
      where.createdAt = {} as any
      if (fechaInicio) where.createdAt.gte = new Date(fechaInicio)
      if (fechaFin) where.createdAt.lte = new Date(fechaFin)
    }
    const ventas = await prisma.venta.findMany({
      where,
      include: {
        items: { include: { producto: true } },
        cliente: true, vendedor: true, operario: true, garantia: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(normalizeDates(ventas))
  })
}

// POST /api/ventas — Crear venta (transacción: stock + venta + garantía + comisión + movimiento)
// Body opcional: { garantia: { productoId, duracionDias?, descripcionCobertura? } }
//   Si se pasa `garantia`, se crea la garantía usando ese producto + duración/cobertura custom.
//   Si no, se usa el primer item con producto.garantiaDias > 0 (lógica default).
export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const dto = await parseBody<any>(req)
    const { clienteId, items, metodoPago, tallerId, operarioId, notas, garantia } = dto
    if (!tallerId || !Array.isArray(items) || items.length === 0) {
      return fail('Faltan campos: tallerId, items[]', 400)
    }
    if (user.rol !== 'SUPER_ADMIN' && !user.tallerIds.includes(tallerId)) {
      return fail('No tienes acceso a ese taller', 403)
    }
    const total = items.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0)
    const folio = generateFolio('V')
    const ahora = new Date()
    try {
      const venta = await prisma.$transaction(async (tx) => {
        const prods: Record<string, any> = {}
        // 1. Validar + descontar stock
        for (const item of items) {
          const prod = await tx.producto.findUnique({ where: { id: item.productoId } })
          if (!prod) throw new Error(`Producto ${item.productoId} no encontrado`)
          if (prod.stock < Number(item.cantidad)) throw new Error(`Stock insuficiente para ${prod.nombre}`)
          await tx.producto.update({
            where: { id: item.productoId },
            data: { stock: prod.stock - Number(item.cantidad) },
          }, { timeout: 30000, maxWait: 10000 })
          prods[item.productoId] = prod
        }
        // 2. Crear venta con items anidados
        const v = await tx.venta.create({
          data: {
            folio, tallerId, clienteId: clienteId || 'cliente-general',
            vendedorId: user.id, operarioId: operarioId || null,
            subtotal: total, total, metodoPago: metodoPago || 'Efectivo',
            estado: 'COMPLETADA', notas: notas || null,
            items: {
              create: items.map((i: any) => ({
                productoId: i.productoId, cantidad: Number(i.cantidad),
                precioUnitario: Number(i.precioUnitario), subtotal: Number(i.subtotal),
              })),
            },
          },
          include: { items: { include: { producto: true } } },
        })
        // 3. Garantía de producto (una por venta; @unique en ventaId)
        //    - Si el user pasa `garantia.productoId` explícito, usar ese producto
        //    - Sino, usar el primer item con producto.garantiaDias > 0
        //    - Si user pasa `garantia.duracionDias`, override del default del producto
        //    - Si user pasa `garantia.descripcionCobertura`, override del default
        let garantiaCreada = false
        const tryCrearGarantia = async (prod: any, customDias?: number, customCobertura?: string) => {
          if (garantiaCreada) return
          const dias = Number(customDias ?? prod.garantiaDias ?? 0)
          if (dias <= 0) return
          const cobertura = customCobertura && customCobertura.trim()
            ? customCobertura.trim()
            : `Garantía de producto: ${prod.nombre}`
          await tx.garantia.create({
            data: {
              folio: generateFolio('G'), tallerId, clienteId: v.clienteId,
              ventaId: v.id, tipo: 'PRODUCTO', fechaInicio: ahora,
              duracionDias: dias,
              fechaVencimiento: addDays(ahora, dias),
              descripcionCobertura: cobertura,
              estado: 'ACTIVA', emitidaPorId: user.id,
            },
          })
          garantiaCreada = true
        }
        if (garantia && garantia.productoId && prods[garantia.productoId]) {
          // Override explícito del user
          await tryCrearGarantia(
            prods[garantia.productoId],
            garantia.duracionDias,
            garantia.descripcionCobertura,
          )
        }
        if (!garantiaCreada) {
          // Default: primer producto con garantiaDias > 0
          for (const item of items) {
            const prod = prods[item.productoId]
            if (prod && prod.garantiaDias > 0) {
              await tryCrearGarantia(prod)
              break
            }
          }
        }
        // 4. Comisiones para operario (FK a Operario, NO Usuario)
        if (operarioId) {
          const op = await tx.operario.findUnique({ where: { id: operarioId } })
          if (op) {
            for (const item of items) {
              const prod = prods[item.productoId]
              if (!prod?.operatorCommissionType || prod.operatorCommissionValue == null) continue
              let monto = 0
              if (prod.operatorCommissionType === 'PERCENTAGE') {
                monto = Number(item.subtotal) * (prod.operatorCommissionValue / 100)
              } else if (prod.operatorCommissionType === 'FIXED') {
                monto = prod.operatorCommissionValue * Number(item.cantidad)
              }
              monto = Math.round(monto * 100) / 100
              if (monto > 0) {
                await tx.commissionEntry.create({
                  data: {
                    operarioId: op.id, tallerId, ventaId: v.id,
                    ventaItemProductoId: prod.id, amount: monto, type: 'SALE',
                    description: `Comisión ${prod.operatorCommissionType === 'PERCENTAGE' ? prod.operatorCommissionValue + '%' : 'fija $' + prod.operatorCommissionValue} — ${prod.nombre} (${folio})`,
                    estado: 'ACTIVE',
                  },
                })
              }
            }
          }
        }
        // 5. Movimiento de ingreso
        await tx.movimiento.create({
          data: {
            tallerId, tipo: 'INGRESO', concepto: `Venta ${folio}`,
            monto: total, categoria: 'Venta de productos',
            usuarioId: user.id, ventaId: v.id, fecha: ahora,
          },
        })
        return v
      })
      return ok(normalizeDates(venta), { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return fail('Folio duplicado, reintente', 409)
      if (e?.code === 'P2003') return fail('Referencia inválida (clienteId/operarioId/tallerId)', 400)
      return fail(e.message || 'Error al crear venta', 400)
    }
  })
}
