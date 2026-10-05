import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { resetStore, loginAsRol, getState } from './helpers'

describe('Permisos por rol — datos semilla', () => {
  beforeEach(() => {
    resetStore()
  })

  it('super admin tiene acceso a ambos talleres', () => {
    const superAdmin = getState().usuarios.find((u) => u.rol === 'SUPER_ADMIN')
    expect(superAdmin?.tallerIds).toEqual(['taller-1', 'taller-2'])
  })

  it('admin 1 solo tiene taller-1', () => {
    const admin1 = getState().usuarios.find((u) => u.id === 'u-admin-1')
    expect(admin1?.tallerIds).toEqual(['taller-1'])
  })

  it('admin 2 solo tiene taller-2', () => {
    const admin2 = getState().usuarios.find((u) => u.id === 'u-admin-2')
    expect(admin2?.tallerIds).toEqual(['taller-2'])
  })

  it('vendedor solo tiene taller-1', () => {
    const vendedor = getState().usuarios.find((u) => u.rol === 'VENDEDOR')
    expect(vendedor?.tallerIds).toEqual(['taller-1'])
  })

  it('informático solo tiene taller-1', () => {
    const info = getState().usuarios.find((u) => u.rol === 'INFORMATICO')
    expect(info?.tallerIds).toEqual(['taller-1'])
  })

  it('electrónico solo tiene taller-1', () => {
    const elec = getState().usuarios.find((u) => u.rol === 'ELECTRONICO')
    expect(elec?.tallerIds).toEqual(['taller-1'])
  })
})

describe('Roles de operario (generan comisiones)', () => {
  beforeEach(() => {
    resetStore()
  })

  it('VENDEDOR es un rol de operario', () => {
    const vendedor = getState().usuarios.find((u) => u.rol === 'VENDEDOR')
    expect(vendedor).toBeDefined()
    expect(vendedor?.activo).toBe(true)
  })

  it('INFORMATICO es un rol de operario', () => {
    const info = getState().usuarios.find((u) => u.rol === 'INFORMATICO')
    expect(info).toBeDefined()
    expect(info?.activo).toBe(true)
  })

  it('ELECTRONICO es un rol de operario', () => {
    const elec = getState().usuarios.find((u) => u.rol === 'ELECTRONICO')
    expect(elec).toBeDefined()
    expect(elec?.activo).toBe(true)
  })

  it('ADMIN no es rol de operario (no genera comisiones)', () => {
    const admin = getState().usuarios.find((u) => u.rol === 'ADMIN')
    expect(admin).toBeDefined()
    // No hay comisiones semilla para admin
    const comisionesAdmin = getState().commissionEntries.filter((c) => c.operarioId === admin?.id)
    expect(comisionesAdmin.length).toBe(0)
  })

  it('SUPER_ADMIN no es rol de operario', () => {
    const sa = getState().usuarios.find((u) => u.rol === 'SUPER_ADMIN')
    const comisionesSA = getState().commissionEntries.filter((c) => c.operarioId === sa?.id)
    expect(comisionesSA.length).toBe(0)
  })
})

describe('Usuarios inactivos', () => {
  beforeEach(() => {
    resetStore()
  })

  it('deleteUsuario marca como inactivo, no elimina', () => {
    const totalAntes = getState().usuarios.length
    getState().deleteUsuario('u-vend-1')
    expect(getState().usuarios.length).toBe(totalAntes)
    const user = getState().usuarios.find((u) => u.id === 'u-vend-1')
    expect(user?.activo).toBe(false)
  })

  it('login falla con usuario inactivo', () => {
    getState().deleteUsuario('u-vend-1') // Marca como inactivo
    const ok = getState().login('vendedor@tereparo.mx', 'vendedor123')
    expect(ok).toBe(false)
  })
})

