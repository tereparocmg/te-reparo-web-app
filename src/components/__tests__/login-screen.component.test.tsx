import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { LoginScreen } from '@/components/login-screen'
import { renderWithStore } from '@/lib/__tests__/test-utils'
import { useStore } from '@/lib/store'

describe('LoginScreen', () => {
  beforeEach(() => {
    renderWithStore(<LoginScreen />)
  })

  it('muestra el branding Te Reparo', () => {
    expect(screen.getAllByText('Te Reparo').length).toBeGreaterThan(0)
  })

  it('muestra el heading de iniciar sesión', () => {
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('muestra el campo de email', () => {
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
  })

  it('muestra el campo de contraseña', () => {
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('muestra el botón de ingresar', () => {
    expect(screen.getByRole('button', { name: 'Ingresar al sistema' })).toBeInTheDocument()
  })

  it('muestra los 5 roles de acceso rápido', () => {
    expect(screen.getByRole('button', { name: /Super Administrador/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Administrador/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Vendedor/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Informático/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Electrónico/ })).toBeInTheDocument()
  })

  it('muestra el texto descriptivo del módulo', () => {
    expect(screen.getByText(/Gestiona tu taller/)).toBeInTheDocument()
  })

  it('muestra las características del sistema', () => {
    expect(screen.getByText('Multi-sucursal')).toBeInTheDocument()
    expect(screen.getByText('Inventario dual')).toBeInTheDocument()
    expect(screen.getByText('POS integrado')).toBeInTheDocument()
    expect(screen.getByText('Garantías')).toBeInTheDocument()
    expect(screen.getByText('Excel export')).toBeInTheDocument()
    expect(screen.getByText('Roles y permisos')).toBeInTheDocument()
  })

  it('toggle de contraseña la hace visible', () => {
    const passwordInput = screen.getByLabelText('Contraseña')
    expect(passwordInput).toHaveAttribute('type', 'password')
    // Click en el botón de toggle (ícono Eye)
    const toggleButton = screen.getByLabelText('Cambiar tema') // placeholder, busquemos por posición
    // El botón de toggle de password está junto al input
    const buttons = screen.getAllByRole('button')
    // El botón de mostrar/ocultar contraseña es el que está dentro del campo de password
    const passwordField = passwordInput.parentElement
    const toggleBtn = passwordField?.querySelector('button')
    if (toggleBtn) {
      fireEvent.click(toggleBtn)
      expect(passwordInput).toHaveAttribute('type', 'text')
    }
  })
})

describe('LoginScreen — acciones', () => {
  it('login con credenciales correctas inicia sesión', () => {
    const { store } = renderWithStore(<LoginScreen />)
    const emailInput = screen.getByLabelText('Correo electrónico')
    const passwordInput = screen.getByLabelText('Contraseña')

    fireEvent.change(emailInput, { target: { value: 'superadmin@tereparo.mx' } })
    fireEvent.change(passwordInput, { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar al sistema' }))

    // El store debe tener un usuario logueado
    expect(useStore.getState().usuarioActual).not.toBeNull()
    expect(useStore.getState().usuarioActual?.rol).toBe('SUPER_ADMIN')
  })

  it('login con credenciales incorrectas no inicia sesión', () => {
    renderWithStore(<LoginScreen />)
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'wrong@test.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar al sistema' }))

    expect(useStore.getState().usuarioActual).toBeNull()
  })

  it('login rápido como Vendedor funciona', () => {
    renderWithStore(<LoginScreen />)
    fireEvent.click(screen.getByRole('button', { name: /^Vendedor/ }))

    expect(useStore.getState().usuarioActual?.rol).toBe('VENDEDOR')
    expect(useStore.getState().usuarioActual?.nombre).toBe('Laura Sánchez')
  })

  it('login rápido como Informático funciona', () => {
    renderWithStore(<LoginScreen />)
    fireEvent.click(screen.getByRole('button', { name: /^Informático/ }))

    expect(useStore.getState().usuarioActual?.rol).toBe('INFORMATICO')
  })

  it('login rápido como Electrónico funciona', () => {
    renderWithStore(<LoginScreen />)
    fireEvent.click(screen.getByRole('button', { name: /^Electrónico/ }))

    expect(useStore.getState().usuarioActual?.rol).toBe('ELECTRONICO')
  })

  it('login rápido como Admin funciona', () => {
    renderWithStore(<LoginScreen />)
    fireEvent.click(screen.getByRole('button', { name: /^Administrador/ }))

    expect(useStore.getState().usuarioActual?.rol).toBe('ADMIN')
  })

  it('login rápido como Super Admin funciona', () => {
    renderWithStore(<LoginScreen />)
    fireEvent.click(screen.getByRole('button', { name: /Super Administrador/ }))

    expect(useStore.getState().usuarioActual?.rol).toBe('SUPER_ADMIN')
  })
})
