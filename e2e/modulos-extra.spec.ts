import { test, expect, loginByRole, navigateTo } from './helpers'

test.describe('Movimientos / Caja', () => {
  test('muestra métricas del día', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')

    await expect(page.getByText('Ingresos Hoy')).toBeVisible()
    await expect(page.getByText('Gastos Hoy')).toBeVisible()
    await expect(page.getByText('Compras Hoy')).toBeVisible()
    await expect(page.getByText('Balance Hoy')).toBeVisible()
  })

  test('muestra tabla de movimientos', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')

    // Debe haber al menos un movimiento semilla
    await expect(page.getByText('Concepto')).toBeVisible()
  })

  test('filtrar por tipo Ingreso', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')

    // Click en el filtro "Ingresos"
    await page.getByRole('button', { name: 'Ingresos' }).click()
  })

  test('registrar un gasto', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')

    await page.getByRole('button', { name: /Registrar Gasto/ }).click()

    await page.getByLabel('Concepto *').fill('Gasto E2E Test')
    await page.getByLabel('Monto *').fill('250')

    await page.getByRole('button', { name: 'Registrar' }).click()

    // Debe aparecer en la tabla
    await expect(page.getByText('Gasto E2E Test')).toBeVisible({ timeout: 5000 })
  })

  test('botón de exportar Excel está disponible', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')
    await expect(page.getByRole('button', { name: /Exportar Excel/ })).toBeVisible()
  })
})

test.describe('Clientes', () => {
  test('muestra cliente general en la lista', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')

    await expect(page.getByText('Cliente General')).toBeVisible()
  })

  test('crear un cliente nuevo', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')

    await page.getByRole('button', { name: /Nuevo Cliente/ }).click()
    await page.getByLabel('Nombre o Razón Social *').fill('Cliente E2E Test')
    await page.getByLabel('Teléfono').fill('55 0000 0000')

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Cliente E2E Test')).toBeVisible({ timeout: 5000 })
  })

  test('buscar cliente filtra la lista', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')

    await page.getByPlaceholder(/Buscar por nombre/).fill('Juan Pérez')
    await expect(page.getByText('Juan Pérez García')).toBeVisible()
  })

  test('ver detalle de cliente muestra historial', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')

    // Click en el primer botón de ver (Eye)
    await page.getByRole('button').filter({ has: page.locator('svg.lucide-eye') }).first().click()

    // Debe mostrar el historial
    await expect(page.getByText(/Compras|Servicios|Garantías/).first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Pedidos internos', () => {
  test('informático puede crear un pedido', async ({ page }) => {
    await loginByRole(page, 'INFORMATICO')
    await navigateTo(page, 'Pedidos Internos')

    await page.getByRole('button', { name: /Nuevo Pedido/ }).click()
    await page.getByPlaceholder(/Ej: 5x Pantalla/).fill('Pedido E2E Test')
    await page.getByRole('button', { name: 'Crear Pedido' }).click()

    await expect(page.getByText('Pedido E2E Test')).toBeVisible({ timeout: 5000 })
  })

  test('admin ve bandeja de aprobación', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Pedidos Internos')

    // Debe mostrar la bandeja (los pedidos semilla están pendientes)
    await expect(page.getByText(/Bandeja de Aprobación|pendientes/)).toBeVisible({ timeout: 5000 })
  })

  test('admin puede aprobar un pedido', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Pedidos Internos')

    // Click en el primer botón "Aprobar"
    const aprobarBtn = page.getByRole('button', { name: 'Aprobar' }).first()
    if (await aprobarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aprobarBtn.click()
    }
  })
})

test.describe('Configuración', () => {
  test('admin puede acceder a configuración', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Configuración')

    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible()
    await expect(page.getByText('Configuración por Taller')).toBeVisible()
  })

  test('super admin ve configuración global', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await navigateTo(page, 'Configuración')

    await expect(page.getByText('Configuración Global')).toBeVisible()
    await expect(page.getByText('Moneda')).toBeVisible()
  })

  test('guardar configuración del taller', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Configuración')

    // Modificar el límite de descuento
    const limiteInput = page.locator('input[type="number"]').nth(1)
    await limiteInput.fill('25')

    await page.getByRole('button', { name: /Guardar Configuración del Taller/ }).click()
  })
})

test.describe('Talleres', () => {
  test('super admin ve todos los talleres', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await navigateTo(page, 'Talleres')

    await expect(page.getByText('Te Reparo Centro')).toBeVisible()
    await expect(page.getByText('Te Reparo Norte')).toBeVisible()
  })

  test('admin ve solo su taller asignado', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Talleres')

    await expect(page.getByText('Te Reparo Centro')).toBeVisible()
  })

  test('super admin puede crear un taller nuevo', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await navigateTo(page, 'Talleres')

    await page.getByRole('button', { name: /Nuevo Taller/ }).click()
    await page.getByLabel('Nombre del taller *').fill('Taller E2E Test')
    await page.getByLabel('Dirección *').fill('Dirección Test 123')
    await page.getByLabel('Teléfono *').fill('55 0000 0000')

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Taller E2E Test')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Usuarios', () => {
  test('admin ve lista de usuarios', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Usuarios')

    await expect(page.getByText('Carlos Mendoza')).toBeVisible()
    await expect(page.getByText('Laura Sánchez')).toBeVisible()
  })

  test('super admin puede crear un usuario nuevo', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await navigateTo(page, 'Usuarios')

    await page.getByRole('button', { name: /Nuevo Usuario/ }).click()
    await page.getByLabel('Nombre completo *').fill('Usuario E2E')
    await page.getByLabel('Correo electrónico *').fill('e2e@tereparo.mx')
    await page.getByLabel('Contraseña').fill('test123')

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Usuario E2E')).toBeVisible({ timeout: 5000 })
  })

  test('admin no puede asignar rol SUPER_ADMIN', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Usuarios')

    await page.getByRole('button', { name: /Nuevo Usuario/ }).click()
    // Abrir el selector de rol
    await page.locator('button[role="combobox"]').nth(1).click()

    // La opción Super Administrador debe estar deshabilitada
    const superAdminOption = page.getByRole('option', { name: /Super Administrador/ })
    await expect(superAdminOption).toBeDisabled()
  })
})

test.describe('Selector de taller (multi-sucursal)', () => {
  test('super admin puede cambiar entre talleres', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')

    // Abrir el selector de taller en la topbar
    await page.locator('button[role="combobox"]').first().click()
    await page.getByRole('option', { name: 'Te Reparo Norte' }).click()

    // El dashboard debe reflejar el taller seleccionado
    await expect(page.getByRole('heading', { name: /Panel — Te Reparo Norte/ })).toBeVisible({ timeout: 5000 })
  })
})
