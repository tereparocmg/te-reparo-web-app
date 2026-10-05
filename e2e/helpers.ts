import { test as base, expect, type Page } from '@playwright/test'

/**
 * Helper para limpiar localStorage antes de cada test E2E.
 * Garantiza que el store persistente de Zustand arranque desde los datos semilla.
 */
export async function resetApp(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
  // Esperar a que el branding esté visible (indicador de que la app cargó)
  await page.getByText('Iniciar sesión').waitFor({ state: 'visible', timeout: 15000 })
}

/**
 * Login rápido por rol usando los botones de acceso rápido del login.
 */
export async function loginByRole(page: Page, rol: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | 'INFORMATICO' | 'ELECTRONICO') {
  await resetApp(page)
  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Super Administrador',
    ADMIN: 'Administrador',
    VENDEDOR: 'Vendedor',
    INFORMATICO: 'Informático',
    ELECTRONICO: 'Electrónico',
  }
  // Para ADMIN, usar un regex que no coincida con "Super Administrador"
  const pattern = rol === 'ADMIN' ? /^Administrador/ : new RegExp(labels[rol])
  await page.getByRole('button', { name: pattern }).click()
  await page.waitForLoadState('networkidle')
  // Esperar a que aparezca el sidebar (indicador de sesión iniciada)
  await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 10000 })
}

/**
 * Navega a una vista del sidebar por su etiqueta.
 */
export async function navigateTo(page: Page, label: string) {
  // Usar getByText en lugar de getByRole porque los botones del sidebar
  // tienen badges numéricos que cambian el accessible name
  await page.getByText(label, { exact: false }).first().click()
  await page.waitForLoadState('networkidle')
}

// Re-export base test y expect para uso en specs
export const test = base
export { expect }
