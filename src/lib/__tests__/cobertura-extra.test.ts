import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { resetStore, loginAsRol, getState } from './helpers'

describe('updateOrdenServicio', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('actualiza los datos de una orden', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 13',
      problemaReportado: 'Pantalla',
      lineas: [],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    getState().updateOrdenServicio(ordenId!, {
      diagnostico: 'Diagnóstico actualizado',
      estado: 'EN_PROCESO',
    })

    const orden = getState().ordenes.find((o) => o.id === ordenId)
    expect(orden?.diagnostico).toBe('Diagnóstico actualizado')
    expect(orden?.estado).toBe('EN_PROCESO')
  })

  it('recalcula totales al actualizar las líneas', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 13',
      problemaReportado: 'Test',
      lineas: [
        { id: 'l1', descripcion: 'Servicio 1', precioManoObra: 500, personalizada: false },
      ],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    // Actualizar con nuevas líneas
    getState().updateOrdenServicio(ordenId!, {
      lineas: [
        { id: 'l1', descripcion: 'Servicio 1', precioManoObra: 500, personalizada: false },
        { id: 'l2', descripcion: 'Servicio 2', precioManoObra: 300, personalizada: true },
      ],
    })

    const orden = getState().ordenes.find((o) => o.id === ordenId)
    expect(orden?.subtotalManoObra).toBe(800) // 500 + 300
    expect(orden?.total).toBe(800)
  })

  it('recalcula totales al actualizar las piezas', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 13',
      problemaReportado: 'Test',
      lineas: [],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    getState().updateOrdenServicio(ordenId!, {
      piezasUtilizadas: [
        { id: 'p1', piezaId: 'pz-3', cantidad: 1, costoUnitario: 450, subtotal: 450 },
      ],
    })

    const orden = getState().ordenes.find((o) => o.id === ordenId)
    expect(orden?.subtotalPiezas).toBe(450)
  })

  it('recalcula el total con descuento', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 13',
      problemaReportado: 'Test',
      lineas: [
        { id: 'l1', descripcion: 'Servicio', precioManoObra: 1000, personalizada: false },
      ],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    getState().updateOrdenServicio(ordenId!, {
      descuento: 200,
    })

    const orden = getState().ordenes.find((o) => o.id === ordenId)
    expect(orden?.total).toBe(800) // 1000 - 200
  })

  it('no afecta otras órdenes al actualizar', () => {
    const orden1 = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 13',
      problemaReportado: 'Orden 1',
      lineas: [{ id: 'l1', descripcion: 'S', precioManoObra: 100, personalizada: false }],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const orden2 = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Samsung',
      modelo: 'Galaxy',
      problemaReportado: 'Orden 2',
      lineas: [{ id: 'l2', descripcion: 'S', precioManoObra: 200, personalizada: false }],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    getState().updateOrdenServicio(orden1!, { marca: 'Apple Editado' })

    const o2 = getState().ordenes.find((o) => o.id === orden2)
    expect(o2?.marca).toBe('Samsung') // No cambió
  })
})

