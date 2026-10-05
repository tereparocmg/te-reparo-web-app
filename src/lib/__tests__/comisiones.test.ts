import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { resetStore, loginAsRol, getState } from './helpers'

describe('Generación de comisiones al crear venta', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('VENDEDOR')
    getState().setTallerActual('taller-1')
  })

  it('genera una CommissionEntry por cada producto con comisión al vender', () => {
    const comisionesAntes = getState().commissionEntries.length
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-test-1',
          productoId: 'prod-3', // Funda iPhone 13 — FIXED $15
          cantidad: 1,
          precioUnitario: 249,
          subtotal: 249,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    expect(ventaId).not.toBeNull()
    const comisionesDespues = getState().commissionEntries.length
    expect(comisionesDespues).toBe(comisionesAntes + 1)
  })

  it('calcula comisión PERCENTAGE correctamente (1.5% sobre precio)', () => {
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-test-2',
          productoId: 'prod-1', // iPhone 13 — PERCENTAGE 1.5%, precio 17999
          cantidad: 1,
          precioUnitario: 17999,
          subtotal: 17999,
        },
      ],
      descuento: 0,
      metodoPago: 'Tarjeta',
      tallerId: 'taller-1',
    })
    expect(ventaId).not.toBeNull()
    const nuevaComision = getState().commissionEntries[0]
    expect(nuevaComision.type).toBe('SALE')
    expect(nuevaComision.amount).toBeCloseTo(269.985, 2) // 17999 * 0.015
    expect(nuevaComision.estado).toBe('ACTIVE')
    expect(nuevaComision.operatorPaymentId).toBeNull()
  })

  it('calcula comisión FIXED correctamente (monto fijo x cantidad)', () => {
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-test-3',
          productoId: 'prod-3', // Funda — FIXED $15
          cantidad: 3,
          precioUnitario: 249,
          subtotal: 747,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const nuevaComision = getState().commissionEntries[0]
    expect(nuevaComision.amount).toBe(45) // 15 * 3
  })

  it('no genera comisión si el producto no tiene comisión configurada', () => {
    const comisionesAntes = getState().commissionEntries.length
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-test-4',
          productoId: 'prod-6', // Audífonos — sin comisión (null)
          cantidad: 1,
          precioUnitario: 599,
          subtotal: 599,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    // No debe haber aumentado el número de comisiones
    expect(getState().commissionEntries.length).toBe(comisionesAntes)
  })

  it('aplica descuento proporcional a la comisión PERCENTAGE', () => {
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-test-5',
          productoId: 'prod-1', // iPhone 13 — 1.5%, subtotal 17999
          cantidad: 1,
          precioUnitario: 17999,
          subtotal: 17999,
        },
      ],
      descuento: 1000, // 1000 de descuento
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const comision = getState().commissionEntries[0]
    // factorDescuento = (17999 - 1000) / 17999 = 0.9444...
    // comisión = 17999 * 0.9444 * 0.015 = 254.985, redondeado a 254.99
    const factorEsperado = (17999 - 1000) / 17999
    const montoEsperado = Math.round(17999 * factorEsperado * 0.015 * 100) / 100
    expect(comision.amount).toBeCloseTo(montoEsperado, 2)
  })

  it('asigna la comisión al operario que realiza la venta (vendedor logueado)', () => {
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-test-6',
          productoId: 'prod-3',
          cantidad: 1,
          precioUnitario: 249,
          subtotal: 249,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const comision = getState().commissionEntries[0]
    expect(comision.operarioId).toBe('u-vend-1') // Laura Sánchez
  })

  it('vincula la comisión con la venta mediante ventaId', () => {
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-test-7',
          productoId: 'prod-3',
          cantidad: 1,
          precioUnitario: 249,
          subtotal: 249,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const comision = getState().commissionEntries[0]
    expect(comision.ventaId).toBe(ventaId)
    expect(comision.type).toBe('SALE')
  })

  it('genera múltiples comisiones cuando hay varios productos con comisión', () => {
    const antes = getState().commissionEntries.length
    getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-test-8a',
          productoId: 'prod-1', // iPhone — 1.5%
          cantidad: 1,
          precioUnitario: 17999,
          subtotal: 17999,
        },
        {
          id: 'item-test-8b',
          productoId: 'prod-3', // Funda — $15
          cantidad: 2,
          precioUnitario: 249,
          subtotal: 498,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    expect(getState().commissionEntries.length).toBe(antes + 2)
  })
})

