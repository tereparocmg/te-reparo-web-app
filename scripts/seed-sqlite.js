// ============================================================
// Te Reparo Manager — Seed SQLite (Electron)
// ============================================================
// Replica en SQLite los datos semilla que el store de Zustand
// tenía en memoria (TALLER_1, USUARIOS_SEMILLA, CLIENTES_SEMILLA,
// CATEGORIAS_SEMILLA, PRODUCTOS_SEMILLA, PIEZAS_SEMILLA,
// VENTAS_SEMILLA, MOVIMIENTOS_SEMILLA, PEDIDOS_SEMILLA,
// GARANTIAS_SEMILLA, OPERARIOS_SEMILLA, etc.) para que el flujo
// login -> POS -> venta -> reinicio funcione end-to-end contra
// la base persistente.
//
// Idempotente: usa upserts. Se puede re-ejecutar sin romper.
//
// Uso:
//   npm run db:seed
//   o:  node scripts/seed-sqlite.js
// ============================================================

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Cargar .env manualmente con override=true para que el .env del proyecto
// tome precedencia sobre cualquier DATABASE_URL stale del shell.
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath, override: true });
}

// Verificar que DATABASE_URL esté seteada
if (!process.env.DATABASE_URL) {
  console.error('[seed] ERROR: DATABASE_URL no está definida.');
  console.error('[seed] Verifica que .env exista en la raíz del proyecto con:');
  console.error('    DATABASE_URL=file:dev.db');
  process.exit(1);
}

console.log('[seed] Usando DATABASE_URL =', process.env.DATABASE_URL);

// Usa el PrismaClient por defecto, que lee DATABASE_URL del .env
const prisma = new PrismaClient();

