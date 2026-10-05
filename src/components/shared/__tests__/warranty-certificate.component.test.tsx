import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { WarrantyCertificate } from '@/components/shared/warranty-certificate'
import { renderWithStore } from '@/lib/__tests__/test-utils'

describe('WarrantyCertificate', () => {
  it('renderiza el título del certificado', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText('CERTIFICADO DE GARANTÍA')).toBeInTheDocument()
  })

  it('muestra el folio de la garantía', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText('G-001P1')).toBeInTheDocument()
  })

  it('muestra el nombre del taller emisor', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText('Te Reparo Centro')).toBeInTheDocument()
  })

  it('muestra los datos del cliente', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    // gar-1 es para cli-2 (Ana Martínez López)
    expect(screen.getByText('Ana Martínez López')).toBeInTheDocument()
  })

  it('muestra el tipo de garantía (SERVICIO)', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText('Servicio de Reparación')).toBeInTheDocument()
  })

  it('muestra la duración en días', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('días')).toBeInTheDocument()
  })

  it('muestra la sección de cobertura', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText('Cobertura')).toBeInTheDocument()
  })

  it('muestra las condiciones', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText('Condiciones:')).toBeInTheDocument()
  })

  it('muestra las firmas (Cliente y Representante)', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    // Hay múltiples "Cliente" (datos del cliente + firma), usamos getAllByText
    expect(screen.getAllByText('Cliente').length).toBeGreaterThan(0)
    expect(screen.getByText('Representante del Taller')).toBeInTheDocument()
  })

  it('muestra el dispositivo si la garantía es de servicio', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText('Dispositivo')).toBeInTheDocument()
    expect(screen.getAllByText(/Samsung.*Galaxy A54/).length).toBeGreaterThan(0)
  })

  it('muestra el IMEI si está disponible', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText(/353987654321098/)).toBeInTheDocument()
  })

  it('muestra el problema atendido', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText(/Olvido de cuenta Google/)).toBeInTheDocument()
  })

  it('renderiza la garantía de producto', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-2" />)
    expect(screen.getByText('Producto Vendido')).toBeInTheDocument()
  })

  it('muestra los productos en la garantía de venta', () => {
    renderWithStore(<WarrantyCertificate garantiaId="gar-2" />)
    expect(screen.getByText('Producto(s)')).toBeInTheDocument()
    expect(screen.getAllByText(/iPhone 13/).length).toBeGreaterThan(0)
  })

  it('devuelve null si la garantía no existe', () => {
    const { container } = renderWithStore(<WarrantyCertificate garantiaId="no-existe" />)
    expect(container.firstChild).toBeNull()
  })

  it('muestra la fecha de inicio y vencimiento', () => {
    const { container } = renderWithStore(<WarrantyCertificate garantiaId="gar-1" />)
    expect(screen.getByText('Fecha de Inicio')).toBeInTheDocument()
    expect(screen.getByText('Vencimiento')).toBeInTheDocument()
    expect(screen.getByText('Duración')).toBeInTheDocument()
  })
})
