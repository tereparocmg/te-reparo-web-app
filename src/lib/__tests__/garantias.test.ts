import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { resetStore, loginAsRol, getState } from './helpers'

describe('Generación automática de garantía al vender', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('VENDEDOR')
    getState().setTallerActual('taller-1')
  })

  it('genera garantía automática si el producto tiene garantíaDias > 0', () => {
    const garantiasAntes = getState().garantias.length
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-gar-1',
          productoId: 'prod-1', // iPhone 13 — 30 días garantía
          cantidad: 1,
          precioUnitario: 17999,
          subtotal: 17999,
        },
      ],
      descuento: 0,
      metodoPago: 'Tarjeta',
      tallerId: 'taller-1',
    })
    expect(getState().garantias.length).toBe(garantiasAntes + 1)
    const nuevaGarantia = getState().garantias[0]
    expect(nuevaGarantia.tipo).toBe('PRODUCTO')
    expect(nuevaGarantia.duracionDias).toBe(30)
    expect(nuevaGarantia.estado).toBe('ACTIVA')
  })

  it('no genera garantía si el producto tiene garantiaDias = 0', () => {
    const garantiasAntes = getState().garantias.length
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-gar-2',
          productoId: 'prod-3', // Funda — 0 días
          cantidad: 1,
          precioUnitario: 249,
          subtotal: 249,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    expect(getState().garantias.length).toBe(garantiasAntes)
  })

  it('vincula la garantía con la venta y el cliente', () => {
    const ventaId = getState().crearVenta({
      clienteId: 'cli-1',
      items: [
        {
          id: 'item-gar-3',
          productoId: 'prod-1',
          cantidad: 1,
          precioUnitario: 17999,
          subtotal: 17999,
        },
      ],
      descuento: 0,
      metodoPago: 'Tarjeta',
      tallerId: 'taller-1',
    })
    const garantia = getState().garantias[0]
    expect(garantia.ventaId).toBe(ventaId)
    expect(garantia.clienteId).toBe('cli-1')
  })

  it('calcula la fecha de vencimiento correctamente', () => {
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-gar-4',
          productoId: 'prod-1', // 30 días
          cantidad: 1,
          precioUnitario: 17999,
          subtotal: 17999,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const garantia = getState().garantias[0]
    const inicio = new Date(garantia.fechaInicio)
    const vencimiento = new Date(garantia.fechaVencimiento)
    const dias = Math.round((vencimiento.getTime() - inicio.getTime()) / 86400000)
    expect(dias).toBe(30)
  })

  it('invalida la garantía al anular la venta', () => {
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-gar-5',
          productoId: 'prod-1',
          cantidad: 1,
          precioUnitario: 17999,
          subtotal: 17999,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const garantiaId = getState().garantias[0].id
    expect(getState().garantias[0].estado).toBe('ACTIVA')

    getState().anularVenta(ventaId!)

    const garantia = getState().garantias.find((g) => g.id === garantiaId)
    expect(garantia?.estado).toBe('INVALIDADA')
  })
})

describe('Generación de garantía al entregar orden de servicio', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ELECTRONICO')
    getState().setTallerActual('taller-1')
  })

  it('genera garantía de servicio al entregar la orden', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 13',
      problemaReportado: 'Pantalla',
      lineas: [
        {
          id: 'linea-gar-1',
          descripcion: 'Cambio de pantalla',
          precioManoObra: 800,
          personalizada: false,
        },
      ],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    const garantiasAntes = getState().garantias.length
    getState().entregarOrden(ordenId!, 90, 'Garantía de servicio')

    expect(getState().garantias.length).toBe(garantiasAntes + 1)
    const nuevaGarantia = getState().garantias[0]
    expect(nuevaGarantia.tipo).toBe('SERVICIO')
    expect(nuevaGarantia.duracionDias).toBe(90)
    expect(nuevaGarantia.ordenId).toBe(ordenId)
  })

  it('la fecha de inicio de la garantía es la fecha de entrega', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Samsung',
      modelo: 'Galaxy A54',
      problemaReportado: 'Batería',
      lineas: [
        {
          id: 'linea-gar-2',
          descripcion: 'Cambio de batería',
          precioManoObra: 400,
          personalizada: false,
        },
      ],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    const antes = Date.now()
    getState().entregarOrden(ordenId!, 60, '')

    const garantia = getState().garantias[0]
    const inicioGarantia = new Date(garantia.fechaInicio).getTime()
    expect(inicioGarantia).toBeGreaterThanOrEqual(antes - 1000)
  })
})

describe('Reclamaciones de garantía', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
  })

  it('crea una reclamación vinculada a una garantía', () => {
    const antes = getState().reclamaciones.length
    getState().crearReclamacion({
      garantiaId: 'gar-1',
      descripcion: 'El problema reapareció',
      resolucion: 'REPARACION_SIN_COSTO',
      motivoResolucion: 'Dentro del período de garantía',
    })
    expect(getState().reclamaciones.length).toBe(antes + 1)
    const nueva = getState().reclamaciones[0]
    expect(nueva.garantiaId).toBe('gar-1')
    expect(nueva.resolucion).toBe('REPARACION_SIN_COSTO')
    expect(nueva.atendidaPorId).toBe('u-admin-1')
  })

  it('registra la fecha de la reclamación', () => {
    getState().crearReclamacion({
      garantiaId: 'gar-1',
      descripcion: 'Test',
      resolucion: 'RECHAZO',
    })
    const nueva = getState().reclamaciones[0]
    expect(nueva.fecha).toBeTruthy()
    expect(new Date(nueva.fecha).getTime()).toBeLessThanOrEqual(Date.now())
  })
})

describe('Reasignación de garantía (cliente general → registrado)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
  })

  it('reasigna una garantía a otro cliente', () => {
    getState().reasignarGarantia('gar-2', 'cli-2')
    const garantia = getState().garantias.find((g) => g.id === 'gar-2')
    expect(garantia?.clienteId).toBe('cli-2')
  })

  it('migrarGarantiasCliente transfiere todas las garantías de un cliente a otro', () => {
    const clienteOrigen = 'cli-1'
    const clienteDestino = 'cli-3'
    const garantiasOrigen = getState().garantias.filter((g) => g.clienteId === clienteOrigen)

    getState().migrarGarantiasCliente(clienteOrigen, clienteDestino)

    const garantiasDespues = getState().garantias.filter((g) => g.clienteId === clienteOrigen)
    expect(garantiasDespues.length).toBe(0)
    // Las garantías originales ahora pertenecen al destino
    garantiasOrigen.forEach((g) => {
      const actualizada = getState().garantias.find((x) => x.id === g.id)
      expect(actualizada?.clienteId).toBe(clienteDestino)
    })
  })
})
