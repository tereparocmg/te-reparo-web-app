import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { ProductSelector } from '@/components/shared/product-selector'
import { renderWithStore } from '@/lib/__tests__/test-utils'

describe('ProductSelector', () => {
  it('renderiza con el placeholder por defecto', () => {
    renderWithStore(<ProductSelector tallerId="taller-1" onAdd={() => {}} />)
    expect(screen.getByText(/Buscar producto por nombre/)).toBeInTheDocument()
  })

  it('muestra el ícono de paquete', () => {
    const { container } = renderWithStore(
      <ProductSelector tallerId="taller-1" onAdd={() => {}} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renderiza el botón combobox', () => {
    renderWithStore(<ProductSelector tallerId="taller-1" onAdd={() => {}} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renderiza sin errores para un taller válido', () => {
    const { container } = renderWithStore(
      <ProductSelector tallerId="taller-1" onAdd={() => {}} />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renderiza sin errores para taller-2', () => {
    const { container } = renderWithStore(
      <ProductSelector tallerId="taller-2" onAdd={() => {}} />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('acepta una función onAdd', () => {
    const onAdd = vi.fn()
    renderWithStore(<ProductSelector tallerId="taller-1" onAdd={onAdd} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
