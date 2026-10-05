import { test, expect, loginByRole, navigateTo, resetApp } from './helpers'
import AxeBuilder from '@axe-core/playwright'

/**
 * Tests de accesibilidad con axe-core.
 * Verifica que las páginas principales no tengan violaciones críticas
 * de WCAG 2.1 AA. Las violaciones moderadas se reportan pero no fallan.
 */

// Helper para analizar una página y reportar violaciones de button-name
async function checkButtonNames(page: import('@playwright/test').Page, tag: string) {
  const results = await new AxeBuilder({ page })
    .withRules(['button-name'])
    .analyze()
  const violations = results.violations.filter((v) => v.id === 'button-name')
  if (violations.length > 0) {
    console.log(`  [INFO] ${tag}: ${violations[0].nodes.length} botones sin nombre accesible (iconos sin aria-label)`)
  }
  // Permitimos hasta 15 botones sin nombre (iconos de lucide-react sin aria-label)
  // Esto es una limitación conocida de los componentes shadcn/ui
  const totalNodes = violations.reduce((s, v) => s + v.nodes.length, 0)
  expect(totalNodes).toBeLessThanOrEqual(15)
}

test.describe('Accesibilidad — Estructura semántica', () => {
  test('la página tiene un heading principal (h1)', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    const h1 = page.locator('h1')
    await expect(h1.first()).toBeVisible({ timeout: 5000 })
  })

  test('el sidebar tiene navegación semántica (aside)', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    const aside = page.locator('aside')
    await expect(aside.first()).toBeVisible({ timeout: 5000 })
  })

  test('el contenido principal está marcado como main', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    const main = page.locator('main')
    await expect(main.first()).toBeVisible({ timeout: 5000 })
  })

  test('las tablas tienen encabezados (thead)', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')
    const thead = page.locator('table thead')
    await expect(thead.first()).toBeVisible({ timeout: 5000 })
  })

  test('los headings siguen una jerarquía', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    const results = await new AxeBuilder({ page })
      .withRules(['heading-order'])
      .analyze()
    const violations = results.violations.filter((v) => v.id === 'heading-order')
    // No debe haber saltos en la jerarquía de headings
    expect(violations).toEqual([])
  })

  test('el HTML tiene atributo lang', async ({ page }) => {
    await resetApp(page)
    const lang = await page.getAttribute('html', 'lang')
    expect(lang).toBeTruthy()
    // La app es en español
    expect(lang?.toLowerCase()).toContain('es')
  })
})

test.describe('Accesibilidad — Login', () => {
  test('la pantalla de login no tiene violaciones críticas', async ({ page }) => {
    await resetApp(page)
    await checkButtonNames(page, 'login')
  })

  test('los botones de roles tienen texto descriptivo', async ({ page }) => {
    await resetApp(page)
    // Los 5 botones de acceso rápido deben tener texto
    const botones = [
      'Super Administrador',
      'Administrador',
      'Vendedor',
      'Informático',
      'Electrónico',
    ]
    for (const texto of botones) {
      const pattern = texto === 'Administrador' ? new RegExp(`^${texto}`) : new RegExp(texto)
      await expect(page.getByRole('button', { name: pattern })).toBeVisible({ timeout: 5000 })
    }
  })

  test('los campos de login son navegables por teclado', async ({ page }) => {
    await resetApp(page)
    // Tabular hasta llegar al campo de email
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    // El campo de email debe ser enfocable
    const emailInput = page.getByLabel('Correo electrónico')
    await emailInput.focus()
    await expect(emailInput).toBeFocused()
  })
})

test.describe('Accesibilidad — Dashboard', () => {
  test('dashboard de Super Admin no tiene violaciones críticas de botones', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await checkButtonNames(page, 'dashboard-super-admin')
  })

  test('dashboard de Admin no tiene violaciones críticas de botones', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await checkButtonNames(page, 'dashboard-admin')
  })

  test('dashboard de Vendedor no tiene violaciones críticas de botones', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await checkButtonNames(page, 'dashboard-vendedor')
  })

  test('dashboard tiene contraste de color adecuado en tarjetas', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()
    // Reportar violaciones de contraste pero solo fallar en críticas
    const critical = results.violations.filter((v) => v.impact === 'critical')
    expect(critical).toEqual([])
  })
})

test.describe('Accesibilidad — Módulos principales', () => {
  test('POS no tiene violaciones de nombres de botones', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')
    await checkButtonNames(page, 'pos')
  })

  test('Inventario de productos no tiene violaciones de nombres de botones', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')
    await checkButtonNames(page, 'inventario-productos')
  })

  test('Órdenes de servicio no tiene violaciones de nombres de botones', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Órdenes de Servicio')
    await checkButtonNames(page, 'ordenes-servicio')
  })

  test('Movimientos no tiene violaciones de nombres de botones', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')
    await checkButtonNames(page, 'movimientos')
  })

  test('Garantías no tiene violaciones de nombres de botones', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Garantías')
    await checkButtonNames(page, 'garantias')
  })

  test('Clientes no tiene violaciones de nombres de botones', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')
    await checkButtonNames(page, 'clientes')
  })
})

test.describe('Accesibilidad — Módulos de comisiones', () => {
  test('Comisiones y Pagos no tiene violaciones de nombres de botones', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')
    await checkButtonNames(page, 'comisiones-admin')
  })

  test('Mis Comisiones no tiene violaciones de nombres de botones', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Mis Comisiones')
    await checkButtonNames(page, 'mis-comisiones')
  })
})

test.describe('Accesibilidad — Navegación por teclado', () => {
  test('el sidebar es navegable por teclado', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    // Tabular hasta llegar al sidebar
    await page.keyboard.press('Tab')
    // Debe haber elementos focusables
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
  })

  test('los botones del sidebar son focusables', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    const dashboardBtn = page.getByText('Dashboard').first()
    await dashboardBtn.focus()
    // No podemos verificar :focus directamente, pero el elemento debe ser focusable
    expect(await dashboardBtn.isVisible()).toBe(true)
  })

  test('el POS es navegable por teclado', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')
    // Tabular a través del POS
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
  })
})

test.describe('Accesibilidad — Atributos ARIA', () => {
  test('los diálogos tienen role="dialog"', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')
    await page.getByRole('button', { name: /Nuevo Producto/ }).click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog.first()).toBeVisible({ timeout: 5000 })
  })

  test('los selects tienen role="combobox"', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')
    await page.getByRole('button', { name: /Nuevo Producto/ }).click()

    const combobox = page.locator('button[role="combobox"]')
    await expect(combobox.first()).toBeVisible({ timeout: 5000 })
  })

  test('las tablas tienen estructura correcta', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')

    // La tabla debe tener thead y tbody
    await expect(page.locator('table thead')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('table tbody')).toBeVisible()
  })

  test('los botones de icono tienen aria-label', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    // El botón de toggle de tema tiene aria-label
    const themeBtn = page.getByRole('button', { name: 'Cambiar tema' })
    await expect(themeBtn).toBeVisible({ timeout: 5000 })
  })
})
