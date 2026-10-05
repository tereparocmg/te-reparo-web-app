// ============================================================
// Te Reparo Manager — Portable Build Script
// ============================================================
// Genera una carpeta `dist/portable/` lista para distribuir.
// El usuario final solo descomprime y hace doble clic en:
//   - start.bat       (Windows)
//   - start.command   (macOS)
//   - start.sh        (Linux)
//
// El launcher abre la app en el navegador por defecto.
//
// Uso:
//   node scripts/build-portable.js                      # sin Node.js bundled
//   node scripts/build-portable.js --with-node win      # bundled para Windows
//   node scripts/build-portable.js --with-node mac      # bundled para macOS
//   node scripts/build-portable.js --with-node linux    # bundled para Linux
//   node scripts/build-portable.js --skip-build         # omitir next build
//                                                          (usa .next ya compilado)
//
// Flags adicionales:
//   --zip                # al final, crea un ZIP en dist/
//   --bundler=webpack    # forzar webpack (default auto: turbopack, fallback webpack)
//
// Output: dist/portable/ (carpeta) + dist/te-reparo-portable[-<os>].zip (opcional)
// ============================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORTABLE_DIR = path.join(DIST, 'portable');

// ============================================================
// Parse args
// ============================================================
const args = process.argv.slice(2);
let withNode = null;
let makeZip = false;
let skipBuild = false;
let forceBundler = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--with-node' && args[i + 1]) {
    withNode = args[i + 1];
    i++;
  } else if (args[i] === '--zip') {
    makeZip = true;
  } else if (args[i] === '--skip-build') {
    skipBuild = true;
  } else if (args[i].startsWith('--bundler=')) {
    forceBundler = args[i].split('=')[1];
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log('Uso: node scripts/build-portable.js [--with-node win|mac|linux] [--zip] [--skip-build] [--bundler=turbopack|webpack]');
    process.exit(0);
  }
}

if (withNode && !['win', 'mac', 'linux'].includes(withNode)) {
  console.error('--with-node debe ser: win, mac, o linux');
  process.exit(1);
}
if (forceBundler && !['turbopack', 'webpack'].includes(forceBundler)) {
  console.error('--bundler debe ser: turbopack o webpack');
  process.exit(1);
}

// ============================================================
// Helpers
// ============================================================
function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  // Limpiar DATABASE_URL del entorno para evitar conflictos con .env
  const env = { ...process.env, ...opts.env };
  delete env.DATABASE_URL;
  // Memory limit para evitar OOM en máquinas con poca RAM
  if (!env.NODE_OPTIONS) {
    env.NODE_OPTIONS = '--max-old-space-size=4096';
  }
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, env });
}

function tryBuild(bundler) {
  const cmd = bundler === 'webpack'
    ? 'bunx next build --webpack'
    : 'bunx next build';
  try {
    run(cmd);
    return true;
  } catch (e) {
    console.warn(`  (aviso) build con ${bundler} fallo`);
    return false;
  }
}

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (fs.statSync(src).isDirectory()) {
    fs.cpSync(src, dst, { recursive: true });
  } else {
    fs.copyFileSync(src, dst);
  }
  return true;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`  descargando ${url}`);
    const file = fs.createWriteStream(dest);
    const doGet = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          res.resume();
          doGet(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} para ${u}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err) => {
        try { fs.unlinkSync(dest); } catch {}
        reject(err);
      });
    };
    doGet(url);
  });
}

