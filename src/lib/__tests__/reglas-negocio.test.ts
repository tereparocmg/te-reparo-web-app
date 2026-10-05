import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { resetStore, loginAsRol, getState } from './helpers'

describe('Control de stock al vender', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('VENDEDOR')
    getState().setTallerActual('taller-1')
  })

  it('descuenta el stock del producto al vender', () => {
    const stockAntes = getState().productos.find((p) => p.id === 'prod-3')?.stock || 0
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-stock-1',
          productoId: 'prod-3',
          cantidad: 5,
          precioUnitario: 249,
          subtotal: 1245,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const stockDespues = getState().productos.find((p) => p.id === 'prod-3')?.stock || 0
    expect(stockDespues).toBe(stockAntes - 5)
  })

  it('descuenta stock de múltiples productos en la misma venta', () => {
    const stockFunda = getState().productos.find((p) => p.id === 'prod-3')?.stock || 0
    const stockCargador = getState().productos.find((p) => p.id === 'prod-5')?.stock || 0

    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        { id: 'i1', productoId: 'prod-3', cantidad: 2, precioUnitario: 249, subtotal: 498 },
        { id: 'i2', productoId: 'prod-5', cantidad: 1, precioUnitario: 349, subtotal: 349 },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    expect(getState().productos.find((p) => p.id === 'prod-3')?.stock).toBe(stockFunda - 2)
    expect(getState().productos.find((p) => p.id === 'prod-5')?.stock).toBe(stockCargador - 1)
  })

  it('restaura el stock al anular una venta', () => {
    const stockAntes = getState().productos.find((p) => p.id === 'prod-3')?.stock || 0
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-stock-2',
          productoId: 'prod-3',
          cantidad: 3,
          precioUnitario: 249,
          subtotal: 747,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    expect(getState().productos.find((p) => p.id === 'prod-3')?.stock).toBe(stockAntes - 3)

    getState().anularVenta(ventaId!)

    expect(getState().productos.find((p) => p.id === 'prod-3')?.stock).toBe(stockAntes)
  })
})

describe('Stock en órdenes de servicio (piezas)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ELECTRONICO')
    getState().setTallerActual('taller-1')
  })

  it('descuenta stock de pieza al crear orden con piezas utilizadas', () => {
    const stockAntes = getState().piezas.find((p) => p.id === 'pz-1')?.stock || 0
    getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 13',
      problemaReportado: 'Pantalla',
      lineas: [],
      piezasUtilizadas: [
        { id: 'op-test-1', piezaId: 'pz-1', cantidad: 1, costoUnitario: 3500, subtotal: 3500 },
      ],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const stockDespues = getState().piezas.find((p) => p.id === 'pz-1')?.stock || 0
    expect(stockDespues).toBe(stockAntes - 1)
  })
})

describe('Cliente General — inmutabilidad', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
  })

  it('no se puede eliminar al cliente general', () => {
    const totalAntes = getState().clientes.length
    getState().deleteCliente('cliente-general')
    expect(getState().clientes.length).toBe(totalAntes)
    const cg = getState().clientes.find((c) => c.id === 'cliente-general')
    expect(cg).toBeDefined()
  })

  it('permite editar datos de contacto del cliente general', () => {
    getState().saveCliente({
      id: 'cliente-general',
      telefono: '55 9999 0000',
    })
    const cg = getState().clientes.find((c) => c.id === 'cliente-general')
    expect(cg?.telefono).toBe('55 9999 0000')
    expect(cg?.esClienteGeneral).toBe(true) // Sigue siendo cliente general
  })

  it('el cliente general se puede usar en ventas', () => {
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        { id: 'i-cg-1', productoId: 'prod-3', cantidad: 1, precioUnitario: 249, subtotal: 249 },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    expect(ventaId).not.toBeNull()
    const venta = getState().ventas.find((v) => v.id === ventaId)
    expect(venta?.clienteId).toBe('cliente-general')
  })
})