describe('registrarCompra con piezas', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('incrementa el stock de una pieza al registrar compra', () => {
    const stockAntes = getState().piezas.find((p) => p.id === 'pz-3')?.stock || 0
    const compraId = getState().registrarCompra({
      proveedor: 'Mayorista Piezas',
      items: [
        { id: 'ci-pz-1', piezaId: 'pz-3', cantidad: 5, costoUnitario: 450, subtotal: 2250 },
      ],
    })
    expect(compraId).not.toBeNull()
    const stockDespues = getState().piezas.find((p) => p.id === 'pz-3')?.stock || 0
    expect(stockDespues).toBe(stockAntes + 5)
  })

  it('actualiza el costoUnitario de la pieza al comprar', () => {
    getState().registrarCompra({
      proveedor: 'Mayorista',
      items: [
        { id: 'ci-pz-2', piezaId: 'pz-3', cantidad: 2, costoUnitario: 480, subtotal: 960 },
      ],
    })
    const pieza = getState().piezas.find((p) => p.id === 'pz-3')
    expect(pieza?.costoUnitario).toBe(480)
  })

  it('registra compra con productos Y piezas mezclados', () => {
    const stockProdAntes = getState().productos.find((p) => p.id === 'prod-3')?.stock || 0
    const stockPzAntes = getState().piezas.find((p) => p.id === 'pz-3')?.stock || 0

    getState().registrarCompra({
      proveedor: 'Mixto',
      items: [
        { id: 'ci-mix-1', productoId: 'prod-3', cantidad: 5, costoUnitario: 80, subtotal: 400 },
        { id: 'ci-mix-2', piezaId: 'pz-3', cantidad: 3, costoUnitario: 450, subtotal: 1350 },
      ],
    })

    expect(getState().productos.find((p) => p.id === 'prod-3')?.stock).toBe(stockProdAntes + 5)
    expect(getState().piezas.find((p) => p.id === 'pz-3')?.stock).toBe(stockPzAntes + 3)
  })

  it('calcula el total de la compra con piezas', () => {
    const compraId = getState().registrarCompra({
      proveedor: 'Test',
      items: [
        { id: 'ci-tot-1', piezaId: 'pz-3', cantidad: 2, costoUnitario: 450, subtotal: 900 },
        { id: 'ci-tot-2', piezaId: 'pz-1', cantidad: 1, costoUnitario: 3500, subtotal: 3500 },
      ],
    })
    const compra = getState().compras.find((c) => c.id === compraId)
    expect(compra?.total).toBe(4400)
  })
})

describe('convertirPedido', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('cambia el estado del pedido a CONVERTIDO', () => {
    getState().crearPedido({ descripcion: 'Test convertir', cantidad: 2, urgencia: 'MEDIA' })
    const pedidoId = getState().pedidos[0].id
    getState().aprobarPedido(pedidoId, true)
    getState().convertirPedido(pedidoId)
    const pedido = getState().pedidos.find((p) => p.id === pedidoId)
    expect(pedido?.estado).toBe('CONVERTIDO')
  })
})

describe('eliminarPedido — permisos', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('ELECTRONICO')
    getState().setTallerActual('taller-1')
  })

  it('el creador puede eliminar su propio pedido pendiente', () => {
    getState().crearPedido({ descripcion: 'Mi pedido', cantidad: 1, urgencia: 'BAJA' })
    const pedidoId = getState().pedidos[0].id
    const antes = getState().pedidos.length
    getState().eliminarPedido(pedidoId)
    expect(getState().pedidos.length).toBe(antes - 1)
  })

  it('no puede eliminar un pedido ya aprobado', () => {
    getState().crearPedido({ descripcion: 'Pedido a aprobar', cantidad: 1, urgencia: 'BAJA' })
    const pedidoId = getState().pedidos[0].id
    loginAsRol('ADMIN')
    getState().aprobarPedido(pedidoId, true)
    loginAsRol('ELECTRONICO')
    const antes = getState().pedidos.length
    getState().eliminarPedido(pedidoId)
    expect(getState().pedidos.length).toBe(antes) // No se eliminó
  })
})

describe('crearReclamacion — validaciones', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('ADMIN')
  })

  it('no crea reclamación sin usuario logueado', () => {
    getState().logout()
    const antes = getState().reclamaciones.length
    getState().crearReclamacion({
      garantiaId: 'gar-1',
      descripcion: 'Test',
      resolucion: 'RECHAZO',
    })
    expect(getState().reclamaciones.length).toBe(antes)
  })
})

describe('crearPagoOperador — validaciones', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('no crea pago si no hay usuario logueado', () => {
    getState().logout()
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ['ce-1'])
    expect(pagoId).toBeNull()
  })
})

describe('confirmarPagoOperador — validaciones', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('no confirma pago si no hay usuario logueado', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', [pendientes[0].id])
    getState().logout()
    getState().confirmarPagoOperador(pagoId!)
    // El pago debe seguir PENDING
    const pago = getState().operatorPayments.find((p) => p.id === pagoId)
    expect(pago?.status).toBe('PENDING')
  })
})
