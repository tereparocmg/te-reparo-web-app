import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { resetStore, loginAsRol, getState } from './helpers'

describe('validarCodigoBarras', () => {
  beforeEach(() => {
    resetStore()
  })

  it('devuelve true para un código nuevo no registrado', () => {
    expect(getState().validarCodigoBarras('9999999999999')).toBe(true)
  })

  it('devuelve false para un código ya existente en productos', () => {
    // prod-1 tiene código 7501234560011
    expect(getState().validarCodigoBarras('7501234560011')).toBe(false)
  })

  it('devuelve false para un código ya existente en piezas', () => {
    // pz-1 tiene código 7509876540011
    expect(getState().validarCodigoBarras('7509876540011')).toBe(false)
  })

  it('excluye el id del propio producto al validar (para edición)', () => {
    expect(getState().validarCodigoBarras('7501234560011', 'prod-1')).toBe(true)
  })

  it('excluye el id de la propia pieza al validar', () => {
    expect(getState().validarCodigoBarras('7509876540011', 'pz-1')).toBe(true)
  })

  it('no permite usar el mismo código en un producto y una pieza', () => {
    // Crear pieza con código nuevo
    const piezaId = getState().savePieza({
      sku: 'PIEZA-TEST',
      codigoBarras: '7777777777777',
      nombre: 'Pieza Test',
      costoUnitario: 100,
      stock: 5,
      tallerId: 'taller-1',
    })
    expect(piezaId).not.toBeNull()

    // Intentar crear producto con el mismo código
    const productoId = getState().saveProducto({
      sku: 'PROD-TEST',
      codigoBarras: '7777777777777',
      nombre: 'Producto Test',
      precioCosto: 100,
      precioVenta: 200,
      stock: 5,
      tallerId: 'taller-1',
    })
    expect(productoId).toBeNull() // Debe fallar
  })
})

describe('saveProducto', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('crea un producto nuevo con id generado', () => {
    const antes = getState().productos.length
    const id = getState().saveProducto({
      sku: 'PROD-NEW-1',
      codigoBarras: '8888888888888',
      nombre: 'Producto Nuevo Test',
      precioCosto: 100,
      precioVenta: 200,
      stock: 10,
      stockMinimo: 2,
      garantiaDias: 30,
      tallerId: 'taller-1',
    })
    expect(id).not.toBeNull()
    expect(getState().productos.length).toBe(antes + 1)
    const nuevo = getState().productos.find((p) => p.id === id)
    expect(nuevo?.nombre).toBe('Producto Nuevo Test')
    expect(nuevo?.activo).toBe(true)
  })

  it('guarda los campos de comisión al crear', () => {
    const id = getState().saveProducto({
      sku: 'PROD-COM-1',
      codigoBarras: '8888888888889',
      nombre: 'Producto Comisión',
      precioCosto: 100,
      precioVenta: 200,
      stock: 10,
      tallerId: 'taller-1',
      operatorCommissionType: 'PERCENTAGE',
      operatorCommissionValue: 5,
    })
    const nuevo = getState().productos.find((p) => p.id === id)
    expect(nuevo?.operatorCommissionType).toBe('PERCENTAGE')
    expect(nuevo?.operatorCommissionValue).toBe(5)
  })

  it('asigna null a comisión si no se especifica', () => {
    const id = getState().saveProducto({
      sku: 'PROD-NOCOM-1',
      codigoBarras: '8888888888890',
      nombre: 'Producto Sin Comisión',
      precioCosto: 100,
      precioVenta: 200,
      stock: 10,
      tallerId: 'taller-1',
    })
    const nuevo = getState().productos.find((p) => p.id === id)
    expect(nuevo?.operatorCommissionType).toBeNull()
    expect(nuevo?.operatorCommissionValue).toBeNull()
  })

  it('actualiza un producto existente', () => {
    const id = getState().saveProducto({
      sku: 'PROD-UPD-1',
      codigoBarras: '8888888888891',
      nombre: 'Nombre Original',
      precioCosto: 100,
      precioVenta: 200,
      stock: 10,
      tallerId: 'taller-1',
    })

    getState().saveProducto({
      id: id!,
      nombre: 'Nombre Actualizado',
      precioVenta: 250,
    })

    const actualizado = getState().productos.find((p) => p.id === id)
    expect(actualizado?.nombre).toBe('Nombre Actualizado')
    expect(actualizado?.precioVenta).toBe(250)
  })

  it('no crea producto si el código de barras está duplicado', () => {
    const id = getState().saveProducto({
      sku: 'PROD-DUP-1',
      codigoBarras: '7501234560011', // Ya existe en prod-1
      nombre: 'Producto Duplicado',
      precioCosto: 100,
      precioVenta: 200,
      stock: 10,
      tallerId: 'taller-1',
    })
    expect(id).toBeNull()
  })
})

