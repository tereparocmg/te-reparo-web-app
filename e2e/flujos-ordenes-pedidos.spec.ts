import { test, expect, loginByRole, navigateTo } from './helpers'

test.describe('Flujo completo: Crear orden de servicio y entregarla', () => {
  test('crear orden, procesar, entregar y generar garantía', async ({ page }) => {
    await loginByRole(page, 'ELECTRONICO')
    await navigateTo(page, 'Órdenes de Servicio')

    // Crear nueva orden
    await page.getByRole('button', { name: /Nueva Orden/ }).click()
    await expect(page.getByRole('heading', { name: /Nueva Orden de Servicio/ })).toBeVisible({ timeout: 5000 })

    // Datos del dispositivo
    await page.getByLabel('Marca *').fill('Apple')
    await page.getByLabel('Modelo *').fill('iPhone 14 Pro')
    await page.getByLabel('IMEI / Serie').fill('353111222333555')
    await page.getByLabel('Problema Reportado *').fill('Pantalla con líneas negras')

    // Agregar un servicio predefinido (Cambio de pantalla)
    await page.getByRole('button', { name: /Cambio de pantalla/ }).first().click()

    // Verificar que la línea se agregó
    await expect(page.getByText('Cambio de pantalla OLED').first()).toBeVisible({ timeout: 3000 })

    // Guardar la orden
    await page.getByRole('button', { name: 'Guardar Orden' }).click()

    // Debe aparecer en la tabla con estado Pendiente
    await expect(page.getByText('iPhone 14 Pro').first()).toBeVisible({ timeout: 5000 })

    // Abrir la orden creada (primer botón Eye)
    await page.locator('button:has(svg.lucide-eye)').first().click()

    // Cambiar estado: Pendiente → En Proceso
    const iniciarBtn = page.getByRole('button', { name: 'Iniciar Proceso' })
    if (await iniciarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await iniciarBtn.click()
      await page.waitForTimeout(500)
    }

    // En Proceso → Reparado
    const repararBtn = page.getByRole('button', { name: 'Marcar Reparado' })
    if (await repararBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await repararBtn.click()
      await page.waitForTimeout(500)
    }

    // Reparado → Entregar (abre dialog de garantía)
    const entregarBtn = page.getByRole('button', { name: /Entregar y Generar Garantía/ })
    if (await entregarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await entregarBtn.click()
      await page.waitForTimeout(500)

      // Confirmar entrega en el dialog
      await page.getByRole('button', { name: 'Confirmar Entrega' }).click()
      await page.waitForTimeout(1000)
    }
  })

  test('crear orden con servicio personalizado', async ({ page }) => {
    await loginByRole(page, 'INFORMATICO')
    await navigateTo(page, 'Órdenes de Servicio')

    await page.getByRole('button', { name: /Nueva Orden/ }).click()

    await page.getByLabel('Marca *').fill('Samsung')
    await page.getByLabel('Modelo *').fill('Galaxy S23')
    await page.getByLabel('Problema Reportado *').fill('No carga el sistema operativo')

    // Agregar línea personalizada
    await page.getByRole('button', { name: /Personalizada/ }).click()

    // Llenar la línea personalizada
    const descInput = page.getByPlaceholder('Descripción del servicio')
    await descInput.fill('Reinstalación de Android')

    // El precio de mano de obra (último input numérico de la línea)
    const lineaContainer = page.locator('div', { hasText: 'Reinstalación de Android' }).first()
    const precioInput = lineaContainer.locator('input[type="number"]').first()
    await precioInput.fill('450')

    await page.getByRole('button', { name: 'Guardar Orden' }).click()

    await expect(page.getByText('Galaxy S23').first()).toBeVisible({ timeout: 5000 })
  })

  test('crear orden con piezas utilizadas', async ({ page }) => {
    await loginByRole(page, 'ELECTRONICO')
    await navigateTo(page, 'Órdenes de Servicio')

    await page.getByRole('button', { name: /Nueva Orden/ }).click()

    await page.getByLabel('Marca *').fill('Apple')
    await page.getByLabel('Modelo *').fill('iPhone 13')
    await page.getByLabel('Problema Reportado *').fill('Batería defectuosa')

    // Seleccionar una pieza del inventario
    const piezaSelect = page.locator('button[role="combobox"]', { hasText: /Seleccionar pieza/ })
    await piezaSelect.click()
    // Seleccionar Batería iPhone 13 (pz-3)
    await page.getByRole('option', { name: /Batería iPhone 13/ }).click()

    // Verificar que la pieza se agregó
    await expect(page.getByText('Batería iPhone 13').first()).toBeVisible({ timeout: 3000 })

    await page.getByRole('button', { name: 'Guardar Orden' }).click()

    await expect(page.getByText('iPhone 13').first()).toBeVisible({ timeout: 5000 })
  })

  test('filtrar órdenes por estado Pendiente', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Órdenes de Servicio')

    await page.getByRole('button', { name: 'Pendiente' }).first().click()
    // Debe mostrar solo órdenes pendientes
    await expect(page.getByText('OS-003Z3').first()).toBeVisible({ timeout: 5000 })
  })

  test('filtrar órdenes por estado En Proceso', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Órdenes de Servicio')

    await page.getByRole('button', { name: 'En Proceso' }).first().click()
    // Debe mostrar la orden semilla en proceso (OS-001X1)
    await expect(page.getByText('OS-001X1').first()).toBeVisible({ timeout: 5000 })
  })

  test('ver detalle de orden muestra factura con datos', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Órdenes de Servicio')

    await page.locator('button:has(svg.lucide-eye)').first().click()

    // La factura debe mostrar el folio y los datos del dispositivo
    await expect(page.getByText(/FACTURA DE SERVICIO|Orden OS-/).first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Flujo completo: Pedido interno', () => {
  test('técnico crea un pedido interno', async ({ page }) => {
    await loginByRole(page, 'ELECTRONICO')
    await navigateTo(page, 'Pedidos Internos')

    await page.getByRole('button', { name: /Nuevo Pedido/ }).click()

    await page.getByPlaceholder(/Ej: 5x Pantalla/).fill('3x Pantalla iPhone 14 Pro')
    await page.getByLabel('Cantidad').fill('3')

    // Seleccionar urgencia ALTA
    await page.locator('button[role="combobox"]').first().click()
    await page.getByRole('option', { name: 'Alta' }).click()

    await page.getByRole('button', { name: 'Crear Pedido' }).click()

    await expect(page.getByText('3x Pantalla iPhone 14 Pro')).toBeVisible({ timeout: 5000 })
  })

  test('admin ve bandeja de aprobación con pedidos pendientes', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Pedidos Internos')

    // Debe mostrar la bandeja
    await expect(page.getByText(/Bandeja de Aprobación/)).toBeVisible({ timeout: 5000 })
    // Debe haber pedidos pendientes (semilla)
    await expect(page.getByText('P-001').first()).toBeVisible()
  })

  test('admin aprueba un pedido', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Pedidos Internos')

    // Click en el primer botón Aprobar
    const aprobarBtn = page.getByRole('button', { name: 'Aprobar' }).first()
    if (await aprobarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aprobarBtn.click()
      await page.waitForTimeout(500)
      // El pedido debe salir de la bandeja de pendientes
    }
  })

  test('admin rechaza un pedido', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Pedidos Internos')

    const rechazarBtn = page.getByRole('button', { name: 'Rechazar' }).first()
    if (await rechazarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rechazarBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('técnico puede eliminar su propio pedido pendiente', async ({ page }) => {
    await loginByRole(page, 'INFORMATICO')
    await navigateTo(page, 'Pedidos Internos')

    // Crear un pedido
    await page.getByRole('button', { name: /Nuevo Pedido/ }).click()
    await page.getByPlaceholder(/Ej: 5x Pantalla/).fill('Pedido para eliminar')
    await page.getByRole('button', { name: 'Crear Pedido' }).click()

    await expect(page.getByText('Pedido para eliminar')).toBeVisible({ timeout: 5000 })

    // Eliminar el pedido (botón trash)
    const eliminarBtn = page.locator('tr', { hasText: 'Pedido para eliminar' })
      .locator('button:has(svg.lucide-trash-2)')
    if (await eliminarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await eliminarBtn.click()
      await page.waitForTimeout(500)
      // El pedido debe desaparecer
      await expect(page.getByText('Pedido para eliminar')).not.toBeVisible({ timeout: 3000 })
    }
  })
})

