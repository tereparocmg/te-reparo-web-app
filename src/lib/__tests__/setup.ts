/**
 * Setup de Vitest — se ejecuta antes de cada archivo de tests.
 * Garantiza que localStorage esté limpio entre tests para que el store
 * persistente de Zustand no arrastre estado de un test a otro.
 */
import { beforeEach } from 'vitest'

beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
})
