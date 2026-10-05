import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { resetStore, loginAsRol, getState } from './helpers'

describe('crearPagoOperador', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('crea un OperatorPayment con folio único', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 2).map((c) => c.id)

    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids, 'Pago test')

    expect(pagoId).not.toBeNull()
    const pago = getState().operatorPayments.find((p) => p.id === pagoId)
    expect(pago).toBeDefined()
    expect(pago?.folio).toMatch(/^OP-/)
    expect(pago?.status).toBe('PENDING')
    expect(pago?.operarioId).toBe('u-vend-1')
    expect(pago?.tallerId).toBe('taller-1')
  })

  it('suma correctamente el monto total de las comisiones', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 3).map((c) => c.id)
    const montoEsperado = pendientes.slice(0, 3).reduce((s, c) => s + c.amount, 0)

    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)

    const pago = getState().operatorPayments.find((p) => p.id === pagoId)
    expect(pago?.amount).toBeCloseTo(montoEsperado, 2)
  })

  it('vincula las comisiones al pago (operatorPaymentId)', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 2).map((c) => c.id)

    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)

    const comisionesActualizadas = getState().commissionEntries.filter((c) => ids.includes(c.id))
    comisionesActualizadas.forEach((c) => {
      expect(c.operatorPaymentId).toBe(pagoId)
    })
  })

  it('guarda el campo notas', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 1).map((c) => c.id)

    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids, 'Pago diario — lunes')

    const pago = getState().operatorPayments.find((p) => p.id === pagoId)
    expect(pago?.notas).toBe('Pago diario — lunes')
  })

  it('inicia con paidAt y paidById nulos (estado PENDING)', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 1).map((c) => c.id)

    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)

    const pago = getState().operatorPayments.find((p) => p.id === pagoId)
    expect(pago?.paidAt).toBeNull()
    expect(pago?.paidById).toBeNull()
    expect(pago?.status).toBe('PENDING')
  })

  it('ignora comisiones que ya están pagadas', () => {
    // Tomar una comisión ya pagada (ce-3 está vinculada a op-1 en semilla)
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ['ce-3'])

    // No debe crear pago porque la comisión ya está pagada
    expect(pagoId).toBeNull()
  })

  it('ignora comisiones canceladas', () => {
    // Cancelar una comisión manualmente
    useStore.setState({
      commissionEntries: getState().commissionEntries.map((c) =>
        c.id === 'ce-1' ? { ...c, estado: 'CANCELLED' as const } : c
      ),
    })

    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ['ce-1'])
    expect(pagoId).toBeNull()
  })

  it('devuelve null si no hay comisiones válidas', () => {
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', [])
    expect(pagoId).toBeNull()
  })

  it('registra la fecha de creación', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 1).map((c) => c.id)
    const antes = Date.now()

    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)

    const pago = getState().operatorPayments.find((p) => p.id === pagoId)
    expect(new Date(pago!.createdAt).getTime()).toBeGreaterThanOrEqual(antes - 1000)
  })
})

describe('confirmarPagoOperador', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('cambia el estado de PENDING a PAID', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 2).map((c) => c.id)
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)

    getState().confirmarPagoOperador(pagoId!)

    const pago = getState().operatorPayments.find((p) => p.id === pagoId)
    expect(pago?.status).toBe('PAID')
  })

  it('registra paidAt con timestamp actual', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 1).map((c) => c.id)
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)
    const antes = Date.now()

    getState().confirmarPagoOperador(pagoId!)

    const pago = getState().operatorPayments.find((p) => p.id === pagoId)
    expect(pago?.paidAt).not.toBeNull()
    expect(new Date(pago!.paidAt!).getTime()).toBeGreaterThanOrEqual(antes - 1000)
  })

  it('registra paidById con el usuario actual (admin)', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 1).map((c) => c.id)
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)

    getState().confirmarPagoOperador(pagoId!)

    const pago = getState().operatorPayments.find((p) => p.id === pagoId)
    expect(pago?.paidById).toBe('u-admin-1') // Carlos Mendoza
  })

  it('mantener el monto del pago sin cambios al confirmar', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 2).map((c) => c.id)
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)
    const montoAntes = getState().operatorPayments.find((p) => p.id === pagoId)?.amount

    getState().confirmarPagoOperador(pagoId!)

    const montoDespues = getState().operatorPayments.find((p) => p.id === pagoId)?.amount
    expect(montoDespues).toBe(montoAntes)
  })
})

