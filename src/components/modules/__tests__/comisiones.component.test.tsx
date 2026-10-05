import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { ComisionesModule } from '@/components/modules/comisiones'
import { renderWithRole } from '@/lib/__tests__/test-utils'

describe('ComisionesModule — Admin', () => {
  beforeEach(() => {
    renderWithRole(<ComisionesModule />, 'ADMIN')
  })

  it('muestra el título del módulo', () => {
    expect(screen.getByText('Comisiones y Pagos a Operarios')).toBeInTheDocument()
  })

  it('muestra las tarjetas resumen', () => {
    expect(screen.getAllByText(/Total Pendiente/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Total Pagado/i).length).toBeGreaterThan(0)
  })

  it('muestra la sección de comisiones por operario', () => {
    expect(screen.getByText('Comisiones por Operario')).toBeInTheDocument()
  })

  it('muestra a los operarios en la tabla', () => {
    // Usar getAllByText porque pueden aparecer en múltiples lugares
    expect(screen.getAllByText('Laura Sánchez').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Diego Ramírez').length).toBeGreaterThan(0)
  })

  it('muestra el botón de exportar Excel', () => {
    expect(screen.getByRole('button', { name: /Exportar Pagos Excel/ })).toBeInTheDocument()
  })

  it('muestra los filtros', () => {
    expect(screen.getByText('Desde')).toBeInTheDocument()
    expect(screen.getByText('Hasta')).toBeInTheDocument()
  })

  it('muestra los encabezados de la tabla', () => {
    expect(screen.getByText('Comisiones Pendientes')).toBeInTheDocument()
    // "Total Pendiente" aparece en encabezado y tarjeta, usamos getAllByText
    expect(screen.getAllByText('Total Pendiente').length).toBeGreaterThan(0)
  })
})

describe('ComisionesModule — Super Admin', () => {
  beforeEach(() => {
    renderWithRole(<ComisionesModule />, 'SUPER_ADMIN')
  })

  it('muestra el título del módulo', () => {
    expect(screen.getByText('Comisiones y Pagos a Operarios')).toBeInTheDocument()
  })

  it('muestra las tarjetas resumen', () => {
    expect(screen.getAllByText(/Total Pendiente/i).length).toBeGreaterThan(0)
  })
})