describe('savePieza', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('crea una pieza nueva', () => {
    const antes = getState().piezas.length
    const id = getState().savePieza({
      sku: 'PIEZA-NEW-1',
      codigoBarras: '9999999999999',
      nombre: 'Pieza Nueva',
      costoUnitario: 500,
      stock: 3,
      tallerId: 'taller-1',
    })
    expect(id).not.toBeNull()
    expect(getState().piezas.length).toBe(antes + 1)
  })

  it('no crea pieza con código duplicado', () => {
    const id = getState().savePieza({
      sku: 'PIEZA-DUP',
      codigoBarras: '7509876540011', // Existe en pz-1
      nombre: 'Pieza Duplicada',
      costoUnitario: 500,
      stock: 3,
      tallerId: 'taller-1',
    })
    expect(id).toBeNull()
  })
})

describe('ajustarStockProducto / ajustarStockPieza', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it('incrementa el stock de un producto', () => {
    const stockInicial = getState().productos.find((p) => p.id === 'prod-1')?.stock || 0
    getState().ajustarStockProducto('prod-1', 5)
    const stockFinal = getState().productos.find((p) => p.id === 'prod-1')?.stock || 0
    expect(stockFinal).toBe(stockInicial + 5)
  })

  it('decrementa el stock de un producto', () => {
    const stockInicial = getState().productos.find((p) => p.id === 'prod-1')?.stock || 0
    getState().ajustarStockProducto('prod-1', -3)
    const stockFinal = getState().productos.find((p) => p.id === 'prod-1')?.stock || 0
    expect(stockFinal).toBe(stockInicial - 3)
  })

  it('no permite stock negativo en producto', () => {
    getState().ajustarStockProducto('prod-1', -99999)
    const stockFinal = getState().productos.find((p) => p.id === 'prod-1')?.stock || 0
    expect(stockFinal).toBe(0)
  })

  it('no permite stock negativo en pieza', () => {
    getState().ajustarStockPieza('pz-1', -99999)
    const stockFinal = getState().piezas.find((p) => p.id === 'pz-1')?.stock || 0
    expect(stockFinal).toBe(0)
  })
})

describe('deleteProducto / deletePieza (soft delete)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it('deleteProducto marca como inactivo, no elimina', () => {
    const totalAntes = getState().productos.length
    getState().deleteProducto('prod-1')
    const totalDespues = getState().productos.length
    expect(totalDespues).toBe(totalAntes) // Sigue en el array
    const producto = getState().productos.find((p) => p.id === 'prod-1')
    expect(producto?.activo).toBe(false)
  })

  it('deletePieza marca como inactiva, no elimina', () => {
    const totalAntes = getState().piezas.length
    getState().deletePieza('pz-1')
    const totalDespues = getState().piezas.length
    expect(totalDespues).toBe(totalAntes)
    const pieza = getState().piezas.find((p) => p.id === 'pz-1')
    expect(pieza?.activo).toBe(false)
  })
})

describe('Categorías', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    loginAsRol('ADMIN')
    getState().setTallerActual('taller-1')
  })

  it('crea una categoría nueva', () => {
    const antes = getState().categorias.length
    getState().saveCategoria({ nombre: 'Nueva Cat', tipo: 'PRODUCTO', tallerId: 'taller-1' })
    expect(getState().categorias.length).toBe(antes + 1)
  })

  it('toggleCategoria cambia el estado activa', () => {
    const cat = getState().categorias.find((c) => c.id === 'cat-p-1')
    const estadoInicial = cat?.activa
    getState().toggleCategoria('cat-p-1')
    const catActualizada = getState().categorias.find((c) => c.id === 'cat-p-1')
    expect(catActualizada?.activa).toBe(!estadoInicial)
  })

  it('deleteCategoria elimina físicamente', () => {
    const antes = getState().categorias.length
    getState().deleteCategoria('cat-p-1')
    expect(getState().categorias.length).toBe(antes - 1)
  })
})