// ============================================================
// Build steps
// ============================================================
async function main() {
  console.log('=== Te Reparo Manager — Portable Build ===\n');

  // 1. Limpiar dist
  console.log('[1/7] Limpiando dist/');
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(PORTABLE_DIR, { recursive: true });

  // 2. Build Next.js standalone
  if (skipBuild) {
    console.log('\n[2/7] SKIP build (--skip-build) — usando .next/ existente');
    if (!fs.existsSync(path.join(ROOT, '.next', 'standalone'))) {
      console.error('  No existe .next/standalone/ — corre sin --skip-build la primera vez');
      process.exit(1);
    }
  } else {
    console.log('\n[2/7] Build Next.js standalone...');
    // Estrategia: intentar turbopack, fallback a webpack.
    // Con memory limit para evitar OOM en máquinas con poca RAM.
    let ok = false;
    if (forceBundler === 'webpack') {
      ok = tryBuild('webpack');
    } else if (forceBundler === 'turbopack') {
      ok = tryBuild('turbopack');
    } else {
      // Auto: turbopack primero, luego webpack
      ok = tryBuild('turbopack');
      if (!ok) {
        console.log('  Reintentando con webpack...');
        ok = tryBuild('webpack');
      }
    }
    if (!ok) {
      console.error('\n[ERROR] Build de Next.js fallo. Sugerencias:');
      console.error('  1. Cierra otras apps para liberar RAM (necesita ~4-6GB)');
      console.error('  2. Probar: node scripts/build-portable.js --bundler=webpack');
      console.error('  3. Probar: NODE_OPTIONS="--max-old-space-size=8192" bunx next build --webpack');
      process.exit(1);
    }
  }

  // 3. Copiar standalone → dist/portable/app/
  console.log('\n[3/7] Copiando app Next.js...');
  const standaloneSrc = path.join(ROOT, '.next', 'standalone');
  if (!fs.existsSync(standaloneSrc)) {
    console.error('No existe .next/standalone/ — el build fallo?');
    process.exit(1);
  }
  fs.cpSync(standaloneSrc, path.join(PORTABLE_DIR, 'app'), { recursive: true });

  // Copiar .next/static y public (no vienen dentro de standalone)
  copyRecursive(
    path.join(ROOT, '.next', 'static'),
    path.join(PORTABLE_DIR, 'app', '.next', 'static')
  );
  copyRecursive(
    path.join(ROOT, 'public'),
    path.join(PORTABLE_DIR, 'app', 'public')
  );

  // 4. Copiar Prisma client (necesario para que el standalone pueda usar SQLite)
  console.log('\n[4/7] Copiando Prisma client...');
  const prismaClientSrc = path.join(ROOT, 'node_modules', '@prisma', 'client');
  const prismaClientDst = path.join(PORTABLE_DIR, 'app', 'node_modules', '@prisma', 'client');
  if (fs.existsSync(prismaClientSrc)) {
    copyRecursive(prismaClientSrc, prismaClientDst);
  }
  const prismaGenSrc = path.join(ROOT, 'node_modules', '.prisma', 'client');
  const prismaGenDst = path.join(PORTABLE_DIR, 'app', 'node_modules', '.prisma', 'client');
  if (fs.existsSync(prismaGenSrc)) {
    copyRecursive(prismaGenSrc, prismaGenDst);
  }

  // 5. Regenerar y copiar la DB seed
  console.log('\n[5/7] Regenerando DB seed...');
  try {
    run('bun run db:reseed');
  } catch (e) {
    console.warn('  (aviso) db:reseed fallo, usando DB existente');
  }
  const dbSrc = path.join(ROOT, 'prisma', 'dev.db');
  const dbDstDir = path.join(PORTABLE_DIR, 'prisma');
  fs.mkdirSync(dbDstDir, { recursive: true });
  copyRecursive(dbSrc, path.join(dbDstDir, 'te-reparo.db'));
  copyRecursive(
    path.join(ROOT, 'prisma', 'schema.prisma'),
    path.join(dbDstDir, 'schema.prisma')
  );

  // 6. Copiar launchers + README
  console.log('\n[6/7] Copiando launchers...');
  copyRecursive(path.join(ROOT, 'scripts', 'start.bat'), path.join(PORTABLE_DIR, 'start.bat'));
  copyRecursive(path.join(ROOT, 'scripts', 'start.command'), path.join(PORTABLE_DIR, 'start.command'));
  copyRecursive(path.join(ROOT, 'scripts', 'start.sh'), path.join(PORTABLE_DIR, 'start.sh'));
  fs.chmodSync(path.join(PORTABLE_DIR, 'start.command'), 0o755);
  fs.chmodSync(path.join(PORTABLE_DIR, 'start.sh'), 0o755);

  // README para el usuario final
  const readmeContent = `Te Reparo Manager
================

Como usar esta app:

1. Descomprime este ZIP en cualquier carpeta de tu PC.

2. Haz doble clic en:
   - Windows:  start.bat
   - macOS:    start.command  (la primera vez quizas debas dar click
               derecho > Abrir para autorizarlo)
   - Linux:    start.sh       (doble clic en tu gestor de archivos,
               o ./start.sh desde terminal)

3. Tu navegador por defecto abrira la app en http://localhost:3000

4. Login inicial:
   - Email:    superadmin@tereparo.mx
   - Password: admin123

5. Cierra la terminal/consola para detener el servidor cuando termines.

---

Tus datos (base de datos SQLite) se guardan en:
   data/te-reparo.db

Si un dia quieres reiniciar la app a su estado inicial, solo borra
ese archivo y la seed se volvera a copiar automaticamente.

---

Problemas comunes:

- "No se encontro Node.js": Necesitas Node.js instalado.
  Descargalo desde https://nodejs.org (version LTS recomendada).
  O usa la version "portable con Node.js bundled" de esta app.

- Puerto 3000 ocupado: Edita el archivo start.* y cambia PORT=3000
  por otro puerto libre.

- La app no abre en el navegador: Abre manualmente http://localhost:3000
`;
  fs.writeFileSync(path.join(PORTABLE_DIR, 'README.txt'), readmeContent, 'utf-8');

  // 7. Opcional: bundle Node.js portable
  if (withNode) {
    console.log(`\n[7/7] Descargando Node.js portable para ${withNode}...`);
    await downloadNodePortable(withNode, PORTABLE_DIR);
  } else {
    console.log('\n[7/7] Sin Node.js bundled (el usuario final necesita Node.js instalado).');
  }

  // Summary
  console.log('\n=== Build portable completado ===');
  console.log(`Carpeta: ${PORTABLE_DIR}`);
  console.log(`Tamanio: ${(getDirSize(PORTABLE_DIR) / 1024 / 1024).toFixed(1)} MB`);

  // ZIP opcional
  if (makeZip) {
    const zipName = withNode
      ? `te-reparo-portable-${withNode}.zip`
      : 'te-reparo-portable.zip';
    console.log(`\nCreando ${zipName}...`);
    try {
      execSync(`cd "${DIST}" && zip -r "${zipName}" portable/`, { stdio: 'inherit' });
      const zipPath = path.join(DIST, zipName);
      console.log(`ZIP: ${zipPath}`);
      console.log(`Tamanio ZIP: ${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(1)} MB`);
    } catch (e) {
      console.log('  zip no disponible, puedes comprimir manualmente la carpeta portable/');
    }
  }
}

