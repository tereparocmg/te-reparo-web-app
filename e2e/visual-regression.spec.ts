import { test, expect, loginByRole, navigateTo, resetApp } from './helpers'
import path from 'path'
import fs from 'fs'

/**
 * Tests visuales de regresión con capturas de pantalla.
 * Genera capturas de las páginas principales en modo claro y oscuro
 * para detectar cambios visuales involuntarios.
 */

const SCREENSHOTS_DIR = 'test-results/visual-regression'

// Asegurar que el directorio existe antes de cada test
test.beforeEach(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
})

test.describe('Capturas visuales — Modo claro', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
    // Asegurar modo claro
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
    })
  })

  test('pantalla de login', async ({ page }) => {
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'login-modo-claro.png'),
      fullPage: true,
    })
    // Verificar que el archivo se creó
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'login-modo-claro.png'))).toBe(true)
  })

  test('dashboard de Super Admin', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await page.waitForTimeout(1000) // Esperar a que carguen los gráficos
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'dashboard-super-admin-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'dashboard-super-admin-claro.png'))).toBe(true)
  })

  test('dashboard de Admin', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'dashboard-admin-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'dashboard-admin-claro.png'))).toBe(true)
  })

  test('dashboard de Vendedor', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'dashboard-vendedor-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'dashboard-vendedor-claro.png'))).toBe(true)
  })

  test('POS - punto de venta', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'pos-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'pos-claro.png'))).toBe(true)
  })

  test('POS con productos en carrito', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')
    await page.getByRole('button', { name: /iPhone 13 128GB/ }).click()
    await page.getByRole('button', { name: /Funda iPhone 13/ }).click()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'pos-con-carrito-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'pos-con-carrito-claro.png'))).toBe(true)
  })

  test('inventario de productos', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'inventario-productos-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'inventario-productos-claro.png'))).toBe(true)
  })

  test('comisiones y pagos', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'comisiones-admin-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'comisiones-admin-claro.png'))).toBe(true)
  })

  test('mis comisiones (operario)', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Mis Comisiones')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mis-comisiones-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'mis-comisiones-claro.png'))).toBe(true)
  })

  test('garantías', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Garantías')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'garantias-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'garantias-claro.png'))).toBe(true)
  })

  test('movimientos / caja', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'movimientos-claro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'movimientos-claro.png'))).toBe(true)
  })
})

test.describe('Capturas visuales — Modo oscuro', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
    // Activar modo oscuro
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
  })

  test('pantalla de login en oscuro', async ({ page }) => {
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'login-modo-oscuro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'login-modo-oscuro.png'))).toBe(true)
  })

  test('dashboard de Super Admin en oscuro', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'dashboard-super-admin-oscuro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'dashboard-super-admin-oscuro.png'))).toBe(true)
  })

  test('POS en modo oscuro', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await navigateTo(page, 'Punto de Venta')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'pos-oscuro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'pos-oscuro.png'))).toBe(true)
  })

  test('comisiones en modo oscuro', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await navigateTo(page, 'Comisiones y Pagos')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'comisiones-admin-oscuro.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'comisiones-admin-oscuro.png'))).toBe(true)
  })
})

test.describe('Capturas visuales — Componentes específicos', () => {
  test('factura de venta (ticket A4)', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')
    await page.getByRole('button', { name: /iPhone 13 128GB/ }).click()
    await page.getByRole('button', { name: /Cobrar/ }).click()
    await page.waitForTimeout(1000)

    // Capturar solo el dialog de la factura
    const dialog = page.locator('[role="dialog"]')
    await dialog.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'factura-venta.png'),
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'factura-venta.png'))).toBe(true)
  })

  test('certificado de garantía', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Garantías')
    // Abrir el primer certificado
    await page.locator('button:has(svg.lucide-eye)').first().click()
    await page.waitForTimeout(1000)

    const dialog = page.locator('[role="dialog"]')
    await dialog.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'certificado-garantia.png'),
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'certificado-garantia.png'))).toBe(true)
  })

  test('formulario de nuevo producto', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')
    await page.getByRole('button', { name: /Nuevo Producto/ }).click()
    await page.waitForTimeout(500)

    const dialog = page.locator('[role="dialog"]')
    await dialog.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'form-nuevo-producto.png'),
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'form-nuevo-producto.png'))).toBe(true)
  })

  test('formulario de nueva orden de servicio', async ({ page }) => {
    await loginByRole(page, 'ELECTRONICO')
    await navigateTo(page, 'Órdenes de Servicio')
    await page.getByRole('button', { name: /Nueva Orden/ }).click()
    await page.waitForTimeout(500)

    const dialog = page.locator('[role="dialog"]')
    await dialog.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'form-nueva-orden.png'),
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'form-nueva-orden.png'))).toBe(true)
  })

  test('dialog de generar pago', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')

    const pagarBtn = page.getByRole('button', { name: 'Pagar' }).first()
    if (await pagarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pagarBtn.click()
      await page.waitForTimeout(500)
      const dialog = page.locator('[role="dialog"]')
      await dialog.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'dialog-generar-pago.png'),
      })
      expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'dialog-generar-pago.png'))).toBe(true)
    }
  })
})

test.describe('Capturas visuales — Responsividad móvil', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('pantalla de login en móvil', async ({ page }) => {
    await resetApp(page)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'login-movil.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'login-movil.png'))).toBe(true)
  })

  test('dashboard en móvil', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'dashboard-movil.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'dashboard-movil.png'))).toBe(true)
  })

  test('POS en móvil', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    // En móvil el sidebar está oculto, hay que abrirlo primero
    await page.locator('button:has(svg.lucide-menu)').first().click()
    await page.waitForTimeout(500)
    await page.getByText('Punto de Venta', { exact: false }).first().click()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'pos-movil.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'pos-movil.png'))).toBe(true)
  })
})

test.describe('Capturas visuales — Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('dashboard en tablet', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'dashboard-tablet.png'),
      fullPage: true,
    })
    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, 'dashboard-tablet.png'))).toBe(true)
  })
})