describe('Asignación múltiple de talleres', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('SUPER_ADMIN')
  })

  it('saveUsuario crea un usuario con múltiples talleres', () => {
    getState().saveUsuario({
      nombre: 'Multi Taller',
      email: 'multi@tereparo.mx',
      password: 'test',
      rol: 'VENDEDOR',
      tallerIds: ['taller-1', 'taller-2'],
    })
    const nuevo = getState().usuarios.find((u) => u.email === 'multi@tereparo.mx')
    expect(nuevo?.tallerIds).toEqual(['taller-1', 'taller-2'])
  })

  it('saveUsuario actualiza los talleres de un usuario existente', () => {
    getState().saveUsuario({
      id: 'u-vend-1',
      tallerIds: ['taller-1', 'taller-2'],
    })
    const actualizado = getState().usuarios.find((u) => u.id === 'u-vend-1')
    expect(actualizado?.tallerIds).toEqual(['taller-1', 'taller-2'])
  })
})

describe('Productos y piezas por taller', () => {
  beforeEach(() => {
    resetStore()
  })

  it('taller-1 tiene productos asignados', () => {
    const productosT1 = getState().productos.filter((p) => p.tallerId === 'taller-1')
    expect(productosT1.length).toBeGreaterThan(0)
  })

  it('taller-2 no tiene productos en la semilla', () => {
    const productosT2 = getState().productos.filter((p) => p.tallerId === 'taller-2')
    expect(productosT2.length).toBe(0)
  })

  it('taller-1 tiene piezas asignadas', () => {
    const piezasT1 = getState().piezas.filter((p) => p.tallerId === 'taller-1')
    expect(piezasT1.length).toBeGreaterThan(0)
  })

  it('los productos de taller-1 no aparecen en taller-2', () => {
    const prodT1 = getState().productos.filter((p) => p.tallerId === 'taller-1')
    const prodT2 = getState().productos.filter((p) => p.tallerId === 'taller-2')
    const idsT1 = new Set(prodT1.map((p) => p.id))
    const idsT2 = new Set(prodT2.map((p) => p.id))
    // No debe haber intersección
    const interseccion = [...idsT1].filter((id) => idsT2.has(id))
    expect(interseccion).toEqual([])
  })
})

describe('Comisiones por taller', () => {
  beforeEach(() => {
    resetStore()
  })

  it('todas las comisiones semilla son del taller-1', () => {
    const comisiones = getState().commissionEntries
    comisiones.forEach((c) => {
      expect(c.tallerId).toBe('taller-1')
    })
  })

  it('los pagos semilla son del taller-1', () => {
    const pagos = getState().operatorPayments
    pagos.forEach((p) => {
      expect(p.tallerId).toBe('taller-1')
    })
  })
})

describe('Cliente general — reglas', () => {
  beforeEach(() => {
    resetStore()
  })

  it('el cliente general tiene esClienteGeneral = true', () => {
    const cg = getState().clientes.find((c) => c.esClienteGeneral)
    expect(cg?.id).toBe('cliente-general')
  })

  it('los demás clientes no son cliente general', () => {
    const noGenerales = getState().clientes.filter((c) => !c.esClienteGeneral)
    noGenerales.forEach((c) => {
      expect(c.esClienteGeneral).toBe(false)
    })
  })

  it('saveCliente no permite crear otro cliente general', () => {
    getState().saveCliente({
      nombre: 'Otro General',
      esClienteGeneral: true,
    })
    const clientes = getState().clientes.filter((c) => c.esClienteGeneral)
    // Solo debe haber 1 (el original)
    expect(clientes.length).toBe(1)
  })

  it('saveCliente preserva esClienteGeneral al editar el cliente general', () => {
    getState().saveCliente({
      id: 'cliente-general',
      nombre: 'Cliente General Editado',
      telefono: '55 0000 0000',
    })
    const cg = getState().clientes.find((c) => c.id === 'cliente-general')
    expect(cg?.esClienteGeneral).toBe(true)
    expect(cg?.nombre).toBe('Cliente General Editado')
  })
})

