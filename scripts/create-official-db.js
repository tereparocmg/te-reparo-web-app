// ============================================================
// Te Reparo Manager — Crear base de datos oficial te-reparo-db.db
// ============================================================
// Fuentes:
//   1. custom.db (upload/custom.db) → Te Reparo - República
//   2. products LA CARIDAD.csv (upload/products LA CARIDAD.csv) → Te Reparo - La Caridad
//
// El script:
//   - Crea te-reparo-db.db con el schema de Te Reparo Manager.
//   - Crea 2 talleres oficiales.
//   - Crea usuarios con credenciales reales.
//   - Crea operarios (vendedores, electrónicos, informáticos) por taller.
//   - Migra productos, piezas, ventas, movimientos de custom.db → taller República.
//   - Importa productos y piezas del CSV → taller La Caridad.
//   - Limpia datos: descripciones vacías → coherentes, tags → auto-generados.
// ============================================================

const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

require('dotenv').config({ override: true });

// Apuntar Prisma a la DB oficial
const TARGET_DB = path.join(__dirname, '..', 'te-reparo-db.db');
if (fs.existsSync(TARGET_DB)) fs.unlinkSync(TARGET_DB);

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${TARGET_DB}` } },
});

function toBool(v) {
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  if (v === false || v === 0 || v === '0' || v === 'false') return false;
  return false;
}

function tsToDate(v) {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d) ? new Date() : d; }
  return new Date();
}

function genId(prefix) {
  return `${prefix}-${crypto.randomUUID().substring(0, 8)}`;
}

function genFolio(prefix) {
  const ts = Date.now().toString(36).toUpperCase().slice(-6);
  const rnd = crypto.randomUUID().substring(0, 4).toUpperCase();
  return `${prefix}-${ts}${rnd}`;
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (values[i] || '').trim());
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = '';
    } else { current += char; }
  }
  result.push(current);
  return result;
}

function genTags(name, group) {
  const tags = [];
  if (group) {
    const parts = group.split('/');
    parts.forEach(p => { if (p && p.length > 1) tags.push(p.toUpperCase()); });
  }
  // Extraer marca del nombre
  const marcas = ['APPLE', 'SAMSUNG', 'XIAOMI', 'HUAWEI', 'MOTOROLA', 'OPPO', 'LENOVO', 'JBL', 'SONY', 'BOSE', 'HP', 'ASUS', 'INFINIX', 'NOTHING', 'ONEPLUS', 'REALME', 'CUBOT', 'ZTE', 'G-TIDE', 'HAYLOU', 'AIWA', 'BEATS'];
  const upperName = name.toUpperCase();
  marcas.forEach(m => { if (upperName.includes(m) && !tags.includes(m)) tags.push(m); });
  if (tags.length === 0) tags.push('GENERAL');
  return JSON.stringify(tags);
}

function genDescription(name, group) {
  if (!name) return 'Producto sin nombre';
  const parts = group ? group.split('/') : [];
  const cat = parts.length > 1 ? parts[parts.length - 1] : (parts[0] || 'General');
  return `${name}. Categoría: ${cat}. Producto de venta al público.`;
}

function genPiezaDescription(name, group) {
  if (!name) return 'Pieza sin nombre';
  return `${name}. Pieza de reparación para uso interno del taller.`;
}

async function main() {
  console.log('=== Creando base de datos oficial te-reparo-db.db ===\n');

  // Aplicar schema
  console.log('[0] Aplicando schema a te-reparo-db.db...');
  const { execSync } = require('child_process');
  execSync(`npx prisma db push --skip-generate --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: `file:${TARGET_DB}` },
    stdio: 'pipe',
  });
  console.log('  Schema aplicado.');

  // ============================================================
  // 1. TALLERES
  // ============================================================
  console.log('\n[1] Creando talleres...');
  await prisma.taller.create({ data: {
    id: 'taller-republica', nombre: 'Te Reparo -- República',
    direccion: 'República esquina San Martin', telefono: '', activo: true,
    metodosPago: 'Efectivo,Tarjeta,Transferencia',
  }});
  await prisma.taller.create({ data: {
    id: 'taller-caridad', nombre: 'Te Reparo -- La Caridad',
    direccion: 'Avenida de la Caridad #27', telefono: '', activo: true,
    metodosPago: 'Efectivo,Tarjeta,Transferencia',
  }});
  console.log('  + 2 talleres: República, La Caridad');

  // ============================================================
  // 2. USUARIOS
  // ============================================================
  console.log('\n[2] Creando usuarios...');
  const usuarios = [
    { id: 'u-super', email: 'superadmin@tereparo.com', password: 'SuperAdmin.2026*', nombre: 'Super Administrador', rol: 'SUPER_ADMIN', telefono: '', tallerIds: ['taller-republica', 'taller-caridad'] },
    { id: 'u-admin-rep', email: 'admin.republica@tereparo.com', password: 'Admin.2026*', nombre: 'Admin República', rol: 'ADMIN', telefono: '', tallerIds: ['taller-republica'] },
    { id: 'u-vend-rep', email: 'vendedor.republica@tereparo.com', password: 'Vendedor.2026*', nombre: 'Vendedor República', rol: 'VENDEDOR', telefono: '', tallerIds: ['taller-republica'] },
    { id: 'u-admin-car', email: 'admin.lacaridad@tereparo.com', password: 'Admin.2026*', nombre: 'Admin La Caridad', rol: 'ADMIN', telefono: '', tallerIds: ['taller-caridad'] },
    { id: 'u-vend-car', email: 'vendedor.lacaridad@tereparo.com', password: 'Vendedor.2026*', nombre: 'Vendedor La Caridad', rol: 'VENDEDOR', telefono: '', tallerIds: ['taller-caridad'] },
  ];
  for (const u of usuarios) {
    const { tallerIds, ...data } = u;
    await prisma.usuario.create({ data: {
      ...data, activo: true, email: data.email.toLowerCase(),
      talleres: { create: tallerIds.map(tallerId => ({ tallerId })) },
    }});
  }
  console.log(`  + ${usuarios.length} usuarios con credenciales reales`);

  // ============================================================
  // 3. CLIENTE GENERAL
  // ============================================================
  await prisma.cliente.create({ data: { id: 'cliente-general', nombre: 'Cliente General', esClienteGeneral: true } });

  // ============================================================
  // 4. OPERARIOS
  // ============================================================
  console.log('\n[3] Creando operarios...');
  const operarios = [
    // República
    { id: 'op-rep-vend-1', nombre: 'Lili', especialidad: 'VENDEDOR', tallerId: 'taller-republica' },
    { id: 'op-rep-vend-2', nombre: 'Jonathan', especialidad: 'VENDEDOR', tallerId: 'taller-republica' },
    { id: 'op-rep-elec-1', nombre: 'Michel', especialidad: 'ELECTRONICA', tallerId: 'taller-republica' },
    { id: 'op-rep-elec-2', nombre: 'Raul', especialidad: 'ELECTRONICA', tallerId: 'taller-republica' },
    { id: 'op-rep-info-1', nombre: 'Juan', especialidad: 'INFORMATICA', tallerId: 'taller-republica' },
    { id: 'op-rep-info-2', nombre: 'Wilber', especialidad: 'INFORMATICA', tallerId: 'taller-republica' },
    { id: 'op-rep-admin-1', nombre: 'Admin República', especialidad: 'ADMIN', tallerId: 'taller-republica' },
    // La Caridad
    { id: 'op-car-vend-1', nombre: 'Iván', especialidad: 'VENDEDOR', tallerId: 'taller-caridad' },
    { id: 'op-car-vend-2', nombre: 'Andrew', especialidad: 'VENDEDOR', tallerId: 'taller-caridad' },
    { id: 'op-car-elec-1', nombre: 'Electrónico', especialidad: 'ELECTRONICA', tallerId: 'taller-caridad' },
    { id: 'op-car-info-1', nombre: 'Danilo', especialidad: 'INFORMATICA', tallerId: 'taller-caridad' },
    { id: 'op-car-admin-1', nombre: 'Admin La Caridad', especialidad: 'ADMIN', tallerId: 'taller-caridad' },
  ];
  for (const o of operarios) {
    await prisma.operario.create({ data: { id: o.id, nombre: o.nombre, especialidad: o.especialidad, activo: true } });
  }
  console.log(`  + ${operarios.length} operarios (${operarios.length / 2} por taller)`);

  // ============================================================
  // 5. CONFIGURACIÓN
  // ============================================================
  console.log('\n[4] Configuración global...');
  await prisma.configuracionGlobal.create({ data: {
    id: 'config-global', moneda: 'USD', pais: 'Cuba', tipoCambio: 650,
    syncEnabled: false, syncInterval: 5,
    adminPaymentType: 'PERCENTAGE', adminPaymentValue: 3,
    vendedorCommissionType: 'PERCENTAGE', vendedorCommissionValue: 1.5,
  }});
  console.log('  + Configuración global (1 USD = 650 CUP, vendedor 1.5%, admin 3%)');

  // ============================================================
  // 6. MIGRAR DATOS DE custom.db → TALLER REPÚBLICA
  // ============================================================
  console.log('\n[5] Migrando datos de custom.db → Taller República...');
  const customDbPath = path.join(__dirname, '..', 'upload', 'custom.db');
  if (fs.existsSync(customDbPath)) {
    const source = new Database(customDbPath, { readonly: true });
    const TALLER_R = 'taller-republica';

    // Categorías
    const cats = source.prepare('SELECT * FROM categorias').all();
    let catMap = {};
    for (const c of cats) {
      const newId = genId('cat');
      try {
        await prisma.categoria.create({ data: {
          id: newId, nombre: c.nombre || 'Sin nombre', tipo: c.tipo || 'PRODUCTO',
          activa: toBool(c.activa), tallerId: TALLER_R,
        }});
        catMap[c.id] = newId;
      } catch (e) {}
    }
    console.log(`  + Categorías: ${Object.keys(catMap).length}`);

    // Productos
    const prods = source.prepare('SELECT * FROM productos').all();
    let prodMap = {};
    for (const p of prods) {
      const newId = genId('prod');
      try {
        await prisma.producto.create({ data: {
          id: newId, sku: p.sku || newId, codigoBarras: p.codigoBarras || newId,
          nombre: p.nombre || 'Producto sin nombre',
          descripcion: p.descripcion || genDescription(p.nombre, ''),
          precioCosto: p.precioCosto || 0, precioVenta: p.precioVenta || 0,
          stock: p.stock || 0, stockMinimo: p.stockMinimo || 5,
          garantiaDias: p.garantiaDias || 0,
          categoriaId: catMap[p.categoriaId] || null,
          tallerId: TALLER_R, activo: toBool(p.activo),
          operatorCommissionType: p.operatorCommissionType || null,
          operatorCommissionValue: p.operatorCommissionValue ?? null,
          tags: p.tags || genTags(p.nombre, ''),
        }});
        prodMap[p.id] = newId;
      } catch (e) {}
    }
    console.log(`  + Productos: ${Object.keys(prodMap).length}`);

    // Piezas
    const pzs = source.prepare('SELECT * FROM piezas').all();
    let pzMap = {};
    for (const p of pzs) {
      const newId = genId('pz');
      try {
        await prisma.pieza.create({ data: {
          id: newId, sku: p.sku || newId, codigoBarras: p.codigoBarras || newId,
          nombre: p.nombre || 'Pieza sin nombre',
          descripcion: p.descripcion || genPiezaDescription(p.nombre, ''),
          costoUnitario: p.costoUnitario || 0, precioVenta: p.precioVenta || 0,
          stock: p.stock || 0, stockMinimo: p.stockMinimo || 5,
          garantiaFabricaDias: p.garantiaFabricaDias || 30,
          categoriaId: catMap[p.categoriaId] || null,
          tallerId: TALLER_R, activo: toBool(p.activo),
          operatorPaymentType: p.operatorPaymentType || null,
          operatorPaymentValue: p.operatorPaymentValue ?? null,
          tags: p.tags || genTags(p.nombre, ''),
        }});
        pzMap[p.id] = newId;
      } catch (e) {}
    }
    console.log(`  + Piezas: ${Object.keys(pzMap).length}`);

    // Clientes
    const cls = source.prepare('SELECT * FROM clientes').all();
    let cliMap = {};
    for (const c of cls) {
      if (c.id === 'cliente-general') { cliMap[c.id] = 'cliente-general'; continue; }
      const newId = genId('cli');
      try {
        await prisma.cliente.create({ data: {
          id: newId, nombre: c.nombre || 'Cliente', telefono: c.telefono || null,
          email: c.email || null, tipo: c.tipo || 'PERSONA_NATURAL',
          rfc: c.rfc || null, direccion: c.direccion || null, esClienteGeneral: false,
        }});
        cliMap[c.id] = newId;
      } catch (e) {}
    }
    console.log(`  + Clientes: ${Object.keys(cliMap).length}`);

    // Ventas + Items
    const vents = source.prepare('SELECT * FROM ventas').all();
    let venCount = 0;
    for (const v of vents) {
      const newVenId = genId('ven');
      const folio = v.folio || genFolio('V');
      try {
        await prisma.venta.create({ data: {
          id: newVenId, folio, tallerId: TALLER_R,
          clienteId: cliMap[v.clienteId] || 'cliente-general',
          vendedorId: 'u-vend-rep', operarioId: null,
          subtotal: v.subtotal || 0, total: v.total || 0,
          metodoPago: v.metodoPago || 'Efectivo', estado: v.estado || 'COMPLETADA',
          createdAt: tsToDate(v.createdAt),
        }});
        // Items
        const items = source.prepare('SELECT * FROM venta_items WHERE ventaId = ?').all(v.id);
        for (const vi of items) {
          try {
            await prisma.ventaItem.create({ data: {
              ventaId: newVenId, productoId: prodMap[vi.productoId] || vi.productoId,
              cantidad: vi.cantidad || 1, precioUnitario: vi.precioUnitario || 0,
              subtotal: vi.subtotal || 0,
            }});
          } catch (e) {}
        }
        venCount++;
      } catch (e) {}
    }
    console.log(`  + Ventas: ${venCount} (con items)`);

    // Movimientos
    const movs = source.prepare('SELECT * FROM movimientos').all();
    let movCount = 0;
    for (const m of movs) {
      try {
        await prisma.movimiento.create({ data: {
          id: genId('mov'), tallerId: TALLER_R, tipo: m.tipo || 'INGRESO',
          concepto: m.concepto || 'Movimiento', monto: m.monto || 0,
          categoria: m.categoria || null, usuarioId: 'u-admin-rep',
          fecha: tsToDate(m.fecha),
        }});
        movCount++;
      } catch (e) {}
    }
    console.log(`  + Movimientos: ${movCount}`);

    source.close();
  } else {
    console.log('  (custom.db no encontrado, saltando)');
  }

  // ============================================================
  // 7. IMPORTAR DATOS DEL CSV → TALLER LA CARIDAD
  // ============================================================
  console.log('\n[6] Importando datos del CSV → Taller La Caridad...');
  const csvPath = path.join(__dirname, '..', 'upload', 'products LA CARIDAD.csv');
  if (fs.existsSync(csvPath)) {
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvText);
    const TALLER_C = 'taller-caridad';

    // Crear categorías de productos basadas en subcategorías del CSV
    let catProdMap = {};
    let catPzMap = {};

    // Categorías de productos (de grupos "Venta/")
    const prodGroups = new Set();
    const pzGroups = new Set();
    for (const r of rows) {
      if (r.IsService === '1') continue; // Saltar servicios
      const group = r.ProductGroup || '';
      if (group.startsWith('Venta/')) {
        const parts = group.split('/');
        const catName = parts[1] || 'General';
        prodGroups.add(catName);
      } else if (group === 'Electronica' || group.startsWith('Electronica/')) {
        pzGroups.add('Electrónica');
      } else if (group === 'Software') {
        prodGroups.add('Software');
      } else if (group === 'COMPONENTES PC' || group.startsWith('COMPONENTES PC/')) {
        prodGroups.add('Componentes PC');
      }
    }

    // Crear categorías de productos
    for (const name of prodGroups) {
      const id = genId('cat');
      try {
        await prisma.categoria.create({ data: { id, nombre: name.toUpperCase(), tipo: 'PRODUCTO', activa: true, tallerId: TALLER_C } });
        catProdMap[name] = id;
      } catch (e) {}
    }
    // Crear categorías de piezas
    for (const name of pzGroups) {
      const id = genId('cat');
      try {
        await prisma.categoria.create({ data: { id, nombre: name.toUpperCase(), tipo: 'PIEZA', activa: true, tallerId: TALLER_C } });
        catPzMap[name] = id;
      } catch (e) {}
    }
    console.log(`  + Categorías productos: ${Object.keys(catProdMap).length}, piezas: ${Object.keys(catPzMap).length}`);

    // Importar productos y piezas
    let prodCount = 0, pzCount = 0;
    for (const r of rows) {
      if (r.IsService === '1') continue; // Saltar servicios
      const name = (r.Name || '').trim().replace(/^"|"$/g, '');
      if (!name) continue;

      const group = (r.ProductGroup || '').trim();
      const sku = (r.SKU || '').trim() || genId('SKU');
      const barcode = (r.Barcode || '').trim() || genId('BC');
      const cost = parseFloat(r.Cost) || 0;
      const price = parseFloat(r.Price) || 0;
      const stock = parseInt(r.Quantity) || 0;
      const desc = (r.Description || '').trim() || '';
      const enabled = r.IsEnabled !== '0';

      if (group.startsWith('Venta/') || group === 'Software' || group.startsWith('COMPONENTES PC')) {
        // PRODUCTO
        const parts = group.split('/');
        const catName = parts[1] || (group === 'Software' ? 'Software' : 'Componentes PC');
        const catId = catProdMap[catName];
        try {
          await prisma.producto.create({ data: {
            id: genId('prod'), sku, codigoBarras: barcode,
            nombre: name, descripcion: desc || genDescription(name, group),
            precioCosto: cost, precioVenta: price,
            stock: Math.max(0, stock), stockMinimo: 5,
            garantiaDias: 30, categoriaId: catId || null,
            tallerId: TALLER_C, activo: enabled,
            operatorCommissionType: null, operatorCommissionValue: null,
            tags: genTags(name, group),
          }});
          prodCount++;
        } catch (e) {}
      } else if (group === 'Electronica' || group.startsWith('Electronica/')) {
        // PIEZA
        const catId = catPzMap['Electrónica'];
        try {
          await prisma.pieza.create({ data: {
            id: genId('pz'), sku, codigoBarras: barcode,
            nombre: name, descripcion: desc || genPiezaDescription(name, group),
            costoUnitario: cost, precioVenta: price,
            stock: Math.max(0, stock), stockMinimo: 5,
            garantiaFabricaDias: 30, categoriaId: catId || null,
            tallerId: TALLER_C, activo: enabled,
            operatorPaymentType: null, operatorPaymentValue: null,
            tags: genTags(name, group),
          }});
          pzCount++;
        } catch (e) {}
      }
    }
    console.log(`  + Productos: ${prodCount}, Piezas: ${pzCount}`);
  } else {
    console.log('  (CSV no encontrado, saltando)');
  }

  // ============================================================
  // 8. RESUMEN FINAL
  // ============================================================
  console.log('\n=== BASE DE DATOS OFICIAL CREADA ===');
  console.log(`Archivo: ${TARGET_DB}`);
  console.log(`Tamaño: ${(fs.statSync(TARGET_DB).size / 1024 / 1024).toFixed(1)} MB`);
  console.log('');
  console.log('Talleres:', await prisma.taller.count());
  console.log('Usuarios:', await prisma.usuario.count());
  console.log('Operarios:', await prisma.operario.count());
  console.log('Clientes:', await prisma.cliente.count());
  console.log('Categorías:', await prisma.categoria.count());
  console.log('Productos:', await prisma.producto.count());
  console.log('Piezas:', await prisma.pieza.count());
  console.log('Ventas:', await prisma.venta.count());
  console.log('Movimientos:', await prisma.movimiento.count());
  console.log('');
  console.log('Credenciales:');
  console.log('  superadmin@tereparo.com / SuperAdmin.2026*');
  console.log('  admin.republica@tereparo.com / Admin.2026*');
  console.log('  vendedor.republica@tereparo.com / Vendedor.2026*');
  console.log('  admin.lacaridad@tereparo.com / Admin.2026*');
  console.log('  vendedor.lacaridad@tereparo.com / Vendedor.2026*');

  await prisma.$disconnect();
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