describe('Cancelación de comisiones al anular venta', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('VENDEDOR')
    getState().setTallerActual('taller-1')
  })

  it('marca comisiones como CANCELLED al anular la venta', () => {
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-anular-1',
          productoId: 'prod-3',
          cantidad: 1,
          precioUnitario: 249,
          subtotal: 249,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const comisionId = getState().commissionEntries[0].id
    expect(getState().commissionEntries[0].estado).toBe('ACTIVE')

    getState().anularVenta(ventaId!)

    const comision = getState().commissionEntries.find((c) => c.id === comisionId)
    expect(comision?.estado).toBe('CANCELLED')
    expect(comision?.description).toContain('[ANULADA]')
  })

  it('no cancela comisiones que ya fueron pagadas', () => {
    // Crear venta y comisión
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-anular-2',
          productoId: 'prod-3',
          cantidad: 1,
          precioUnitario: 249,
          subtotal: 249,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    const comision = getState().commissionEntries[0]

    // Simular que la comisión fue pagada
    useStore.setState({
      commissionEntries: getState().commissionEntries.map((c) =>
        c.id === comision.id ? { ...c, operatorPaymentId: 'pago-falso' } : c
      ),
    })

    getState().anularVenta(ventaId!)
    const comisionActualizada = getState().commissionEntries.find((c) => c.id === comision.id)
    // Debe seguir ACTIVE porque ya fue pagada
    expect(comisionActualizada?.estado).toBe('ACTIVE')
  })

  it('anular una venta ya anulada no hace nada', () => {
    const ventaId = getState().crearVenta({
      clienteId: 'cliente-general',
      items: [
        {
          id: 'item-anular-3',
          productoId: 'prod-3',
          cantidad: 1,
          precioUnitario: 249,
          subtotal: 249,
        },
      ],
      descuento: 0,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    getState().anularVenta(ventaId!)
    const estado1 = getState().ventas.find((v) => v.id === ventaId)?.estado
    getState().anularVenta(ventaId!) // Segunda vez
    const estado2 = getState().ventas.find((v) => v.id === ventaId)?.estado
    expect(estado1).toBe('ANULADA')
    expect(estado2).toBe('ANULADA')
  })
})

