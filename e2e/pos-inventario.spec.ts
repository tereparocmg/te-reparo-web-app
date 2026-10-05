import { test, expect, loginByRole, navigateTo } from './helpers'

test.describe('Flujo completo de venta en POS', () => {
  test('vender un producto al cliente general genera factura', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')

    // Agregar Funda iPhone 13
    await page.getByRole('button', { name: /Funda iPhone 13/ }).click()

    // Verificar que aparece en el carrito
    await expect(page.getByText('Funda iPhone 13').first()).toBeVisible({ timeout: 5000 })

    // Cobrar
    await page.getByRole('button', { name: /Cobrar/ }).click()

    // Esperar el dialog de venta completada
    await expect(page.getByText('Venta Completada').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('TICKET DE VENTA').first()).toBeVisible()
  })

  test('limpiar carrito vacía los items', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')

    await page.getByRole('button', { name: /Funda iPhone 13/ }).click()
    await expect(page.getByText('Funda iPhone 13').first()).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Limpiar' }).click()
    await expect(page.getByText('Agrega productos al carrito')).toBeVisible({ timeout: 5000 })
  })

  test('el carrito muestra el total de la venta', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')

    await page.getByRole('button', { name: /Funda iPhone 13/ }).click()
    // El total debe ser $249.00
    await expect(page.getByText(/\$249\.00/).first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Comisión generada automáticamente al vender', () => {
  test('vender producto con comisión genera entrada en Mis Comisiones', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')

    await page.getByRole('button', { name: /Funda iPhone 13/ }).click()
    await page.getByRole('button', { name: /Cobrar/ }).click()

    await expect(page.getByText('Venta Completada').first()).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    await navigateTo(page, 'Mis Comisiones')
    await expect(page.getByText(/\$15\.00/).first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Inventario de productos', () => {
  test('muestra la columna de comisión en la tabla', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')

    await expect(page.getByRole('columnheader', { name: 'Comisión' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('1.5%').first()).toBeVisible()
  })

  test('muestra productos semilla', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')
    await expect(page.getByText('iPhone 13 128GB').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Samsung Galaxy A54').first()).toBeVisible()
  })

  test('muestra el botón de nuevo producto', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')
    await expect(page.getByRole('button', { name: /Nuevo Producto/ })).toBeVisible({ timeout: 5000 })
  })

  test('abre el formulario de nuevo producto', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')
    await page.getByRole('button', { name: /Nuevo Producto/ }).click()
    // El dialog tiene un heading "Nuevo Producto"
    await expect(page.getByRole('heading', { name: 'Nuevo Producto' })).toBeVisible({ timeout: 5000 })
  })
})
