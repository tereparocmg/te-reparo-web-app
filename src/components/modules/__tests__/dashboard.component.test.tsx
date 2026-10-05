import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { DashboardModule } from '@/components/modules/dashboard'
import { renderWithRole } from '@/lib/__tests__/test-utils'

// Helper: buscar texto que puede estar dividido en múltiples elementos.
// Usa getAllByText porque el texto puede coincidir con el padre y el hijo.
const findByTextContent = (text: string) => (_content: string, element: Element | null) => {
  return !!element?.textContent?.includes(text)
}

const getOneByText = (text: string) => {
  const elements = screen.getAllByText(findByTextContent(text))
  return elements[0]
}

describe('DashboardModule — Super Admin', () => {
  beforeEach(() => {
    renderWithRole(<DashboardModule />, 'SUPER_ADMIN')
  })

  it('muestra el título Panel Global', () => {
    expect(screen.getByText(/Panel Global — Todas las Sucursales/)).toBeInTheDocument()
  })

  it('muestra las tarjetas de métricas del día', () => {
    expect(screen.getByText('Ingresos Hoy')).toBeInTheDocument()
    expect(screen.getByText('Gastos Hoy')).toBeInTheDocument()
    expect(screen.getByText('Balance Hoy')).toBeInTheDocument()
    expect(screen.getByText('Sucursales Activas')).toBeInTheDocument()
  })

  it('muestra la sección de comisiones', () => {
    expect(getOneByText('Comisiones Pendientes')).toBeInTheDocument()
    expect(getOneByText('Pagos por Confirmar')).toBeInTheDocument()
  })

  it('muestra el acceso a gestionar pagos', () => {
    expect(screen.getByText('Gestionar Pagos')).toBeInTheDocument()
  })

  it('muestra la sección de movimientos recientes', () => {
    expect(screen.getByText('Movimientos Recientes')).toBeInTheDocument()
  })
})

describe('DashboardModule — Admin', () => {
  beforeEach(() => {
    renderWithRole(<DashboardModule />, 'ADMIN')
  })

  it('muestra el título del taller', () => {
    expect(screen.getByText(/Panel — Te Reparo Centro/)).toBeInTheDocument()
  })

  it('muestra garantías por vencer (no sucursales activas)', () => {
    expect(screen.getByText('Garantías por Vencer')).toBeInTheDocument()
  })

  it('muestra la sección de comisiones', () => {
    expect(getOneByText('Comisiones Pendientes')).toBeInTheDocument()
  })
})

describe('DashboardModule — Vendedor', () => {
  beforeEach(() => {
    renderWithRole(<DashboardModule />, 'VENDEDOR')
  })

  it('muestra Mis Comisiones Pendientes', () => {
    expect(getOneByText('Mis Comisiones Pendientes')).toBeInTheDocument()
  })

  it('muestra Mis Comisiones Pagadas', () => {
    expect(getOneByText('Mis Comisiones Pagadas')).toBeInTheDocument()
  })

  it('muestra el acceso a Mis Comisiones', () => {
    expect(screen.getByText('Ir a Mis Comisiones')).toBeInTheDocument()
  })
})

describe('DashboardModule — Informático', () => {
  beforeEach(() => {
    renderWithRole(<DashboardModule />, 'INFORMATICO')
  })

  it('muestra Mis Comisiones Pendientes', () => {
    expect(getOneByText('Mis Comisiones Pendientes')).toBeInTheDocument()
  })
})

describe('DashboardModule — Electrónico', () => {
  beforeEach(() => {
    renderWithRole(<DashboardModule />, 'ELECTRONICO')
  })

  it('muestra Mis Comisiones Pendientes', () => {
    expect(getOneByText('Mis Comisiones Pendientes')).toBeInTheDocument()
  })
})
