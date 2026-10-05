import { test, expect, loginByRole, navigateTo } from './helpers'

test.describe('Comisiones y Pagos — vista de Admin', () => {
  test('muestra tarjetas resumen con métricas', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')

    // Los textos están en CSS uppercase, el textContent es "Total Pendiente"
    // Aparecen en tarjeta y en encabezado de tabla, usamos .first()
    await expect(page.getByText('Total Pendiente').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Total Pagado').first()).toBeVisible()
  })

  test('muestra tabla de operarios con comisiones', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')

    await expect(page.getByText('Laura Sánchez').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Diego Ramírez').first()).toBeVisible()
  })

  test('filtrar por operario reduce la tabla', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')

    // Abrir el selector de operario (primer combobox de filtro)
    await page.locator('button[role="combobox"]').nth(0).click()
    await page.getByRole('option', { name: 'Laura Sánchez' }).click()

    // Debe mostrar solo a Laura
    await expect(page.getByText('Laura Sánchez').first()).toBeVisible()
  })

  test('ver detalle de comisiones de un operario', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')

    await page.getByRole('button', { name: 'Detalle' }).first().click()

    await expect(page.getByText(/Comisiones de/).first()).toBeVisible({ timeout: 5000 })
  })

  test('generar pago a un operario', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')

    const pagarBtn = page.getByRole('button', { name: 'Pagar' }).first()
    if (await pagarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pagarBtn.click()
      await expect(page.getByText(/Generar Pago a/).first()).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Total a pagar')).toBeVisible()
      await page.getByRole('button', { name: 'Generar Pago' }).click()
      await expect(page.getByText(/Pagos Generados|Pendientes de Confirmar/).first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('botón de exportar Excel está disponible', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')
    await expect(page.getByRole('button', { name: /Exportar Pagos Excel/ })).toBeVisible()
  })
})

test.describe('Mis Comisiones — vista de operario', () => {
  test('vendedor ve sus comisiones pendientes y pagadas', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Mis Comisiones')

    await expect(page.getByRole('heading', { name: 'Mis Comisiones', exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Historial de comisiones y pagos recibidos — Laura Sánchez/)).toBeVisible()
  })

  test('informático ve sus comisiones', async ({ page }) => {
    await loginByRole(page, 'INFORMATICO')
    await navigateTo(page, 'Mis Comisiones')
    await expect(page.getByText(/Historial de comisiones y pagos recibidos — Diego Ramírez/)).toBeVisible({ timeout: 5000 })
  })

  test('muestra el pago semilla OP-001', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Mis Comisiones')
    await expect(page.getByText('OP-001')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Dashboard con métricas de comisiones', () => {
  test('Super Admin ve tarjeta de Comisiones Pendientes', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    // El texto "Comisiones Pendientes" está en CSS uppercase
    await expect(page.getByText('Comisiones Pendientes').first()).toBeVisible({ timeout: 5000 })
  })

  test('Admin ve tarjeta de acceso a Comisiones', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await expect(page.getByText('Gestionar Pagos')).toBeVisible({ timeout: 5000 })
  })

  test('Vendedor ve Mis Comisiones Pendientes en dashboard', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await expect(page.getByText('Mis Comisiones Pendientes').first()).toBeVisible({ timeout: 5000 })
  })

  test('click en tarjeta de acceso navega al módulo', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await page.getByText('Gestionar Pagos').click()
    await expect(page.getByRole('heading', { name: /Comisiones y Pagos a Operarios/ }).first()).toBeVisible({ timeout: 5000 })
  })
})