describe('Clientes CRUD', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
  })

  it('crea un cliente nuevo', () => {
    const antes = getState().clientes.length
    getState().saveCliente({
      nombre: 'Cliente Test',
      telefono: '55 1111 1111',
      tipo: 'PERSONA_NATURAL',
    })
    expect(getState().clientes.length).toBe(antes + 1)
    const nuevo = getState().clientes.find((c) => c.nombre === 'Cliente Test')
    expect(nuevo).toBeDefined()
    expect(nuevo?.esClienteGeneral).toBe(false)
  })

  it('crea cliente de tipo EMPRESA', () => {
    getState().saveCliente({
      nombre: 'Empresa Test SA',
      tipo: 'EMPRESA',
      rfc: 'ETS950101AAA',
    })
    const nuevo = getState().clientes.find((c) => c.nombre === 'Empresa Test SA')
    expect(nuevo?.tipo).toBe('EMPRESA')
    expect(nuevo?.rfc).toBe('ETS950101AAA')
  })

  it('elimina un cliente registrado (no cliente general)', () => {
    getState().saveCliente({
      nombre: 'Cliente a Eliminar',
      tipo: 'PERSONA_NATURAL',
    })
    const cliente = getState().clientes.find((c) => c.nombre === 'Cliente a Eliminar')
    expect(cliente).toBeDefined()
    const antes = getState().clientes.length
    getState().deleteCliente(cliente!.id)
    expect(getState().clientes.length).toBe(antes - 1)
  })
})

describe('Movimientos / Caja', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('crearVenta genera un movimiento de INGRESO', () => {
    const movsAntes = getState().movimientos.filter((m) => m.tipo === 'INGRESO').length
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        { id: 'i-mov-1', productoId: 'prod-3', cantidad: 1, precioUnitario: 249, subtotal: 249 },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const movsDespues = getState().movimientos.filter((m) => m.tipo === 'INGRESO').length
    expect(movsDespues).toBe(movsAntes + 1)
    const nuevoMov = getState().movimientos[0]
    expect(nuevoMov.tipo).toBe('INGRESO')
    expect(nuevoMov.monto).toBe(249)
  })

  it('registrarGasto crea un movimiento de GASTO', () => {
    const antes = getState().movimientos.length
    getState().registrarGasto({
      concepto: 'Renta test',
      monto: 5000,
      categoria: 'Renta',
    })
    expect(getState().movimientos.length).toBe(antes + 1)
    const nuevoMov = getState().movimientos[0]
    expect(nuevoMov.tipo).toBe('GASTO')
    expect(nuevoMov.monto).toBe(5000)
  })

  it('registrarCompra incrementa el stock del producto', () => {
    const stockAntes = getState().productos.find((p) => p.id === 'prod-3')?.stock || 0
    const compraId = getState().registrarCompra({
      proveedor: 'Mayorista X',
      items: [
        { id: 'ci-test-1', productoId: 'prod-3', cantidad: 10, costoUnitario: 80, subtotal: 800 },
      ],
    })
    expect(compraId).not.toBeNull()
    const stockDespues = getState().productos.find((p) => p.id === 'prod-3')?.stock || 0
    expect(stockDespues).toBe(stockAntes + 10)
  })

  it('registrarCompra crea un movimiento de COMPRA', () => {
    const antes = getState().movimientos.filter((m) => m.tipo === 'COMPRA').length
    getState().registrarCompra({
      proveedor: 'Mayorista Y',
      items: [
        { id: 'ci-test-2', productoId: 'prod-3', cantidad: 5, costoUnitario: 80, subtotal: 400 },
      ],
    })
    expect(getState().movimientos.filter((m) => m.tipo === 'COMPRA').length).toBe(antes + 1)
  })

  it('registrarCompra actualiza el precioCosto del producto', () => {
    getState().registrarCompra({
      proveedor: 'Mayorista Z',
      items: [
        { id: 'ci-test-3', productoId: 'prod-3', cantidad: 5, costoUnitario: 95, subtotal: 475 },
      ],
    })
    const producto = getState().productos.find((p) => p.id === 'prod-3')
    expect(producto?.precioCosto).toBe(95)
  })

  it('anularVenta elimina el movimiento de ingreso asociado', () => {
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        { id: 'i-mov-2', productoId: 'prod-3', cantidad: 1, precioUnitario: 249, subtotal: 249 },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const movimientosAntes = getState().movimientos.length
    getState().anularVenta(ventaId!)
    const movimientosDespues = getState().movimientos.length
    expect(movimientosDespues).toBe(movimientosAntes - 1)
    // No debe quedar ningún movimiento vinculado a la venta anulada
    const movsVenta = getState().movimientos.filter((m) => m.ventaId === ventaId)
    expect(movsVenta.length).toBe(0)
  })
})

