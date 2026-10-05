import { test, expect, loginByRole, navigateTo } from './helpers'

test.describe('Permisos por rol — visibilidad del sidebar', () => {
  test('Super Admin ve todas las secciones', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Talleres' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Usuarios' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Productos (Venta)' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Piezas (Reparación)' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Punto de Venta' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Órdenes de Servicio' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Movimientos / Caja' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Garantías' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Clientes' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Comisiones y Pagos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Configuración' })).toBeVisible()
  })

  test('Vendedor NO ve Talleres, Usuarios, Piezas, Órdenes, Pedidos, Comisiones ni Configuración', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await expect(page.getByRole('button', { name: 'Talleres' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Usuarios' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Piezas (Reparación)' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Órdenes de Servicio' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Pedidos Internos' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Comisiones y Pagos' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Configuración' })).not.toBeVisible()
    // Pero SÍ ve POS, Productos, Mis Comisiones
    await expect(page.getByRole('button', { name: 'Punto de Venta' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Productos (Venta)' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mis Comisiones' })).toBeVisible()
  })

  test('Informático NO ve Talleres, Usuarios, POS, Productos ni Comisiones', async ({ page }) => {
    await loginByRole(page, 'INFORMATICO')
    await expect(page.getByRole('button', { name: 'Talleres' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Usuarios' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Punto de Venta' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Productos (Venta)' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Comisiones y Pagos' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Configuración' })).not.toBeVisible()
    // Pero SÍ ve Piezas, Órdenes, Mis Comisiones
    await expect(page.getByRole('button', { name: 'Piezas (Reparación)' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Órdenes de Servicio' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mis Comisiones' })).toBeVisible()
  })

  test('Electrónico tiene los mismos accesos que Informático', async ({ page }) => {
    await loginByRole(page, 'ELECTRONICO')
    await expect(page.getByRole('button', { name: 'Piezas (Reparación)' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Órdenes de Servicio' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mis Comisiones' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Punto de Venta' })).not.toBeVisible()
  })

  test('Admin ve gestión pero no Mis Comisiones (no es operario)', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await expect(page.getByRole('button', { name: 'Talleres' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Usuarios' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Comisiones y Pagos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Configuración' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mis Comisiones' })).not.toBeVisible()
  })
})

test.describe('Permisos — acceso a módulos', () => {
  test('Vendedor puede acceder al POS', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Punto de Venta')
    // Hay dos headings (topbar h2 + page header h1), usamos el h1 exacto
    await expect(page.getByRole('heading', { name: 'Punto de Venta', exact: true })).toBeVisible({ timeout: 5000 })
  })

  test('Vendedor NO puede acceder a Órdenes de Servicio', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    // El botón no existe en el sidebar, así que no debería poder navegar
    const ordenesBtn = page.getByRole('button', { name: 'Órdenes de Servicio' })
    await expect(ordenesBtn).not.toBeVisible()
  })

  test('Informático puede acceder a Órdenes de Servicio', async ({ page }) => {
    await loginByRole(page, 'INFORMATICO')
    await navigateTo(page, 'Órdenes de Servicio')
    await expect(page.getByRole('heading', { name: 'Órdenes de Servicio', exact: true }).first()).toBeVisible({ timeout: 5000 })
  })

  test('Informático NO puede acceder al POS', async ({ page }) => {
    await loginByRole(page, 'INFORMATICO')
    const posBtn = page.getByRole('button', { name: 'Punto de Venta' })
    await expect(posBtn).not.toBeVisible()
  })

  test('Solo Admin/SuperAdmin ven la sección de Comisiones y Pagos', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Comisiones y Pagos')
    await expect(page.getByRole('heading', { name: /Comisiones y Pagos a Operarios/ }).first()).toBeVisible({ timeout: 5000 })
  })

  test('Operarios ven Mis Comisiones pero no Comisiones y Pagos', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await navigateTo(page, 'Mis Comisiones')
    await expect(page.getByRole('heading', { name: 'Mis Comisiones', exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Comisiones y Pagos' })).not.toBeVisible()
  })
})