function fechaHoy(offsetHoras = 0) {
  const d = new Date();
  d.setHours(d.getHours() - offsetHoras);
  return d;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log('[seed] Conectando a SQLite...');
  await prisma.$connect();

  // ============================================================
  // 0. LIMPIEZA TOTAL — borra todos los datos previos (test/db viejo)
  // ============================================================
  console.log('[seed] Borrando datos previos...');
  // Orden: tablas hijas primero (FK), luego padres.
  const tablasBorrar = [
    'commissionEntry', 'operatorPayment',
    'reclamacionGarantia', 'garantia',
    'movimiento', 'compraItem', 'compra',
    'pedidoInterno', 'devolucion',
    'servicioItemPieza', 'servicio',
    'ventaItem', 'venta',
    'pieza', 'producto', 'categoria',
    'usuarioTaller', 'usuario',
    'operario', 'cliente',
    'taller', 'configuracionGlobal',
    'changeLog',
  ];
  for (const t of tablasBorrar) {
    try {
      const r = await prisma[t].deleteMany({});
      if (r.count > 0) console.log('  -', t, ':', r.count, 'borrados');
    } catch (e) {
      // Tabla no existe o error menor, continuar
    }
  }
  console.log('[seed] OK — base limpia');

  // ============================================================
  // 1. TALLERES — replicar TALLER_1, TALLER_2
  // ============================================================
  console.log('[seed] Talleres...');
  await prisma.taller.create({
    data: {
      id: 'taller-1',
      nombre: 'Te Reparo Centro',
      direccion: 'Calle Reina #123, Habana Vieja',
      telefono: '+53 7 866 1234',
      encargado: 'Carlos Mendoza',
      activo: true,
      rfc: 'TRC-850101-ABC',
      razonSocial: 'Te Reparo Centro S.A.',
      ciudad: 'Habana',
      codigoPostal: '10300',
      limiteDescuento: 15,
      horarioApertura: '09:00',
      horarioCierre: '19:00',
      metodosPago: 'Efectivo,Tarjeta,Transferencia',
      garantiaProductoDias: 30,
      garantiaServicioDias: 90,
      plantillaGarantia: 'Esta garantía cubre defectos de fabricación e instalación por el período indicado. No cubre daños por mal uso, caídas, líquidos o modificaciones no autorizadas.',
    },
  });
  await prisma.taller.create({
    data: {
      id: 'taller-2',
      nombre: 'Te Reparo Norte',
      direccion: 'Calle Aguilera #456, Santiago',
      telefono: '+53 22 648 5678',
      encargado: 'María Fernández',
      activo: true,
      rfc: 'TRS-850202-DEF',
      razonSocial: 'Te Reparo Norte S.A.',
      ciudad: 'Santiago de Cuba',
      codigoPostal: '90100',
      limiteDescuento: 10,
      horarioApertura: '10:00',
      horarioCierre: '20:00',
      metodosPago: 'Efectivo,Tarjeta',
      garantiaProductoDias: 30,
      garantiaServicioDias: 60,
    },
  });
  console.log('  + taller-1, taller-2');

  // ============================================================
  // 2. USUARIOS — replicar USUARIOS_SEMILLA
  // ============================================================
  console.log('[seed] Usuarios...');
  const usuarios = [
    { id: 'u-super', email: 'superadmin@tereparo.mx', password: 'admin123', nombre: 'Super Administrador', rol: 'SUPER_ADMIN', telefono: '+53 7 555 0001', tallerIds: ['taller-1', 'taller-2'] },
    { id: 'u-admin-1', email: 'admin.centro@tereparo.mx', password: 'admin123', nombre: 'Carlos Mendoza', rol: 'ADMIN', telefono: '+53 7 555 0002', tallerIds: ['taller-1'] },
    { id: 'u-admin-2', email: 'admin.norte@tereparo.mx', password: 'admin123', nombre: 'María Fernández', rol: 'ADMIN', telefono: '+53 22 555 0003', tallerIds: ['taller-2'] },
    { id: 'u-vend-1', email: 'vendedor@tereparo.mx', password: 'vendedor123', nombre: 'Laura Sánchez', rol: 'VENDEDOR', telefono: '+53 7 555 0004', tallerIds: ['taller-1'] },
  ];
  for (const u of usuarios) {
    const { tallerIds, ...data } = u;
    await prisma.usuario.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        activo: true,
        talleres: { create: tallerIds.map(tallerId => ({ tallerId })) },
      },
    });
    console.log('  +', data.email, '(' + data.rol + ')');
  }

  // ============================================================
  // 3. CLIENTES — replicar CLIENTES_SEMILLA
  // ============================================================
  console.log('[seed] Clientes...');
  const clientes = [
    { id: 'cliente-general', nombre: 'Cliente General', telefono: '', email: '', tipo: 'PERSONA_NATURAL', esClienteGeneral: true, createdAt: new Date() },
    { id: 'cli-1', nombre: 'Juan Pérez García', telefono: '+53 5 111 2222', email: 'juan.perez@gmail.com', tipo: 'PERSONA_NATURAL', esClienteGeneral: false, createdAt: fechaHoy(30 * 24) },
    { id: 'cli-2', nombre: 'Ana Martínez López', telefono: '+53 5 333 4444', email: 'ana.martinez@outlook.com', tipo: 'PERSONA_NATURAL', esClienteGeneral: false, createdAt: fechaHoy(20 * 24) },
    { id: 'cli-3', nombre: 'Distribuidora Tecnológica S.A.', telefono: '+53 7 555 6666', email: 'compras@distribuidoratec.cu', tipo: 'EMPRESA', rfc: 'DTI950101AAA', direccion: 'Av. Reforma 100, Habana', esClienteGeneral: false, createdAt: fechaHoy(60 * 24) },
    { id: 'cli-4', nombre: 'Roberto Hernández', telefono: '+53 5 777 8888', tipo: 'PERSONA_NATURAL', esClienteGeneral: false, createdAt: fechaHoy(10 * 24) },
  ];
  for (const c of clientes) {
    await prisma.cliente.create({ data: c });
  }
  console.log('  + 5 clientes');

  // ============================================================
  // 4. OPERARIOS — replicar OPERARIOS_SEMILLA
  // ============================================================
  console.log('[seed] Operarios...');
  const operarios = [
    { id: 'op-1', nombre: 'Diego Ramírez', telefono: '+53 5 555 0005', especialidad: 'INFORMATICA', activo: true },
    { id: 'op-2', nombre: 'Sofía Castro', telefono: '+53 5 555 0006', especialidad: 'ELECTRONICA', activo: true },
    { id: 'op-3', nombre: 'Miguel Torres', telefono: '+53 5 555 0007', especialidad: 'ELECTRONICA', activo: true },
    { id: 'op-4', nombre: 'Ana Vargas', telefono: '+53 5 555 0008', especialidad: 'INFORMATICA', activo: true },
  ];
  for (const o of operarios) {
    await prisma.operario.create({ data: o });
  }
  console.log('  + 4 operarios');

  // ============================================================
  // 5. CATEGORÍAS — replicar CATEGORIAS_SEMILLA
  // ============================================================
  console.log('[seed] Categorías...');
  const categorias = [
    { id: 'cat-p-1', nombre: 'Teléfonos', tipo: 'PRODUCTO', activa: true, tallerId: 'taller-1' },
    { id: 'cat-p-2', nombre: 'Accesorios', tipo: 'PRODUCTO', activa: true, tallerId: 'taller-1' },
    { id: 'cat-p-3', nombre: 'Cargadores', tipo: 'PRODUCTO', activa: true, tallerId: 'taller-1' },
    { id: 'cat-r-1', nombre: 'Pantallas', tipo: 'PIEZA', activa: true, tallerId: 'taller-1' },
    { id: 'cat-r-2', nombre: 'Baterías', tipo: 'PIEZA', activa: true, tallerId: 'taller-1' },
    { id: 'cat-r-3', nombre: 'Puertos de carga', tipo: 'PIEZA', activa: true, tallerId: 'taller-1' },
    { id: 'cat-r-4', nombre: 'Conectores', tipo: 'PIEZA', activa: true, tallerId: 'taller-1' },
    { id: 'cat2-p-1', nombre: 'Teléfonos', tipo: 'PRODUCTO', activa: true, tallerId: 'taller-2' },
    { id: 'cat2-r-1', nombre: 'Pantallas', tipo: 'PIEZA', activa: true, tallerId: 'taller-2' },
  ];
  for (const c of categorias) {
    await prisma.categoria.create({ data: c });
  }
  console.log('  + 9 categorías');

  // ============================================================
  // 6. PRODUCTOS — replicar PRODUCTOS_SEMILLA
  // ============================================================
  console.log('[seed] Productos...');
  const productos = [
    { id: 'prod-1', sku: 'TEL-IP13-128', codigoBarras: '7501234560011', nombre: 'iPhone 13 128GB', descripcion: 'Apple iPhone 13 128GB Negro', precioCosto: 14000, precioVenta: 17999, stock: 8, stockMinimo: 3, garantiaDias: 30, categoriaId: 'cat-p-1', tallerId: 'taller-1', activo: true, operatorCommissionType: 'PERCENTAGE', operatorCommissionValue: 1.5, tags: JSON.stringify(['Apple', 'iPhone', 'Teléfono']) },
    { id: 'prod-2', sku: 'TEL-SAM-A54', codigoBarras: '7501234560028', nombre: 'Samsung Galaxy A54', descripcion: 'Samsung Galaxy A54 5G 128GB', precioCosto: 6500, precioVenta: 8999, stock: 12, stockMinimo: 4, garantiaDias: 30, categoriaId: 'cat-p-1', tallerId: 'taller-1', activo: true, operatorCommissionType: 'PERCENTAGE', operatorCommissionValue: 2, tags: JSON.stringify(['Samsung', 'Galaxy', 'Teléfono']) },
    { id: 'prod-3', sku: 'ACC-FUND-IP13', codigoBarras: '7501234560035', nombre: 'Funda iPhone 13', descripcion: 'Funda silicona iPhone 13', precioCosto: 80, precioVenta: 249, stock: 45, stockMinimo: 10, garantiaDias: 0, categoriaId: 'cat-p-2', tallerId: 'taller-1', activo: true, operatorCommissionType: 'FIXED', operatorCommissionValue: 15, tags: JSON.stringify(['Apple', 'iPhone', 'Accesorio', 'Funda']) },
    { id: 'prod-4', sku: 'ACC-VID-TMPL', codigoBarras: '7501234560042', nombre: 'Vidrio Templado Universal', descripcion: 'Protector de pantalla', precioCosto: 25, precioVenta: 99, stock: 80, stockMinimo: 20, garantiaDias: 0, categoriaId: 'cat-p-2', tallerId: 'taller-1', activo: true, operatorCommissionType: 'FIXED', operatorCommissionValue: 10, tags: JSON.stringify(['Accesorio', 'Vidrio']) },
    { id: 'prod-5', sku: 'CARG-USB-C-20W', codigoBarras: '7501234560059', nombre: 'Cargador USB-C 20W', descripcion: 'Cargador rápido USB-C 20W', precioCosto: 120, precioVenta: 349, stock: 25, stockMinimo: 8, garantiaDias: 30, categoriaId: 'cat-p-3', tallerId: 'taller-1', activo: true, operatorCommissionType: 'FIXED', operatorCommissionValue: 20, tags: JSON.stringify(['Accesorio', 'Cargador', 'USB-C']) },
    { id: 'prod-6', sku: 'ACC-AUD-BT', codigoBarras: '7501234560066', nombre: 'Audífonos Bluetooth', descripcion: 'Audífonos inalámbricos', precioCosto: 280, precioVenta: 599, stock: 2, stockMinimo: 5, garantiaDias: 30, categoriaId: 'cat-p-2', tallerId: 'taller-1', activo: true, operatorCommissionType: null, operatorCommissionValue: null, tags: JSON.stringify(['Accesorio', 'Audífonos']) },
  ];
  for (const p of productos) {
    await prisma.producto.create({ data: p });
  }
  console.log('  + 6 productos');

  // ============================================================
  // 7. PIEZAS — replicar PIEZAS_SEMILLA
  // ============================================================
  console.log('[seed] Piezas...');
  const piezas = [
    { id: 'pz-1', sku: 'PNT-IP13-OLED', codigoBarras: '7509876540011', nombre: 'Pantalla OLED iPhone 13', descripcion: 'Pantalla OLED original', costoUnitario: 3500, precioVenta: 4500, stock: 5, stockMinimo: 2, garantiaFabricaDias: 90, categoriaId: 'cat-r-1', tallerId: 'taller-1', activo: true, operatorPaymentType: 'FIXED', operatorPaymentValue: 500, tags: JSON.stringify(['Apple', 'iPhone', 'Pantalla']) },
    { id: 'pz-2', sku: 'PNT-SAM-A54', codigoBarras: '7509876540028', nombre: 'Pantalla Samsung A54', descripcion: 'Pantalla LCD Samsung A54', costoUnitario: 1200, precioVenta: 1800, stock: 3, stockMinimo: 2, garantiaFabricaDias: 90, categoriaId: 'cat-r-1', tallerId: 'taller-1', activo: true, operatorPaymentType: 'FIXED', operatorPaymentValue: 200, tags: JSON.stringify(['Samsung', 'Galaxy', 'Pantalla']) },
    { id: 'pz-3', sku: 'BAT-IP13', codigoBarras: '7509876540035', nombre: 'Batería iPhone 13', descripcion: 'Batería original 3240mAh', costoUnitario: 450, precioVenta: 800, stock: 8, stockMinimo: 3, garantiaFabricaDias: 60, categoriaId: 'cat-r-2', tallerId: 'taller-1', activo: true, operatorPaymentType: 'PERCENTAGE', operatorPaymentValue: 15, tags: JSON.stringify(['Apple', 'iPhone', 'Batería']) },
    { id: 'pz-4', sku: 'PRT-IP13-CG', codigoBarras: '7509876540042', nombre: 'Puerto de Carga iPhone 13', descripcion: 'Flex puerto de carga', costoUnitario: 320, precioVenta: 600, stock: 1, stockMinimo: 3, garantiaFabricaDias: 30, categoriaId: 'cat-r-3', tallerId: 'taller-1', activo: true, operatorPaymentType: 'FIXED', operatorPaymentValue: 100, tags: JSON.stringify(['Apple', 'iPhone', 'Puerto']) },
    { id: 'pz-5', sku: 'BAT-SAM-A54', codigoBarras: '7509876540059', nombre: 'Batería Samsung A54', descripcion: 'Batería 5000mAh', costoUnitario: 380, precioVenta: 700, stock: 0, stockMinimo: 2, garantiaFabricaDias: 60, categoriaId: 'cat-r-2', tallerId: 'taller-1', activo: true, operatorPaymentType: 'PERCENTAGE', operatorPaymentValue: 15, tags: JSON.stringify(['Samsung', 'Galaxy', 'Batería']) },
  ];
  for (const p of piezas) {
    await prisma.pieza.create({ data: p });
  }
  console.log('  + 5 piezas');

  // ============================================================
  // 8. VENTAS + VENTA ITEMS — replicar VENTAS_SEMILLA
  // ============================================================
  console.log('[seed] Ventas...');
  const ventas = [
    { id: 'ven-1', folio: 'V-001A2B', tallerId: 'taller-1', clienteId: 'cli-1', vendedorId: 'u-vend-1', operarioId: null, subtotal: 18248, total: 18248, metodoPago: 'Tarjeta', estado: 'COMPLETADA', createdAt: fechaHoy(2), items: [
      { id: 'vi-1', productoId: 'prod-1', cantidad: 1, precioUnitario: 17999, subtotal: 17999 },
      { id: 'vi-2', productoId: 'prod-3', cantidad: 1, precioUnitario: 249, subtotal: 249 },
    ] },
    { id: 'ven-2', folio: 'V-002B3C', tallerId: 'taller-1', clienteId: 'cliente-general', vendedorId: 'u-vend-1', operarioId: null, subtotal: 698, total: 698, metodoPago: 'Efectivo', estado: 'COMPLETADA', createdAt: fechaHoy(4), items: [
      { id: 'vi-3', productoId: 'prod-5', cantidad: 2, precioUnitario: 349, subtotal: 698 },
    ] },
    { id: 'ven-3', folio: 'V-003C4D', tallerId: 'taller-1', clienteId: 'cli-2', vendedorId: 'u-vend-1', operarioId: null, subtotal: 9098, total: 9098, metodoPago: 'Transferencia', estado: 'COMPLETADA', createdAt: fechaHoy(6), items: [
      { id: 'vi-4', productoId: 'prod-2', cantidad: 1, precioUnitario: 8999, subtotal: 8999 },
      { id: 'vi-5', productoId: 'prod-4', cantidad: 1, precioUnitario: 99, subtotal: 99 },
    ] },
  ];
  for (const v of ventas) {
    const { items, ...ventaData } = v;
    await prisma.venta.create({
      data: { ...ventaData, items: { create: items } },
    });
  }
  console.log('  + 3 ventas (con sus items)');

  // ============================================================
  // 9. MOVIMIENTOS — replicar MOVIMIENTOS_SEMILLA
  // ============================================================
  console.log('[seed] Movimientos...');
  const movimientos = [
    { id: 'mov-1', tallerId: 'taller-1', tipo: 'INGRESO', concepto: 'Venta V-001A2B', monto: 18248, categoria: 'Venta de productos', usuarioId: 'u-vend-1', ventaId: 'ven-1', fecha: fechaHoy(2) },
    { id: 'mov-2', tallerId: 'taller-1', tipo: 'INGRESO', concepto: 'Venta V-002B3C', monto: 698, categoria: 'Venta de productos', usuarioId: 'u-vend-1', ventaId: 'ven-2', fecha: fechaHoy(4) },
    { id: 'mov-3', tallerId: 'taller-1', tipo: 'INGRESO', concepto: 'Venta V-003C4D', monto: 9098, categoria: 'Venta de productos', usuarioId: 'u-vend-1', ventaId: 'ven-3', fecha: fechaHoy(6) },
    { id: 'mov-4', tallerId: 'taller-1', tipo: 'GASTO', concepto: 'Renta del local', monto: 8000, categoria: 'Renta', usuarioId: 'u-admin-1', fecha: fechaHoy(8) },
    { id: 'mov-5', tallerId: 'taller-1', tipo: 'GASTO', concepto: 'Papelería', monto: 350, categoria: 'Papelería', usuarioId: 'u-admin-1', fecha: fechaHoy(3) },
    { id: 'mov-6', tallerId: 'taller-1', tipo: 'COMPRA', concepto: 'Compra de inventario C-001', monto: 5000, categoria: 'Inventario', usuarioId: 'u-admin-1', fecha: fechaHoy(24) },
  ];
  for (const m of movimientos) {
    await prisma.movimiento.create({ data: m });
  }
  console.log('  + 6 movimientos');

  // ============================================================
  // 10. PEDIDOS INTERNOS — replicar PEDIDOS_SEMILLA
  // ============================================================
  console.log('[seed] Pedidos...');
  const pedidos = [
    { id: 'ped-1', folio: 'P-001', tallerId: 'taller-1', solicitanteId: 'u-vend-1', descripcion: '5x Pantalla Samsung A54 (urgente, sin stock)', cantidad: 5, urgencia: 'ALTA', estado: 'PENDIENTE', createdAt: fechaHoy(2) },
    { id: 'ped-2', folio: 'P-002', tallerId: 'taller-1', solicitanteId: 'u-vend-1', descripcion: 'Licencias Windows 11 Pro x10', cantidad: 10, urgencia: 'MEDIA', estado: 'PENDIENTE', createdAt: fechaHoy(1) },
  ];
  for (const p of pedidos) {
    await prisma.pedidoInterno.create({ data: p });
  }
  console.log('  + 2 pedidos');

  // ============================================================
  // 11. GARANTÍAS — replicar GARANTIAS_SEMILLA (adaptado)
  // ============================================================
  console.log('[seed] Garantías...');
  const garantias = [
    {
      id: 'gar-1', folio: 'G-001P1', tallerId: 'taller-1', clienteId: 'cli-2',
      ventaId: null, servicioId: null,
      tipo: 'SERVICIO', fechaInicio: fechaHoy(1), duracionDias: 90,
      fechaVencimiento: addDays(fechaHoy(1), 90),
      descripcionCobertura: 'Garantía por servicio. Cubre reaparición del problema dentro del período.',
      estado: 'ACTIVA', emitidaPorId: 'u-vend-1', createdAt: fechaHoy(1),
    },
    {
      id: 'gar-2', folio: 'G-002P2', tallerId: 'taller-1', clienteId: 'cli-1',
      ventaId: 'ven-1', servicioId: null,
      tipo: 'PRODUCTO', fechaInicio: fechaHoy(2), duracionDias: 30,
      fechaVencimiento: addDays(fechaHoy(2), 30),
      descripcionCobertura: 'Garantía de producto por defectos de fabricación.',
      estado: 'ACTIVA', emitidaPorId: 'u-vend-1', createdAt: fechaHoy(2),
    },
  ];
  for (const g of garantias) {
    await prisma.garantia.create({ data: g });
  }
  console.log('  + 2 garantías');

  // ============================================================
  // 12. COMMISSION ENTRIES + OPERATOR PAYMENT
  // ============================================================
  console.log('[seed] Comisiones y pagos...');
  const pago = await prisma.operatorPayment.create({
    data: {
      id: 'op-pay-1', folio: 'OP-001', operarioId: 'op-2', tallerId: 'taller-1',
      amount: 40, date: fechaHoy(4), paidAt: fechaHoy(3), paidById: 'u-admin-1',
      status: 'PAID', notas: 'Pago diario — venta en mostrador',
    },
  });
  const comisiones = [
    { id: 'ce-1', operarioId: 'op-2', tallerId: 'taller-1', ventaId: 'ven-1', ventaItemProductoId: 'prod-1', amount: 269.99, type: 'SALE', description: 'Comisión 1.5% — iPhone 13 128GB (V-001A2B)', estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(2) },
    { id: 'ce-2', operarioId: 'op-2', tallerId: 'taller-1', ventaId: 'ven-1', ventaItemProductoId: 'prod-3', amount: 15, type: 'SALE', description: 'Comisión fija — Funda iPhone 13 (V-001A2B)', estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(2) },
    { id: 'ce-3', operarioId: 'op-2', tallerId: 'taller-1', ventaId: 'ven-2', ventaItemProductoId: 'prod-5', amount: 40, type: 'SALE', description: 'Comisión fija x2 — Cargador USB-C 20W (V-002B3C)', estado: 'ACTIVE', operatorPaymentId: pago.id, createdAt: fechaHoy(4) },
    { id: 'ce-4', operarioId: 'op-2', tallerId: 'taller-1', ventaId: 'ven-3', ventaItemProductoId: 'prod-2', amount: 169.85, type: 'SALE', description: 'Comisión 2% (proporcional) — Samsung Galaxy A54 (V-003C4D)', estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(6) },
    { id: 'ce-5', operarioId: 'op-2', tallerId: 'taller-1', ventaId: 'ven-3', ventaItemProductoId: 'prod-4', amount: 9.45, type: 'SALE', description: 'Comisión fija (proporcional) — Vidrio Templado (V-003C4D)', estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(6) },
    { id: 'ce-6', operarioId: 'op-1', tallerId: 'taller-1', ventaId: null, servicioId: null, amount: 100, type: 'SERVICE', description: 'Comisión fija — Desbloqueo FRP (servicio demo)', estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(1) },
  ];
  for (const c of comisiones) {
    await prisma.commissionEntry.create({ data: c });
  }
  console.log('  + 1 pago, 6 comisiones');

  // ============================================================
  // 13. CONFIGURACIÓN
  // ============================================================
  console.log('[seed] Configuración...');
  await prisma.configuracionGlobal.create({
    data: { id: 'config-global', moneda: 'USD', pais: 'Cuba', tipoCambio: 650, syncEnabled: false, syncInterval: 5 },
  });
  console.log('  + configuración (1 USD = 650 CUP)');

  // ============================================================
  // RESUMEN
  // ============================================================
  console.log('\n[seed] Resumen:');
  for (const m of ['taller','usuario','operario','cliente','categoria','producto','pieza','venta','ventaItem','movimiento','pedidoInterno','garantia','commissionEntry','operatorPayment']) {
    const n = await prisma[m].count();
    console.log('  -', m.padEnd(20), n, 'registros');
  }
  console.log('\n[seed] OK — usuarios demo:');
  console.log('  superadmin@tereparo.mx / admin123  (SUPER_ADMIN)');
  console.log('  admin.centro@tereparo.mx / admin123  (ADMIN, taller-1)');
  console.log('  admin.norte@tereparo.mx  / admin123  (ADMIN, taller-2)');
  console.log('  vendedor@tereparo.mx    / vendedor123 (VENDEDOR, taller-1)');
}

main()
  .catch((e) => {
    console.error('[seed] ERROR:', e.message);
    if (e.code === 'P2003') {
      console.error('[seed] FK violation en:', e.meta?.field_name || 'campo desconocido');
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