async function downloadNodePortable(platform, destDir) {
  const nodeVersion = 'v20.18.0'; // LTS al momento de escribir esto
  let url, ext;

  switch (platform) {
    case 'win':
      url = `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}-win-x64.zip`;
      ext = '.zip';
      break;
    case 'mac':
      // Para Apple Silicon: node-${nodeVersion}-darwin-arm64.tar.gz
      // Para Intel:       node-${nodeVersion}-darwin-x64.tar.gz
      url = `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}-darwin-x64.tar.gz`;
      ext = '.tar.gz';
      break;
    case 'linux':
      url = `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}-linux-x64.tar.xz`;
      ext = '.tar.xz';
      break;
  }

  const archivePath = path.join(destDir, `node-download${ext}`);
  await downloadFile(url, archivePath);
  console.log(`  descargado: ${(fs.statSync(archivePath).size / 1024 / 1024).toFixed(1)} MB`);

  // Extraer
  const nodeDir = path.join(destDir, 'node');
  fs.mkdirSync(nodeDir, { recursive: true });

  try {
    if (platform === 'win') {
      // .zip — tar de Windows 10+ soporta .zip
      execSync(`tar -xf "${archivePath}" -C "${nodeDir}" --strip-components=1`, { stdio: 'inherit' });
    } else if (platform === 'mac') {
      execSync(`tar -xzf "${archivePath}" -C "${nodeDir}" --strip-components=1`, { stdio: 'inherit' });
    } else if (platform === 'linux') {
      execSync(`tar -xJf "${archivePath}" -C "${nodeDir}" --strip-components=1`, { stdio: 'inherit' });
    }
  } catch (e) {
    console.warn('  (aviso) extraccion con tar fallo, intenta manualmente');
    console.warn('  el archivo esta en:', archivePath);
    return;
  }

  fs.unlinkSync(archivePath);
  console.log(`  Node.js portable extraido en: ${nodeDir}`);
}

function getDirSize(dir) {
  let size = 0;
  function walk(d) {
    const stats = fs.statSync(d);
    if (stats.isFile()) {
      size += stats.size;
    } else if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(d)) {
        walk(path.join(d, entry));
      }
    }
  }
  walk(dir);
  return size;
}

main().catch((err) => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});

