import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { InvoiceTemplate } from '@/components/shared/invoice-template'
import { renderWithStore } from '@/lib/__tests__/test-utils'

describe('InvoiceTemplate', () => {
  it('renderiza el ticket de venta con el folio', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('TICKET DE VENTA')).toBeInTheDocument()
    // El folio V-001A2B aparece en el documento (puede estar en elementos separados)
    expect(screen.getAllByText(/V-001A2B/).length).toBeGreaterThan(0)
  })

  it('muestra el nombre del taller', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('Te Reparo Centro')).toBeInTheDocument()
  })

  it('muestra la dirección del taller', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('Av. Insurgentes Sur 1234, CDMX')).toBeInTheDocument()
  })

  it('muestra el teléfono del taller', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('Tel: 55 1234 5678')).toBeInTheDocument()
  })

  it('muestra el RFC del taller', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('RFC: TER190101AB1')).toBeInTheDocument()
  })

  it('muestra los datos del cliente', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    // ven-1 es para cli-1 (Juan Pérez García)
    expect(screen.getByText('Juan Pérez García')).toBeInTheDocument()
  })

  it('muestra la tabla de productos', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('Cant.')).toBeInTheDocument()
    expect(screen.getByText('Producto')).toBeInTheDocument()
    expect(screen.getByText('P. Unitario')).toBeInTheDocument()
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
  })

  it('muestra los items de la venta', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('iPhone 13 128GB')).toBeInTheDocument()
    expect(screen.getByText('Funda iPhone 13')).toBeInTheDocument()
  })

  it('muestra el total correctamente', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    // ven-1 tiene total 18248 — puede aparecer en subtotal y total
    expect(screen.getAllByText(/\$18,248\.00/).length).toBeGreaterThan(0)
  })

  it('muestra el método de pago', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('Tarjeta')).toBeInTheDocument()
  })

  it('muestra la garantía si la venta la tiene', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    // ven-1 tiene garantía (gar-2)
    expect(screen.getByText('GARANTÍA INCLUIDA')).toBeInTheDocument()
  })

  it('muestra los días de garantía', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('30 días')).toBeInTheDocument()
  })

  it('renderiza la factura de servicio para una orden', () => {
    renderWithStore(<InvoiceTemplate ordenId="ord-2" />)
    expect(screen.getByText('FACTURA DE SERVICIO')).toBeInTheDocument()
    expect(screen.getAllByText(/OS-002Y2/).length).toBeGreaterThan(0)
  })

  it('muestra los datos del dispositivo en la factura de servicio', () => {
    renderWithStore(<InvoiceTemplate ordenId="ord-2" />)
    // El dispositivo puede estar dividido en elementos
    expect(screen.getAllByText(/Samsung/).length).toBeGreaterThan(0)
    expect(screen.getByText(/353987654321098/)).toBeInTheDocument()
  })

  it('muestra el problema reportado en la factura de servicio', () => {
    renderWithStore(<InvoiceTemplate ordenId="ord-2" />)
    expect(screen.getByText(/Olvido de cuenta Google/)).toBeInTheDocument()
  })

  it('muestra las líneas de servicio', () => {
    renderWithStore(<InvoiceTemplate ordenId="ord-2" />)
    expect(screen.getByText('Desbloqueo FRP')).toBeInTheDocument()
    expect(screen.getByText('Servicio')).toBeInTheDocument()
  })

  it('muestra el agradecimiento al pie', () => {
    renderWithStore(<InvoiceTemplate ventaId="ven-1" />)
    expect(screen.getByText('¡Gracias por su preferencia!')).toBeInTheDocument()
  })

  it('devuelve null si no se proporciona ventaId ni ordenId', () => {
    const { container } = renderWithStore(<InvoiceTemplate />)
    expect(container.firstChild).toBeNull()
  })
})
