import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '@/components/sidebar'
import { renderWithRole } from '@/lib/__tests__/test-utils'
import { useStore } from '@/lib/store'

describe('Sidebar — visibilidad por rol', () => {
  it('Super Admin ve todas las secciones', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'SUPER_ADMIN')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Talleres')).toBeInTheDocument()
    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    expect(screen.getByText('Productos (Venta)')).toBeInTheDocument()
    expect(screen.getByText('Piezas (Reparación)')).toBeInTheDocument()
    expect(screen.getByText('Punto de Venta')).toBeInTheDocument()
    expect(screen.getByText('Órdenes de Servicio')).toBeInTheDocument()
    expect(screen.getByText('Movimientos / Caja')).toBeInTheDocument()
    expect(screen.getByText('Garantías')).toBeInTheDocument()
    expect(screen.getByText('Clientes')).toBeInTheDocument()
    expect(screen.getByText('Comisiones y Pagos')).toBeInTheDocument()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
  })

  it('Admin ve gestión pero no Mis Comisiones', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'ADMIN')
    expect(screen.getByText('Talleres')).toBeInTheDocument()
    expect(screen.getByText('Comisiones y Pagos')).toBeInTheDocument()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
    expect(screen.queryByText('Mis Comisiones')).not.toBeInTheDocument()
  })

  it('Vendedor NO ve Talleres, Usuarios, Piezas, Órdenes, Pedidos, Comisiones ni Configuración', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'VENDEDOR')
    expect(screen.queryByText('Talleres')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
    expect(screen.queryByText('Piezas (Reparación)')).not.toBeInTheDocument()
    expect(screen.queryByText('Órdenes de Servicio')).not.toBeInTheDocument()
    expect(screen.queryByText('Pedidos Internos')).not.toBeInTheDocument()
    expect(screen.queryByText('Comisiones y Pagos')).not.toBeInTheDocument()
    expect(screen.queryByText('Configuración')).not.toBeInTheDocument()
    // Pero sí ve POS, Productos, Mis Comisiones
    expect(screen.getByText('Punto de Venta')).toBeInTheDocument()
    expect(screen.getByText('Productos (Venta)')).toBeInTheDocument()
    expect(screen.getByText('Mis Comisiones')).toBeInTheDocument()
  })

  it('Informático ve Piezas y Órdenes pero no POS ni Productos', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'INFORMATICO')
    expect(screen.getByText('Piezas (Reparación)')).toBeInTheDocument()
    expect(screen.getByText('Órdenes de Servicio')).toBeInTheDocument()
    expect(screen.getByText('Mis Comisiones')).toBeInTheDocument()
    expect(screen.queryByText('Punto de Venta')).not.toBeInTheDocument()
    expect(screen.queryByText('Productos (Venta)')).not.toBeInTheDocument()
  })

  it('Electrónico tiene los mismos accesos que Informático', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'ELECTRONICO')
    expect(screen.getByText('Piezas (Reparación)')).toBeInTheDocument()
    expect(screen.getByText('Órdenes de Servicio')).toBeInTheDocument()
    expect(screen.getByText('Mis Comisiones')).toBeInTheDocument()
    expect(screen.queryByText('Punto de Venta')).not.toBeInTheDocument()
  })
})

describe('Sidebar — elementos comunes', () => {
  beforeEach(() => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'ADMIN')
  })

  it('muestra el branding Te Reparo Manager', () => {
    expect(screen.getAllByText('Te Reparo').length).toBeGreaterThan(0)
    // El texto es "Manager" (CSS uppercase lo muestra como MANAGER visualmente)
    expect(screen.getByText('Manager')).toBeInTheDocument()
  })

  it('muestra el nombre del usuario actual', () => {
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument()
  })

  it('muestra el rol del usuario actual', () => {
    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('muestra el botón de cerrar sesión', () => {
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument()
  })
})

describe('Sidebar — navegación', () => {
  it('click en un item llama a setVista', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'ADMIN')
    fireEvent.click(screen.getByText('Punto de Venta'))
    expect(useStore.getState().vistaActual).toBe('pos')
  })

  it('click en cerrar sesión limpia el usuario', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'ADMIN')
    fireEvent.click(screen.getByText('Cerrar sesión'))
    expect(useStore.getState().usuarioActual).toBeNull()
  })

  it('resalta el item activo', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'ADMIN')
    const dashboardBtn = screen.getByText('Dashboard').closest('button')
    expect(dashboardBtn?.className).toContain('bg-accent')
  })
})

describe('Sidebar — badges de alerta', () => {
  it('muestra badge de pedidos pendientes para Admin', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'ADMIN')
    // Hay 2 pedidos pendientes en la semilla — el badge muestra "2"
    const pedidosItem = screen.getByText('Pedidos Internos').closest('button')
    const badge = pedidosItem?.querySelector('span[class*="bg-"]')
    expect(badge?.textContent).toBe('2')
  })

  it('muestra badge de comisiones pendientes para Admin', () => {
    renderWithRole(<Sidebar open={true} onClose={() => {}} />, 'ADMIN')
    const comisionesItem = screen.getByText('Comisiones y Pagos').closest('button')
    expect(comisionesItem).toBeInTheDocument()
  })
})
