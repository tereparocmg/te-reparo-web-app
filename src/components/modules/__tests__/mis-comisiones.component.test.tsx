import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { MisComisionesModule } from '@/components/modules/mis-comisiones'
import { renderWithRole } from '@/lib/__tests__/test-utils'

const findByTextContent = (text: string) => (_content: string, element: Element | null) => {
  return !!element?.textContent?.includes(text)
}

const getOneByText = (text: string) => {
  const elements = screen.getAllByText(findByTextContent(text))
  return elements[0]
}

describe('MisComisionesModule — Vendedor', () => {
  beforeEach(() => {
    renderWithRole(<MisComisionesModule />, 'VENDEDOR')
  })

  it('muestra el título Mis Comisiones', () => {
    expect(screen.getByText('Mis Comisiones')).toBeInTheDocument()
  })

  it('muestra el nombre del operario en la descripción', () => {
    expect(screen.getByText(/Historial de comisiones y pagos recibidos — Laura Sánchez/)).toBeInTheDocument()
  })

  it('muestra las tarjetas resumen', () => {
    expect(getOneByText('Pendiente de Pago')).toBeInTheDocument()
    expect(getOneByText('Total Pagado')).toBeInTheDocument()
    expect(getOneByText('Histórico Total')).toBeInTheDocument()
    expect(getOneByText('Pagos Recibidos')).toBeInTheDocument()
  })

  it('muestra el desglose por tipo', () => {
    expect(getOneByText('Comisiones por Ventas')).toBeInTheDocument()
    expect(getOneByText('Comisiones por Servicios')).toBeInTheDocument()
  })

  it('muestra el detalle de comisiones', () => {
    expect(screen.getByText('Detalle de Comisiones Generadas')).toBeInTheDocument()
  })

  it('muestra el historial de pagos', () => {
    expect(screen.getByText('Historial de Pagos Recibidos')).toBeInTheDocument()
  })

  it('muestra el pago semilla OP-001', () => {
    expect(screen.getByText('OP-001')).toBeInTheDocument()
  })
})

describe('MisComisionesModule — Informático', () => {
  beforeEach(() => {
    renderWithRole(<MisComisionesModule />, 'INFORMATICO')
  })

  it('muestra el nombre del informático', () => {
    expect(screen.getByText(/Historial de comisiones y pagos recibidos — Diego Ramírez/)).toBeInTheDocument()
  })
})

describe('MisComisionesModule — Electrónico', () => {
  beforeEach(() => {
    renderWithRole(<MisComisionesModule />, 'ELECTRONICO')
  })

  it('muestra el nombre del electrónico', () => {
    expect(screen.getByText(/Historial de comisiones y pagos recibidos — Sofía Castro/)).toBeInTheDocument()
  })
})