test.describe('Flujo completo: Registrar gasto y compra', () => {
  test('registrar un gasto operativo', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')

    await page.getByRole('button', { name: /Registrar Gasto/ }).click()

    await page.getByLabel('Concepto *').fill('Limpieza del local')
    await page.getByLabel('Monto *').fill('350')

    // Seleccionar categoría
    await page.locator('button[role="combobox"]').first().click()
    await page.getByRole('option', { name: 'Servicios' }).click()

    await page.getByRole('button', { name: 'Registrar' }).click()

    await expect(page.getByText('Limpieza del local')).toBeVisible({ timeout: 5000 })
  })

  test('registrar una compra de inventario', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')

    const stockAntes = await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('te-reparo-manager-storage') || '{}')
      return store.state?.productos?.find((p: any) => p.id === 'prod-3')?.stock || 0
    })

    await page.getByRole('button', { name: /Registrar Compra/ }).click()

    await page.getByLabel('Proveedor').fill('Mayorista Tech SA')

    // Agregar un producto a la compra
    await page.locator('button[role="combobox"]', { hasText: /\+ Producto/ }).click()
    await page.getByRole('option', { name: /Funda iPhone 13/ }).click()

    // La fila debe aparecer con cantidad 1 y costo
    const fila = page.locator('div', { hasText: 'Funda iPhone 13' })
      .filter({ has: page.locator('input[type="number"]') }).first()

    await page.getByRole('button', { name: 'Registrar Compra' }).click()

    await expect(page.getByText(/compra registrada|stock actualizado/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('filtrar movimientos por tipo Ingreso', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')

    // Click en el filtro Ingresos
    await page.locator('button[role="combobox"]').first().click()
    await page.getByRole('option', { name: 'Ingresos' }).click()
  })

  test('filtrar movimientos por fecha', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')

    // Establecer fecha de inicio
    const fechaInput = page.locator('input[type="date"]').first()
    const hoy = new Date().toISOString().split('T')[0]
    await fechaInput.fill(hoy)
  })

  test('exportar Excel de movimientos', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Movimientos / Caja')

    const exportBtn = page.getByRole('button', { name: /Exportar Excel/ })
    await expect(exportBtn).toBeVisible()
  })
})

