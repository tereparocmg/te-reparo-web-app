import { useStore } from '../store'
import { initialState } from '../store'

/**
 * Resetea el store a su estado inicial para cada test.
 * Importante: las acciones del store se conservan, solo se reinician los datos.
 */
export function resetStore() {
  useStore.setState({
    ...initialState,
    usuarioActual: null,
    tallerActualId: null,
    vistaActual: 'dashboard',
  })
}

/**
 * Login rápido para tests: fuerza la sesión de un usuario por rol.
 */
export function loginAsRol(rol: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | 'INFORMATICO' | 'ELECTRONICO') {
  useStore.getState().loginAs(rol)
  return useStore.getState().usuarioActual
}

/**
 * Obtiene el estado actual del store.
 */
export function getState() {
  return useStore.getState()
}
