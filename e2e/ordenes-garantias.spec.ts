import { test, expect, loginByRole, navigateTo } from './helpers'

test.describe('Órdenes de servicio', () => {
  test('muestra el listado de órdenes', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Órdenes de Servicio')
    // Debe mostrar al menos una orden semilla
    await expect(page.getByText('OS-001X1').first()).toBeVisible({ timeout: 5000 })
  })

  test('muestra el botón de nueva orden', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Órdenes de Servicio')
    await expect(page.getByRole('button', { name: /Nueva Orden/ })).toBeVisible({ timeout: 5000 })
  })

  test('filtrar órdenes por estado Entregado', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Órdenes de Servicio')

    await page.getByRole('button', { name: 'Entregado' }).click()
    // Debe mostrar al menos la orden semilla entregada (OS-002Y2)
    await expect(page.getByText('OS-002Y2').first()).toBeVisible({ timeout: 5000 })
  })

  test('abre el formulario de nueva orden', async ({ page }) => {
    await loginByRole(page, 'ELECTRONICO')
    await navigateTo(page, 'Órdenes de Servicio')
    await page.getByRole('button', { name: /Nueva Orden/ }).click()
    await expect(page.getByRole('heading', { name: /Nueva Orden de Servicio/ })).toBeVisible({ timeout: 5000 })
  })

  test('ver detalle de una orden muestra factura', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Órdenes de Servicio')

    // Click en el primer botón de ver (ícono Eye)
    await page.locator('button:has(svg.lucide-eye)').first().click()
    // Debe mostrar la factura o el detalle
    await expect(page.getByText(/FACTURA DE SERVICIO|Orden OS-/).first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Garantías', () => {
  test('muestra el listado de garantías', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Garantías')
    await expect(page.getByRole('heading', { name: 'Garantías', exact: true }).first()).toBeVisible({ timeout: 5000 })
    // Debe mostrar los encabezados de la tabla
    await expect(page.getByText('Folio').first()).toBeVisible()
  })

  test('filtrar garantías por estado Activas', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Garantías')
    await page.getByRole('button', { name: 'Activas' }).click()
  })

  test('ver certificado de garantía', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Garantías')
    // Click en el primer botón de ver (Eye)
    await page.locator('button:has(svg.lucide-eye)').first().click()
    await expect(page.getByText('CERTIFICADO DE GARANTÍA').first()).toBeVisible({ timeout: 5000 })
  })

  test('muestra los botones de filtro', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Garantías')
    await expect(page.getByRole('button', { name: 'Todas' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Activas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Vencidas' })).toBeVisible()
  })
})