describe('Pedidos internos', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ELECTRONICO')
    getState().setTallerActual('taller-1')
  })

  it('crea un pedido interno con estado PENDIENTE', () => {
    const antes = getState().pedidos.length
    getState().crearPedido({
      descripcion: '5x Pantalla Samsung A54',
      cantidad: 5,
      urgencia: 'ALTA',
    })
    expect(getState().pedidos.length).toBe(antes + 1)
    const nuevo = getState().pedidos[0]
    expect(nuevo.estado).toBe('PENDIENTE')
    expect(nuevo.urgencia).toBe('ALTA')
    expect(nuevo.solicitanteId).toBe('u-elec-1')
  })

  it('el creador puede eliminar un pedido pendiente', () => {
    getState().crearPedido({ descripcion: 'Test', cantidad: 1, urgencia: 'BAJA' })
    const pedidoId = getState().pedidos[0].id
    const antes = getState().pedidos.length
    getState().eliminarPedido(pedidoId)
    expect(getState().pedidos.length).toBe(antes - 1)
  })

  it('aprobarPedido cambia el estado a APROBADO', () => {
    loginAsRol('ADMIN')
    getState().crearPedido({ descripcion: 'Test aprobar', cantidad: 2, urgencia: 'MEDIA' })
    const pedidoId = getState().pedidos[0].id
    getState().aprobarPedido(pedidoId, true)
    const pedido = getState().pedidos.find((p) => p.id === pedidoId)
    expect(pedido?.estado).toBe('APROBADO')
    expect(pedido?.aprobadoPorId).toBe('u-admin-1')
    expect(pedido?.fechaAprobacion).toBeTruthy()
  })

  it('rechazarPedido cambia el estado a RECHAZADO', () => {
    loginAsRol('ADMIN')
    getState().crearPedido({ descripcion: 'Test rechazar', cantidad: 2, urgencia: 'MEDIA' })
    const pedidoId = getState().pedidos[0].id
    getState().aprobarPedido(pedidoId, false)
    const pedido = getState().pedidos.find((p) => p.id === pedidoId)
    expect(pedido?.estado).toBe('RECHAZADO')
  })

  it('convertirPedido cambia el estado a CONVERTIDO', () => {
    loginAsRol('ADMIN')
    getState().crearPedido({ descripcion: 'Test convertir', cantidad: 2, urgencia: 'MEDIA' })
    const pedidoId = getState().pedidos[0].id
    getState().aprobarPedido(pedidoId, true)
    getState().convertirPedido(pedidoId)
    const pedido = getState().pedidos.find((p) => p.id === pedidoId)
    expect(pedido?.estado).toBe('CONVERTIDO')
  })
})

describe('Configuración', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('SUPER_ADMIN')
  })

  it('updateConfiguracion actualiza la moneda y el IVA', () => {
    getState().updateConfiguracion({ iva: 18 })
    expect(getState().configuracion.iva).toBe(18)
  })

  it('updateTallerConfig actualiza datos de un taller', () => {
    getState().updateTallerConfig('taller-1', { limiteDescuento: 20 })
    const taller = getState().talleres.find((t) => t.id === 'taller-1')
    expect(taller?.limiteDescuento).toBe(20)
  })

  it('updateTallerConfig actualiza días de garantía por defecto', () => {
    getState().updateTallerConfig('taller-1', {
      garantiaProductoDias: 45,
      garantiaServicioDias: 120,
    })
    const taller = getState().talleres.find((t) => t.id === 'taller-1')
    expect(taller?.garantiaProductoDias).toBe(45)
    expect(taller?.garantiaServicioDias).toBe(120)
  })
})
