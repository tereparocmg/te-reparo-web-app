import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { GarantiasModule } from '@/components/modules/garantias'
import { ClientesModule } from '@/components/modules/clientes'
import { PedidosModule } from '@/components/modules/pedidos'
import { ConfiguracionModule } from '@/components/modules/configuracion'
import { TalleresModule } from '@/components/modules/talleres'
import { UsuariosModule } from '@/components/modules/usuarios'
import { InventarioProductosModule } from '@/components/modules/inventario-productos'
import { InventarioPiezasModule } from '@/components/modules/inventario-piezas'
import { MovimientosModule } from '@/components/modules/movimientos'
import { OrdenesServicioModule } from '@/components/modules/ordenes-servicio'
import { PosModule } from '@/components/modules/pos'
import { renderWithRole } from '@/lib/__tests__/test-utils'

const getOneByText = (text: string | RegExp) => {
  const elements = screen.getAllByText(text)
  return elements[0]
}

describe('GarantiasModule', () => {
  beforeEach(() => {
    renderWithRole(<GarantiasModule />, 'ADMIN')
  })

  it('muestra el título', () => {
    expect(screen.getByText('Garantías')).toBeInTheDocument()
  })

  it('muestra los botones de filtro', () => {
    expect(screen.getByText('Todas')).toBeInTheDocument()
    expect(screen.getByText('Activas')).toBeInTheDocument()
    expect(screen.getByText('Por vencer (15d)')).toBeInTheDocument()
    expect(screen.getByText('Vencidas')).toBeInTheDocument()
    expect(screen.getByText('Invalidadas')).toBeInTheDocument()
  })

  it('muestra las garantías semilla en la tabla', () => {
    // gar-1 tiene folio G-001P1
    expect(screen.getByText('G-001P1')).toBeInTheDocument()
  })

  it('muestra los encabezados de la tabla', () => {
    expect(screen.getByText('Folio')).toBeInTheDocument()
    expect(screen.getByText('Tipo')).toBeInTheDocument()
    expect(screen.getByText('Vencimiento')).toBeInTheDocument()
  })
})

describe('ClientesModule', () => {
  beforeEach(() => {
    renderWithRole(<ClientesModule />, 'ADMIN')
  })

  it('muestra el título', () => {
    expect(screen.getByText('Gestión de Clientes')).toBeInTheDocument()
  })

  it('muestra el botón de nuevo cliente', () => {
    expect(screen.getByRole('button', { name: /Nuevo Cliente/ })).toBeInTheDocument()
  })

  it('muestra el cliente general', () => {
    expect(screen.getByText('Cliente General')).toBeInTheDocument()
  })

  it('muestra los encabezados de la tabla', () => {
    expect(screen.getByText('Nombre / Razón Social')).toBeInTheDocument()
    expect(screen.getByText('Tipo')).toBeInTheDocument()
  })

  it('muestra clientes semilla', () => {
    expect(screen.getByText('Juan Pérez García')).toBeInTheDocument()
    expect(screen.getByText('Ana Martínez López')).toBeInTheDocument()
  })
})

describe('PedidosModule', () => {
  beforeEach(() => {
    renderWithRole(<PedidosModule />, 'ADMIN')
  })

  it('muestra el título', () => {
    expect(screen.getByText('Pedidos Internos')).toBeInTheDocument()
  })

  it('muestra el botón de nuevo pedido', () => {
    expect(screen.getByRole('button', { name: /Nuevo Pedido/ })).toBeInTheDocument()
  })

  it('muestra la bandeja de aprobación', () => {
    expect(screen.getByText(/Bandeja de Aprobación/)).toBeInTheDocument()
  })

  it('muestra los pedidos semilla', () => {
    expect(screen.getAllByText('P-001').length).toBeGreaterThan(0)
  })
})

describe('ConfiguracionModule', () => {
  it('admin ve configuración por taller', () => {
    renderWithRole(<ConfiguracionModule />, 'ADMIN')
    expect(screen.getByText('Configuración por Taller')).toBeInTheDocument()
  })

  it('super admin ve configuración global', () => {
    renderWithRole(<ConfiguracionModule />, 'SUPER_ADMIN')
    expect(screen.getByText('Configuración Global')).toBeInTheDocument()
    // "Moneda" puede aparecer en label y en otro lugar, usamos getAllByText
    expect(screen.getAllByText('Moneda').length).toBeGreaterThan(0)
  })

  it('muestra información del sistema', () => {
    renderWithRole(<ConfiguracionModule />, 'ADMIN')
    expect(screen.getByText('Información del Sistema')).toBeInTheDocument()
  })
})

describe('TalleresModule', () => {
  it('super admin ve todos los talleres', () => {
    renderWithRole(<TalleresModule />, 'SUPER_ADMIN')
    expect(screen.getByText('Te Reparo Centro')).toBeInTheDocument()
    expect(screen.getByText('Te Reparo Norte')).toBeInTheDocument()
  })

  it('admin ve su taller', () => {
    renderWithRole(<TalleresModule />, 'ADMIN')
    expect(screen.getByText('Te Reparo Centro')).toBeInTheDocument()
  })

  it('super admin ve botón de nuevo taller', () => {
    renderWithRole(<TalleresModule />, 'SUPER_ADMIN')
    expect(screen.getByRole('button', { name: /Nuevo Taller/ })).toBeInTheDocument()
  })
})

