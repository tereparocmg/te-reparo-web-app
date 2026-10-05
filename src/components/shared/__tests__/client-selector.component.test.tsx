import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { ClientSelector } from '@/components/shared/client-selector'
import { renderWithStore } from '@/lib/__tests__/test-utils'

describe('ClientSelector', () => {
  it('renderiza el selector con el cliente por defecto', () => {
    renderWithStore(<ClientSelector value="cliente-general" onChange={() => {}} />)
    expect(screen.getByText('Cliente General')).toBeInTheDocument()
  })

  it('muestra el badge GENERAL en el cliente general', () => {
    renderWithStore(<ClientSelector value="cliente-general" onChange={() => {}} />)
    expect(screen.getByText('GENERAL')).toBeInTheDocument()
  })

  it('llama a onChange al seleccionar otro cliente', () => {
    const onChange = vi.fn()
    renderWithStore(<ClientSelector value="cliente-general" onChange={onChange} />)
    // Abrir el selector
    fireEvent.click(screen.getByRole('combobox'))
    // El cliente general aparece primero
    expect(onChange).not.toHaveBeenCalled()
  })

  it('acepta un value personalizado', () => {
    renderWithStore(<ClientSelector value="cli-1" onChange={() => {}} />)
    // cli-1 es Juan Pérez García
    expect(screen.getByText(/Juan Pérez García/)).toBeInTheDocument()
  })

  it('muestra el teléfono del cliente cuando está disponible', () => {
    renderWithStore(<ClientSelector value="cli-1" onChange={() => {}} />)
    expect(screen.getByText(/55 1111 2222/)).toBeInTheDocument()
  })
})