describe('cancelarPagoOperador', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('elimina el pago pendiente', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 2).map((c) => c.id)
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)

    const totalAntes = getState().operatorPayments.length
    getState().cancelarPagoOperador(pagoId!)
    expect(getState().operatorPayments.length).toBe(totalAntes - 1)
  })

  it('libera las comisiones (operatorPaymentId vuelve a null)', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 2).map((c) => c.id)
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)

    // Verificar que quedaron vinculadas
    const vinculadas = getState().commissionEntries.filter((c) => ids.includes(c.id))
    vinculadas.forEach((c) => expect(c.operatorPaymentId).toBe(pagoId))

    getState().cancelarPagoOperador(pagoId!)

    // Ahora deben estar liberadas
    const liberadas = getState().commissionEntries.filter((c) => ids.includes(c.id))
    liberadas.forEach((c) => expect(c.operatorPaymentId).toBeNull())
  })

  it('no permite cancelar un pago ya PAID', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 1).map((c) => c.id)
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)
    getState().confirmarPagoOperador(pagoId!)

    const totalAntes = getState().operatorPayments.length
    getState().cancelarPagoOperador(pagoId!)
    expect(getState().operatorPayments.length).toBe(totalAntes) // No se eliminó
  })

  it('las comisiones liberadas vuelven a estar disponibles para un nuevo pago', () => {
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientes.slice(0, 1).map((c) => c.id)
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)

    // Al cancelar, la comisión vuelve a estar pendiente
    getState().cancelarPagoOperador(pagoId!)
    const pendientesDespues = getState().getComisionesPendientesByOperario('u-vend-1')
    expect(pendientesDespues.some((c) => ids.includes(c.id))).toBe(true)
  })
})

describe('Flujo completo de pago', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('flujo: generar pago → confirmar → verificar histórico', () => {
    const pendientesIniciales = getState().getComisionesPendientesByOperario('u-vend-1')
    const pagadasIniciales = getState().getComisionesPagadasByOperario('u-vend-1')
    const ids = pendientesIniciales.map((c) => c.id)
    const montoPendienteInicial = pendientesIniciales.reduce((s, c) => s + c.amount, 0)
    const montoPagadoInicial = pagadasIniciales.reduce((s, c) => s + c.amount, 0)

    // 1. Generar pago con todas las pendientes
    const pagoId = getState().crearPagoOperador('u-vend-1', 'taller-1', ids, 'Pago completo')
    expect(pagoId).not.toBeNull()

    // 2. Verificar que ya no hay pendientes
    expect(getState().getComisionesPendientesByOperario('u-vend-1')).toEqual([])

    // 3. Confirmar pago
    getState().confirmarPagoOperador(pagoId!)

    // 4. Verificar histórico: pagadas ahora = pagadas previas + las recién pagadas
    const pagadasDespues = getState().getComisionesPagadasByOperario('u-vend-1')
    const montoPagadoDespues = pagadasDespues.reduce((s, c) => s + c.amount, 0)
    expect(montoPagadoDespues).toBeCloseTo(montoPagadoInicial + montoPendienteInicial, 2)
  })

  it('flujo: generar pago → cancelar → volver a generar', () => {
    const pendientesIniciales = getState().getComisionesPendientesByOperario('u-vend-1')
    const ids = pendientesIniciales.slice(0, 2).map((c) => c.id)

    // 1. Generar pago
    const pago1 = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)
    expect(pago1).not.toBeNull()

    // 2. Cancelar pago
    getState().cancelarPagoOperador(pago1!)

    // 3. Las comisiones vuelven a estar pendientes
    const pendientes = getState().getComisionesPendientesByOperario('u-vend-1')
    expect(pendientes.some((c) => ids.includes(c.id))).toBe(true)

    // 4. Generar nuevo pago con las mismas comisiones
    const pago2 = getState().crearPagoOperador('u-vend-1', 'taller-1', ids)
    expect(pago2).not.toBeNull()
    expect(pago2).not.toBe(pago1)
  })
})