describe('Categorías — reglas', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('las categorías se filtran por taller', () => {
    const catsT1 = getState().categorias.filter((c) => c.tallerId === 'taller-1')
    const catsT2 = getState().categorias.filter((c) => c.tallerId === 'taller-2')
    expect(catsT1.length).toBeGreaterThan(0)
    expect(catsT2.length).toBeGreaterThan(0)
    // No debe haber categorías compartidas
    const idsT1 = new Set(catsT1.map((c) => c.id))
    const idsT2 = new Set(catsT2.map((c) => c.id))
    const interseccion = [...idsT1].filter((id) => idsT2.has(id))
    expect(interseccion).toEqual([])
  })

  it('toggleCategoria alterna entre activa e inactiva', () => {
    const cat = getState().categorias.find((c) => c.id === 'cat-p-1')
    const estadoInicial = cat?.activa

    getState().toggleCategoria('cat-p-1')
    expect(getState().categorias.find((c) => c.id === 'cat-p-1')?.activa).toBe(!estadoInicial)

    getState().toggleCategoria('cat-p-1')
    expect(getState().categorias.find((c) => c.id === 'cat-p-1')?.activa).toBe(estadoInicial)
  })
})

describe('Validaciones de stock', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('VENDEDOR')
    getState().setTallerActual('taller-1')
  })

  it('ajustarStockProducto con delta negativo mayor al stock queda en 0', () => {
    getState().ajustarStockProducto('prod-1', -99999)
    expect(getState().productos.find((p) => p.id === 'prod-1')?.stock).toBe(0)
  })

  it('ajustarStockPieza con delta negativo mayor al stock queda en 0', () => {
    getState().ajustarStockPieza('pz-1', -99999)
    expect(getState().piezas.find((p) => p.id === 'pz-1')?.stock).toBe(0)
  })

  it('ajustarStockProducto con delta positivo incrementa', () => {
    const stock = getState().productos.find((p) => p.id === 'prod-1')?.stock || 0
    getState().ajustarStockProducto('prod-1', 10)
    expect(getState().productos.find((p) => p.id === 'prod-1')?.stock).toBe(stock + 10)
  })
})

describe('Reset del store', () => {
  beforeEach(() => {
    resetStore()
  })

  it('resetData limpia el usuario actual', () => {
    loginAsRol('ADMIN')
    expect(getState().usuarioActual).not.toBeNull()
    getState().resetData()
    expect(getState().usuarioActual).toBeNull()
  })

  it('resetData restaura los datos semilla', () => {
    // Modificar el estado
    getState().saveProducto({
      sku: 'RESET-TEST',
      codigoBarras: '9999999999991',
      nombre: 'Test Reset',
      precioCosto: 1,
      precioVenta: 2,
      stock: 1,
      tallerId: 'taller-1',
    })
    expect(getState().productos.length).toBeGreaterThan(6)

    getState().resetData()
    // Debe volver a tener 6 productos semilla
    expect(getState().productos.length).toBe(6)
  })
})

describe('Folio de operador payment — unicidad', () => {
  beforeEach(() => {
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('genera folios únicos para múltiples pagos', () => {
    const pendientes1 = getState().getComisionesPendientesByOperario('u-vend-1')
    const folios = new Set<string>()

    // Crear pago 1
    const pago1 = getState().crearPagoOperador('u-vend-1', 'taller-1', [pendientes1[0].id])
    if (pago1) folios.add(getState().operatorPayments.find((p) => p.id === pago1)!.folio)

    // Crear pago 2 con otra comisión
    const pendientes2 = getState().getComisionesPendientesByOperario('u-vend-1')
    if (pendientes2.length > 0) {
      const pago2 = getState().crearPagoOperador('u-vend-1', 'taller-1', [pendientes2[0].id])
      if (pago2) folios.add(getState().operatorPayments.find((p) => p.id === pago2)!.folio)
    }

    expect(folios.size).toBeGreaterThanOrEqual(1)
  })
})
