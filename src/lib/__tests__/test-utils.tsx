import { render, type RenderOptions } from '@testing-library/react'
import { type ReactElement } from 'react'
import { useStore, initialState } from '../store'

/**
 * Resetea el store a su estado inicial antes de renderizar un componente.
 * Útil para tests de componentes que dependen del store global.
 */
export function renderWithStore(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Reset del store
  useStore.setState({
    ...initialState,
    usuarioActual: null,
    tallerActualId: null,
    vistaActual: 'dashboard',
  })
  return render(ui, options)
}

/**
 * Resetea el store y establece un usuario logueado por rol.
 */
export function renderWithRole(
  ui: ReactElement,
  rol: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | 'INFORMATICO' | 'ELECTRONICO',
  options?: Omit<RenderOptions, 'wrapper'>
) {
  useStore.setState({
    ...initialState,
    usuarioActual: null,
    tallerActualId: null,
    vistaActual: 'dashboard',
  })
  useStore.getState().loginAs(rol)
  return render(ui, options)
}

export { render }