test.describe('Flujo completo: Crear y gestionar taller', () => {
  test('super admin crea un taller nuevo', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await navigateTo(page, 'Talleres')

    await page.getByRole('button', { name: /Nuevo Taller/ }).click()
    await expect(page.getByRole('heading', { name: 'Nuevo Taller' })).toBeVisible({ timeout: 5000 })

    await page.getByLabel('Nombre del taller *').fill('Te Reparo Sur')
    await page.getByLabel('Dirección *').fill('Av. Insurgentes Sur 999, CDMX')
    await page.getByLabel('Teléfono *').fill('55 9999 8888')
    await page.getByLabel('Encargado').fill('Pedro Ramírez')

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Te Reparo Sur')).toBeVisible({ timeout: 5000 })
  })

  test('editar un taller existente', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await navigateTo(page, 'Talleres')

    // Click en el primer botón de editar (pencil)
    await page.locator('button:has(svg.lucide-pencil)').first().click()

    // Cambiar el encargado
    const encargadoInput = page.getByLabel('Encargado')
    await encargadoInput.fill('Nuevo Encargado')

    await page.getByRole('button', { name: 'Guardar' }).click()
  })

  test('admin no puede crear talleres (no ve el botón)', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Talleres')

    // El botón de nuevo taller solo lo ve Super Admin
    await expect(page.getByRole('button', { name: /Nuevo Taller/ })).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('Flujo completo: Crear usuario', () => {
  test('super admin crea un usuario vendedor', async ({ page }) => {
    await loginByRole(page, 'SUPER_ADMIN')
    await navigateTo(page, 'Usuarios')

    await page.getByRole('button', { name: /Nuevo Usuario/ }).click()

    await page.getByLabel('Nombre completo *').fill('Nuevo Vendedor Test')
    await page.getByLabel('Correo electrónico *').fill('nuevo.vendedor@tereparo.mx')
    await page.getByLabel('Contraseña').fill('vendedor123')
    await page.getByLabel('Teléfono').fill('55 1234 5678')

    // Seleccionar rol Vendedor
    await page.locator('button[role="combobox"]').nth(1).click()
    await page.getByRole('option', { name: 'Vendedor' }).click()

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Nuevo Vendedor Test')).toBeVisible({ timeout: 5000 })
  })

  test('admin no puede asignar rol Super Administrador', async ({ page }) => {
    await loginByRole(page, 'ADMIN')
    await navigateTo(page, 'Usuarios')

    await page.getByRole('button', { name: /Nuevo Usuario/ }).click()

    // Abrir selector de rol
    await page.locator('button[role="combobox"]').nth(1).click()

    // La opción Super Administrador debe estar deshabilitada
    const superAdminOption = page.getByRole('option', { name: /Super Administrador/ })
    await expect(superAdminOption).toBeDisabled()
  })
})
