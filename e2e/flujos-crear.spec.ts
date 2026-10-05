import { test, expect, loginByRole, navigateTo } from './helpers'

test.describe('Flujo completo: Crear producto con comisión', () => {
  test('crear un producto nuevo con comisión porcentual', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')

    const totalAntes = await page.locator('table tbody tr').count()

    // Abrir formulario
    await page.getByRole('button', { name: /Nuevo Producto/ }).click()
    await expect(page.getByRole('heading', { name: 'Nuevo Producto' })).toBeVisible({ timeout: 5000 })

    // Llenar campos básicos
    await page.getByLabel('Nombre *').fill('Cable USB-C Premium')
    await page.getByLabel('SKU *').fill('CBL-USBC-PREMIUM')
    await page.getByLabel('Código de Barras *').fill('7501112223334')

    // Precios
    await page.getByLabel('Precio Costo').fill('80')
    await page.getByLabel('Precio Venta').fill('199')

    // Stock
    await page.getByLabel('Stock Inicial').fill('15')
    await page.getByLabel('Stock Mínimo').fill('5')

    // Garantía
    await page.getByLabel('Garantía (días)').fill('30')

    // Configurar comisión porcentual (2%)
    // La sección de comisión está al final del formulario
    const comisionSection = page.locator('text=Comisión para operario').locator('..')
    await comisionSection.locator('button[role="combobox"]').click()
    await page.getByRole('option', { name: 'Porcentaje (%)' }).click()
    await comisionSection.locator('input[type="number"]').last().fill('2')

    // Verificar que se calcula la comisión por unidad
    await expect(page.getByText(/Comisión por unidad/)).toBeVisible({ timeout: 3000 })

    // Guardar
    await page.getByRole('button', { name: 'Guardar' }).click()

    // Debe aparecer en la tabla
    await expect(page.getByText('Cable USB-C Premium')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('2%').first()).toBeVisible()

    // Verificar que aumentó el número de filas
    const totalDespues = await page.locator('table tbody tr').count()
    expect(totalDespues).toBe(totalAntes + 1)
  })

  test('crear un producto con comisión fija', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')

    await page.getByRole('button', { name: /Nuevo Producto/ }).click()

    await page.getByLabel('Nombre *').fill('Adaptador HDMI')
    await page.getByLabel('SKU *').fill('ADP-HDMI-1')
    await page.getByLabel('Código de Barras *').fill('7509998887770')
    await page.getByLabel('Precio Costo').fill('150')
    await page.getByLabel('Precio Venta').fill('349')
    await page.getByLabel('Stock Inicial').fill('10')

    // Comisión fija de $25
    const comisionSection = page.locator('text=Comisión para operario').locator('..')
    await comisionSection.locator('button[role="combobox"]').click()
    await page.getByRole('option', { name: 'Monto fijo (MXN)' }).click()
    await comisionSection.locator('input[type="number"]').last().fill('25')

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Adaptador HDMI')).toBeVisible({ timeout: 5000 })
    // La comisión fija se muestra como $25.00
    await expect(page.getByText('$25.00').first()).toBeVisible()
  })

  test('crear un producto sin comisión', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')

    await page.getByRole('button', { name: /Nuevo Producto/ }).click()

    await page.getByLabel('Nombre *').fill('Cable Auxiliar')
    await page.getByLabel('SKU *').fill('CBL-AUX-1')
    await page.getByLabel('Código de Barras *').fill('7505554443330')
    await page.getByLabel('Precio Costo').fill('20')
    await page.getByLabel('Precio Venta').fill('79')
    await page.getByLabel('Stock Inicial').fill('30')

    // Dejar comisión en "Sin comisión" (valor por defecto)
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Cable Auxiliar')).toBeVisible({ timeout: 5000 })
    // En la columna comisión debe mostrar "—"
    const fila = page.locator('tr', { hasText: 'Cable Auxiliar' })
    await expect(fila.locator('td').nth(7)).toContainText('—')
  })

  test('validar que el código de barras duplicado bloquea el guardado', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')

    await page.getByRole('button', { name: /Nuevo Producto/ }).click()

    await page.getByLabel('Nombre *').fill('Producto Duplicado')
    await page.getByLabel('SKU *').fill('DUP-1')
    // Usar un código que ya existe (prod-1: 7501234560011)
    const codigoInput = page.locator('input').filter({ hasText: '' }).nth(2)
    // Usar el input que está después del SKU
    await page.locator('input[placeholder], input[type="text"]').nth(2).fill('7501234560011')

    // Esperar a que se valide asíncronamente
    await expect(page.getByText('Este código ya está registrado')).toBeVisible({ timeout: 5000 })

    // El botón Guardar debe estar deshabilitado
    const guardarBtn = page.getByRole('button', { name: 'Guardar' })
    await expect(guardarBtn).toBeDisabled()
  })

  test('validar que el código de barras único muestra check verde', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')

    await page.getByRole('button', { name: /Nuevo Producto/ }).click()
    // Usar un código numérico válido de 13 dígitos
    await page.locator('input').nth(3).fill('7501112223330')

    // Esperar a que se valide (aparece el mensaje de disponible)
    await expect(page.getByText('Código disponible')).toBeVisible({ timeout: 5000 })
  })

  test('editar un producto existente cambia su nombre', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Productos (Venta)')

    // Click en el primer botón de editar (icono pencil)
    await page.locator('button:has(svg.lucide-pencil)').first().click()

    // Cambiar el nombre
    const nombreInput = page.getByLabel('Nombre *')
    await nombreInput.fill('iPhone 13 128GB EDITADO')

    await page.getByRole('button', { name: 'Guardar' }).click()

    // Debe aparecer el nombre actualizado
    await expect(page.getByText('iPhone 13 128GB EDITADO')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Flujo completo: Crear pieza de reparación', () => {
  test('crear una pieza nueva con garantía de fábrica', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Piezas (Reparación)')

    await page.getByRole('button', { name: /Nueva Pieza/ }).click()
    await expect(page.getByRole('heading', { name: 'Nueva Pieza' })).toBeVisible({ timeout: 5000 })

    await page.getByLabel('Nombre *').fill('Pantalla LCD Xiaomi Redmi 9')
    await page.getByLabel('SKU *').fill('PNT-XIA-RD9')
    await page.getByLabel('Código de Barras *').fill('7501119998880')
    await page.getByLabel('Costo Unitario').fill('850')
    await page.getByLabel('Stock Inicial').fill('4')
    await page.getByLabel('Stock Mínimo').fill('2')
    await page.getByLabel('Garantía Fábrica (días)').fill('60')

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Pantalla LCD Xiaomi Redmi 9')).toBeVisible({ timeout: 5000 })
  })

  test('gestionar categorías de piezas', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Piezas (Reparación)')

    await page.getByRole('button', { name: 'Categorías' }).click()
    await expect(page.getByRole('heading', { name: 'Categorías de Piezas' })).toBeVisible({ timeout: 5000 })

    // Crear una nueva categoría
    await page.getByPlaceholder('Nueva categoría...').fill('Microcomponentes')
    await page.keyboard.press('Enter')

    await expect(page.getByText('Microcomponentes')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Flujo completo: Crear cliente', () => {
  test('crear un cliente persona natural', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')

    const totalAntes = await page.locator('table tbody tr').count()

    await page.getByRole('button', { name: /Nuevo Cliente/ }).click()
    await expect(page.getByRole('heading', { name: 'Nuevo Cliente' })).toBeVisible({ timeout: 5000 })

    await page.getByLabel('Nombre o Razón Social *').fill('María González Torres')
    await page.getByLabel('Teléfono').fill('55 2222 3333')
    await page.getByLabel('Email').fill('maria.gonzalez@email.com')
    await page.getByLabel('RFC').fill('GOTM850101AB1')
    await page.getByLabel('Dirección').fill('Calle Reforma 456, CDMX')

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('María González Torres')).toBeVisible({ timeout: 5000 })

    const totalDespues = await page.locator('table tbody tr').count()
    expect(totalDespues).toBe(totalAntes + 1)
  })

  test('crear un cliente empresa con RFC', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')

    await page.getByRole('button', { name: /Nuevo Cliente/ }).click()

    await page.getByLabel('Nombre o Razón Social *').fill('Tech Solutions S.A. de C.V.')
    await page.getByLabel('RFC').fill('TSC950101XYZ')

    // Cambiar tipo a Empresa
    await page.locator('button[role="combobox"]').first().click()
    await page.getByRole('option', { name: 'Empresa' }).click()

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Tech Solutions S.A. de C.V.')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('TSC950101XYZ')).toBeVisible()
  })

  test('ver detalle e historial de un cliente', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')

    // Click en el primer botón de ver (Eye) — Juan Pérez García tiene historial
    await page.locator('button:has(svg.lucide-eye)').first().click()

    // Debe mostrar el dialog con el historial
    await expect(page.getByText(/Juan Pérez García/)).toBeVisible({ timeout: 5000 })
    // Debe mostrar las estadísticas (compras, servicios, garantías)
    await expect(page.getByText('Compras')).toBeVisible()
    await expect(page.getByText('Servicios')).toBeVisible()
    await expect(page.getByText('Garantías')).toBeVisible()
  })

  test('buscar cliente por teléfono filtra la lista', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')

    const search = page.getByPlaceholder(/Buscar por nombre/)
    await search.fill('55 1111 2222') // Teléfono de Juan Pérez

    await expect(page.getByText('Juan Pérez García')).toBeVisible({ timeout: 5000 })
  })

  test('el cliente general no se puede eliminar', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Clientes')

    // El cliente general debe estar en la lista pero sin botón de eliminar
    const filaGeneral = page.locator('tr', { hasText: 'Cliente General' })
    // El botón de eliminar (trash) no debe estar en la fila del cliente general
    await expect(filaGeneral.locator('button:has(svg.lucide-trash-2)')).toHaveCount(0)
  })
})
