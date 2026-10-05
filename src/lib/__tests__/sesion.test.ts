import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { resetStore, loginAsRol, getState } from './helpers'

describe('Sesión y autenticación', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it('inicia sin usuario actual', () => {
    expect(getState().usuarioActual).toBeNull()
  })

  it('login con credenciales correctas inicia sesión', () => {
    const ok = getState().login('superadmin@tereparo.mx', 'admin123')
    expect(ok).toBe(true)
    expect(getState().usuarioActual).not.toBeNull()
    expect(getState().usuarioActual?.rol).toBe('SUPER_ADMIN')
  })

  it('login con credenciales incorrectas falla', () => {
    const ok = getState().login('superadmin@tereparo.mx', 'wrong')
    expect(ok).toBe(false)
    expect(getState().usuarioActual).toBeNull()
  })

  it('login con email inexistente falla', () => {
    const ok = getState().login('noexiste@tereparo.mx', 'admin123')
    expect(ok).toBe(false)
  })

  it('login es case-insensitive en el email', () => {
    const ok = getState().login('SUPERADMIN@tereparo.mx', 'admin123')
    expect(ok).toBe(true)
  })

  it('loginAs establece el usuario por rol', () => {
    loginAsRol('VENDEDOR')
    expect(getState().usuarioActual?.rol).toBe('VENDEDOR')
    expect(getState().usuarioActual?.nombre).toBe('Laura Sánchez')
  })

  it('loginAs establece el taller actual al primero del usuario', () => {
    loginAsRol('ADMIN')
    expect(getState().tallerActualId).toBe('taller-1')
  })

  it('super admin tiene asignados ambos talleres', () => {
    loginAsRol('SUPER_ADMIN')
    expect(getState().usuarioActual?.tallerIds).toEqual(['taller-1', 'taller-2'])
  })

  it('logout limpia la sesión', () => {
    loginAsRol('ADMIN')
    expect(getState().usuarioActual).not.toBeNull()
    getState().logout()
    expect(getState().usuarioActual).toBeNull()
  })

  it('setVista cambia la vista actual', () => {
    loginAsRol('ADMIN')
    getState().setVista('pos')
    expect(getState().vistaActual).toBe('pos')
  })

  it('setTallerActual cambia el taller activo', () => {
    loginAsRol('SUPER_ADMIN')
    getState().setTallerActual('taller-2')
    expect(getState().tallerActualId).toBe('taller-2')
  })
})

describe('Datos semilla', () => {
  beforeEach(() => {
    resetStore()
  })

  it('carga 2 talleres por defecto', () => {
    expect(getState().talleres).toHaveLength(2)
    expect(getState().talleres.map((t) => t.id)).toEqual(
      expect.arrayContaining(['taller-1', 'taller-2'])
    )
  })

  it('carga 6 usuarios semilla', () => {
    expect(getState().usuarios).toHaveLength(6)
  })

  it('incluye los 5 roles', () => {
    const roles = getState().usuarios.map((u) => u.rol)
    expect(roles).toEqual(
      expect.arrayContaining(['SUPER_ADMIN', 'ADMIN', 'VENDEDOR', 'INFORMATICO', 'ELECTRONICO'])
    )
  })

  it('incluye el cliente general precargado', () => {
    const cli = getState().clientes.find((c) => c.esClienteGeneral)
    expect(cli).toBeDefined()
    expect(cli?.id).toBe('cliente-general')
    expect(cli?.nombre).toBe('Cliente General')
  })

  it('carga productos con comisiones configuradas', () => {
    const productos = getState().productos
    expect(productos.length).toBeGreaterThanOrEqual(6)
    const iphone = productos.find((p) => p.id === 'prod-1')
    expect(iphone?.operatorCommissionType).toBe('PERCENTAGE')
    expect(iphone?.operatorCommissionValue).toBe(1.5)
  })

  it('carga comisiones semilla', () => {
    expect(getState().commissionEntries.length).toBeGreaterThan(0)
  })

  it('carga un pago semilla PAID', () => {
    const pagos = getState().operatorPayments
    expect(pagos.length).toBeGreaterThan(0)
    const paid = pagos.find((p) => p.status === 'PAID')
    expect(paid).toBeDefined()
  })
})
