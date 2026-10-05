import { test, expect, resetApp, loginByRole } from './helpers'

test.describe('Pantalla de login', () => {
  test('muestra el branding de Te Reparo', async ({ page }) => {
    await resetApp(page)
    await expect(page.getByText('Te Reparo').first()).toBeVisible()
    // El texto está dividido en múltiples líneas en el HTML
    await expect(page.getByText(/Gestiona tu taller/)).toBeVisible()
  })

  test('muestra los 5 roles de acceso rápido', async ({ page }) => {
    await resetApp(page)
    await expect(page.getByRole('button', { name: /Super Administrador/ })).toBeVisible()
    // Para Admin, usar regex exacto para no coincidir con Super Administrador
    await expect(page.getByRole('button', { name: /^Administrador/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Vendedor/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Informático/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Electrónico/ })).toBeVisible()
  })

  test('login con credenciales correctas inicia sesión', async ({ page }) => {
    await resetApp(page)
    await page.getByLabel('Correo electrónico').fill('superadmin@tereparo.mx')
    await page.getByLabel('Contraseña').fill('admin123')
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click()
    await expect(page.getByRole('heading', { name: /Panel Global/ })).toBeVisible({ timeout: 10000 })
  })

  test('login con credenciales incorrectas muestra error', async ({ page }) => {
    await resetApp(page)
    await page.getByLabel('Correo electrónico').fill('wrong@tereparo.mx')
    await page.getByLabel('Contraseña').fill('wrongpass')
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click()
    // Debe seguir en la pantalla de login
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('toggle de tema cambia entre claro y oscuro', async ({ page }) => {
    await resetApp(page)
    const themeToggle = page.getByRole('button', { name: 'Cambiar tema' })
    const htmlBefore = await page.evaluate(() => document.documentElement.className)
    await themeToggle.click()
    const htmlAfter = await page.evaluate(() => document.documentElement.className)
    expect(htmlBefore).not.toBe(htmlAfter)
  })
})

test.describe('Login por rol', () => {
  test('Super Admin ve panel global', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await expect(page.getByRole('heading', { name: /Panel Global — Todas las Sucursales/ })).toBeVisible()
  })

  test('Admin ve panel de su taller', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await expect(page.getByRole('heading', { name: /Panel — Te Reparo Centro/ })).toBeVisible()
  })

  test('Vendedor ve panel de vendedor', async ({ page }) => {
    await loginByRole(page, 'VENDEDOR')
    await expect(page.getByRole('heading', { name: /Panel — Te Reparo Centro/ })).toBeVisible()
  })

  test('Informático ve panel', async ({ page }) => {
    await loginByRole(page, 'INFORMATICO')
    await expect(page.getByRole('heading', { name: /Panel — Te Reparo Centro/ })).toBeVisible()
  })

  test('Electrónico ve panel', async ({ page }) => {
    await loginByRole(page, 'ELECTRONICO')
    await expect(page.getByRole('heading', { name: /Panel — Te Reparo Centro/ })).toBeVisible()
  })

  test('logout vuelve a la pantalla de login', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible({ timeout: 5000 })
  })
})