describe('Generación de comisiones al entregar orden de servicio', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ELECTRONICO') // Sofia Castro — u-elec-1
    getState().setTallerActual('taller-1')
  })

  it('genera comisiones por cada línea de servicio con comisión al entregar', () => {
    // Crear orden con una línea que tiene comisión PERCENTAGE 10%
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 13',
      problemaReportado: 'Pantalla rota',
      lineas: [
        {
          id: 'linea-test-1',
          descripcion: 'Cambio de pantalla',
          precioManoObra: 800,
          personalizada: false,
          operatorCommissionType: 'PERCENTAGE',
          operatorCommissionValue: 10,
        },
      ],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })
    expect(ordenId).not.toBeNull()

    const comisionesAntes = getState().commissionEntries.length

    // Entregar la orden (genera garantía + comisión)
    getState().entregarOrden(ordenId!, 90, 'Cobertura estándar')

    const comisionesDespues = getState().commissionEntries.length
    expect(comisionesDespues).toBe(comisionesAntes + 1)

    const nuevaComision = getState().commissionEntries[0]
    expect(nuevaComision.type).toBe('SERVICE')
    expect(nuevaComision.amount).toBeCloseTo(80, 2) // 800 * 0.10
    expect(nuevaComision.ordenId).toBe(ordenId)
  })

  it('calcula comisión FIXED en línea de servicio', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Samsung',
      modelo: 'Galaxy A54',
      problemaReportado: 'Desbloqueo FRP',
      lineas: [
        {
          id: 'linea-test-2',
          descripcion: 'Desbloqueo FRP',
          precioManoObra: 600,
          personalizada: true,
          operatorCommissionType: 'FIXED',
          operatorCommissionValue: 100,
        },
      ],
      piezasUtilizadas: [],
      metodoPago: 'Tarjeta',
      tallerId: 'taller-1',
    })

    getState().entregarOrden(ordenId!, 60, '')

    const comision = getState().commissionEntries[0]
    expect(comision.amount).toBe(100)
    expect(comision.type).toBe('SERVICE')
  })

  it('no genera comisión si la línea no tiene comisión configurada', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Xiaomi',
      modelo: 'Redmi Note',
      problemaReportado: 'Diagnóstico',
      lineas: [
        {
          id: 'linea-test-3',
          descripcion: 'Diagnóstico',
          precioManoObra: 150,
          personalizada: true,
          operatorCommissionType: null,
          operatorCommissionValue: null,
        },
      ],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    const antes = getState().commissionEntries.length
    getState().entregarOrden(ordenId!, 30, '')
    expect(getState().commissionEntries.length).toBe(antes)
  })

  it('asigna la comisión de servicio al técnico de la orden', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 12',
      problemaReportado: 'Batería',
      lineas: [
        {
          id: 'linea-test-4',
          descripcion: 'Cambio de batería',
          precioManoObra: 400,
          personalizada: false,
          operatorCommissionType: 'FIXED',
          operatorCommissionValue: 50,
        },
      ],
      piezasUtilizadas: [],
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    getState().entregarOrden(ordenId!, 90, '')

    const comision = getState().commissionEntries[0]
    expect(comision.operarioId).toBe('u-elec-1') // Sofia, la electrónica logueada
  })

  it('aplica descuento de la orden proporcionalmente a la comisión', () => {
    const ordenId = getState().crearOrdenServicio({
      clienteId: 'cliente-general',
      marca: 'Apple',
      modelo: 'iPhone 13',
      problemaReportado: 'Pantalla',
      lineas: [
        {
          id: 'linea-test-5',
          descripcion: 'Cambio pantalla',
          precioManoObra: 800,
          personalizada: false,
          operatorCommissionType: 'PERCENTAGE',
          operatorCommissionValue: 10,
        },
      ],
      piezasUtilizadas: [],
      descuento: 200,
      metodoPago: 'Efectivo',
      tallerId: 'taller-1',
    })

    getState().entregarOrden(ordenId!, 90, '')

    const comision = getState().commissionEntries[0]
    // factorDescuento = (800 - 200) / 800 = 0.75
    // comisión = 800 * 0.75 * 0.10 = 60
    expect(comision.amount).toBeCloseTo(60, 2)
  })
})

describe('getComisionesPendientesByOperario y getComisionesPagadasByOperario', () => {
  beforeEach(() => {
    resetStore()
  })

  it('devuelve comisiones activas sin pago para el operario', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    expect(pendientes.length).toBeGreaterThan(0)
    pendientes.forEach((c) => {
      expect(c.estado).toBe('ACTIVE')
      expect(c.operatorPaymentId).toBeNull()
      expect(c.operarioId).toBe('u-vend-1')
    })
  })

  it('devuelve comisiones pagadas para el operario', () => {
    const pagadas = getState().getComisionesPagadasByOperario('u-vend-1')
    expect(pagadas.length).toBeGreaterThan(0)
    pagadas.forEach((c) => {
      expect(c.operatorPaymentId).not.toBeNull()
    })
  })

  it('devuelve array vacío para un operario inexistente', () => {
    expect(getState().getComisionesPendientesByOperario('no-existe')).toEqual([])
    expect(getState().getComisionesPagadasByOperario('no-existe')).toEqual([])
  })

  it('no incluye comisiones canceladas en pendientes', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    pendientes.forEach((c) => {
      expect(c.estado).not.toBe('CANCELLED')
    })
  })
})