describe('UsuariosModule', () => {
  beforeEach(() => {
    renderWithRole(<UsuariosModule />, 'ADMIN')
  })

  it('muestra el título', () => {
    expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument()
  })

  it('muestra el botón de nuevo usuario', () => {
    expect(screen.getByRole('button', { name: /Nuevo Usuario/ })).toBeInTheDocument()
  })

  it('muestra usuarios semilla', () => {
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument()
    expect(screen.getByText('Laura Sánchez')).toBeInTheDocument()
  })
})

describe('InventarioProductosModule', () => {
  beforeEach(() => {
    renderWithRole(<InventarioProductosModule />, 'ADMIN')
  })

  it('muestra el título', () => {
    expect(screen.getByText('Inventario de Productos')).toBeInTheDocument()
  })

  it('muestra el botón de nuevo producto', () => {
    expect(screen.getByRole('button', { name: /Nuevo Producto/ })).toBeInTheDocument()
  })

  it('muestra la columna de comisión', () => {
    expect(screen.getByRole('columnheader', { name: 'Comisión' })).toBeInTheDocument()
  })

  it('muestra productos semilla con comisión', () => {
    expect(screen.getByText('1.5%')).toBeInTheDocument()
  })

  it('muestra la barra de búsqueda', () => {
    expect(screen.getByPlaceholderText(/Buscar por nombre/)).toBeInTheDocument()
  })
})

describe('InventarioPiezasModule', () => {
  beforeEach(() => {
    renderWithRole(<InventarioPiezasModule />, 'ADMIN')
  })

  it('muestra el título', () => {
    expect(screen.getByText('Inventario de Piezas')).toBeInTheDocument()
  })

  it('muestra el botón de nueva pieza', () => {
    expect(screen.getByRole('button', { name: /Nueva Pieza/ })).toBeInTheDocument()
  })

  it('muestra piezas semilla', () => {
    expect(screen.getByText('Pantalla OLED iPhone 13')).toBeInTheDocument()
  })
})

describe('MovimientosModule', () => {
  beforeEach(() => {
    renderWithRole(<MovimientosModule />, 'ADMIN')
  })

  it('muestra el título', () => {
    expect(screen.getByText('Movimientos y Caja')).toBeInTheDocument()
  })

  it('muestra las tarjetas de métricas', () => {
    expect(screen.getByText('Ingresos Hoy')).toBeInTheDocument()
    expect(screen.getByText('Gastos Hoy')).toBeInTheDocument()
    expect(screen.getByText('Compras Hoy')).toBeInTheDocument()
    expect(screen.getByText('Balance Hoy')).toBeInTheDocument()
  })

  it('muestra el botón de exportar Excel', () => {
    expect(screen.getByRole('button', { name: /Exportar Excel/ })).toBeInTheDocument()
  })

  it('muestra el botón de registrar gasto', () => {
    expect(screen.getByRole('button', { name: /Registrar Gasto/ })).toBeInTheDocument()
  })

  it('muestra el botón de registrar compra', () => {
    expect(screen.getByRole('button', { name: /Registrar Compra/ })).toBeInTheDocument()
  })
})

describe('OrdenesServicioModule', () => {
  beforeEach(() => {
    renderWithRole(<OrdenesServicioModule />, 'ADMIN')
  })

  it('muestra el título', () => {
    expect(screen.getByText('Órdenes de Servicio')).toBeInTheDocument()
  })

  it('muestra el botón de nueva orden', () => {
    expect(screen.getByRole('button', { name: /Nueva Orden/ })).toBeInTheDocument()
  })

  it('muestra los filtros de estado', () => {
    expect(screen.getByText('Todas')).toBeInTheDocument()
    // Los estados aparecen en filtro y en tabla, usamos getAllByText
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('En Proceso').length).toBeGreaterThan(0)
  })

  it('muestra órdenes semilla', () => {
    expect(screen.getByText('OS-001X1')).toBeInTheDocument()
  })
})

describe('PosModule', () => {
  beforeEach(() => {
    renderWithRole(<PosModule />, 'VENDEDOR')
  })

  it('muestra el título', () => {
    expect(screen.getByText('Punto de Venta')).toBeInTheDocument()
  })

  it('muestra la sección de productos disponibles', () => {
    expect(screen.getByText('Productos Disponibles')).toBeInTheDocument()
  })

  it('muestra productos del taller', () => {
    expect(screen.getByText('iPhone 13 128GB')).toBeInTheDocument()
  })

  it('muestra el carrito vacío inicialmente', () => {
    expect(screen.getByText(/Agrega productos al carrito/)).toBeInTheDocument()
  })
})
