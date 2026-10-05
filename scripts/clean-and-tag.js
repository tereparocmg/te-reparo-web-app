require('dotenv').config({ override: true });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const SERVICIO_PALABRAS = [
  'FLASHEO', 'DESBLOQUEO', 'CAMBIO DE', 'ARREGLO', 'INSTALACION', 'INSTALACIÓN',
  'REPARACION', 'REPARACIÓN', 'ABRIR', 'MANO OBRA', 'MANO DE OBRA',
  'ACTIVACION', 'ACTIVACIÓN', 'LIMPIEZA', 'SOLDADURA', 'DIAGNOSTICO',
  'DIAGNÓSTICO', 'RECUPERACION', 'RECUPERACIÓN', 'FORMATEO',
  'RESTAURACION', 'RESTAURACIÓN', 'CONFIGURACION', 'CONFIGURACIÓN',
  'PINTURA', 'LIBERACION', 'LIBERACIÓN', 'ROOT', 'UNBRICK', 'FRP',
  'ICLOUD', 'ACTIVAR', 'PROGRAMACION', 'PROGRAMACIÓN'
];

function esServicio(nombre) {
  const upper = (nombre || '').toUpperCase();
  return SERVICIO_PALABRAS.some(palabra => upper.includes(palabra));
}

function genTags(nombre, categoria) {
  const tags = [];
  const upper = (nombre || '').toUpperCase();
  const marcas = ['APPLE','SAMSUNG','XIAOMI','HUAWEI','MOTOROLA','OPPO','LENOVO','JBL','SONY','BOSE','HP','ASUS','INFINIX','NOTHING','ONEPLUS','REALME','CUBOT','ZTE','G-TIDE','HAYLOU','AIWA','BEATS','ALCATEL','TCL','BISON','BLACKVIEW','CRICKET','GRAND PRIME','HTC','HYUNDAI','REDMI','GALAXY','IPHONE','IPAD','MACBOOK'];
  marcas.forEach(m => { if (upper.includes(m) && !tags.includes(m)) tags.push(m); });
  if (categoria) tags.push(categoria.toUpperCase());
  if (tags.length === 0) tags.push('GENERAL');
  return JSON.stringify(tags);
}

async function main() {
  console.log('=== Limpiando servicios y agregando tags ===\n');

  // 1. Eliminar productos que son servicios
  const prodServicios = await p.producto.findMany({ select: { id: true, nombre: true } });
  const prodToDelete = prodServicios.filter(p => esServicio(p.nombre));
  console.log(`Productos que son servicios: ${prodToDelete.length}`);
  prodToDelete.slice(0, 10).forEach(p => console.log('  -', p.nombre));
  if (prodToDelete.length > 10) console.log(`  ... y ${prodToDelete.length - 10} más`);

  if (prodToDelete.length > 0) {
    const r1 = await p.producto.deleteMany({ where: { id: { in: prodToDelete.map(p => p.id) } } });
    console.log(`  → Eliminados: ${r1.count} productos`);
  }

  // 2. Eliminar piezas que son servicios
  const pzServicios = await p.pieza.findMany({ select: { id: true, nombre: true } });
  const pzToDelete = pzServicios.filter(p => esServicio(p.nombre));
  console.log(`\nPiezas que son servicios: ${pzToDelete.length}`);
  pzToDelete.slice(0, 10).forEach(p => console.log('  -', p.nombre));
  if (pzToDelete.length > 10) console.log(`  ... y ${pzToDelete.length - 10} más`);

  if (pzToDelete.length > 0) {
    const r2 = await p.pieza.deleteMany({ where: { id: { in: pzToDelete.map(p => p.id) } } });
    console.log(`  → Eliminados: ${r2.count} piezas`);
  }

  // 3. Agregar tags a productos que no tienen
  const prodSinTags = await p.producto.findMany({
    where: { tags: { in: ['[]', ''] } },
    select: { id: true, nombre: true, categoriaId: true }
  });
  console.log(`\nProductos sin tags: ${prodSinTags.length}`);
  
  // Obtener nombres de categorías
  const cats = await p.categoria.findMany({ select: { id: true, nombre: true } });
  const catMap = {};
  cats.forEach(c => catMap[c.id] = c.nombre);

  let prodTagged = 0;
  for (const prod of prodSinTags) {
    const tags = genTags(prod.nombre, catMap[prod.categoriaId]);
    await p.producto.update({ where: { id: prod.id }, data: { tags } });
    prodTagged++;
  }
  console.log(`  → Tags agregados a ${prodTagged} productos`);

  // 4. Agregar tags a piezas que no tienen
  const pzSinTags = await p.pieza.findMany({
    where: { tags: { in: ['[]', ''] } },
    select: { id: true, nombre: true, categoriaId: true }
  });
  console.log(`\nPiezas sin tags: ${pzSinTags.length}`);

  let pzTagged = 0;
  for (const pz of pzSinTags) {
    const tags = genTags(pz.nombre, catMap[pz.categoriaId]);
    await p.pieza.update({ where: { id: pz.id }, data: { tags } });
    pzTagged++;
  }
  console.log(`  → Tags agregados a ${pzTagged} piezas`);

  // Resumen
  console.log('\n=== RESUMEN FINAL ===');
  console.log('Productos restantes:', await p.producto.count());
  console.log('Piezas restantes:', await p.pieza.count());
  const prodConTags = await p.producto.count({ where: { tags: { notIn: ['[]', ''] } } });
  const pzConTags = await p.pieza.count({ where: { tags: { notIn: ['[]', ''] } } });
  console.log('Productos con tags:', prodConTags);
  console.log('Piezas con tags:', pzConTags);

  await p.$disconnect();
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
