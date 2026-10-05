# Te Reparo Manager

Sistema integral de gestión para talleres de reparación en Cuba.
**Stack**: Next.js 16 + Prisma + SQLite.

## 🚀 Modo desarrollo

```bash
# 1. Instalar dependencias
bun install

# 2. Crear la base de datos SQLite con datos semilla
bun run db:reseed

# 3. Iniciar el servidor de desarrollo en http://localhost:3000
bun run dev
```

Login: `superadmin@tereparo.mx` / `admin123`

## 📦 Distribución portable (cualquier SO, se abre en navegador)

Este proyecto genera un **ZIP portable** que cualquier usuario puede ejecutar
haciendo doble clic — **sin instalar Node.js, sin instalar nada**. La app se
abre en el navegador por defecto del sistema.

### Generar el portable (en tu PC de desarrollo)

```bash
# Sin Node.js bundled (ZIP ~30 MB, requiere Node.js instalado en destino)
bun run dist:portable

# Con Node.js bundled (ZIP ~80 MB, cero dependencias en destino)
bun run dist:portable:win     # para Windows
bun run dist:portable:mac     # para macOS
bun run dist:portable:linux   # para Linux
```

Los artefactos se generan en `dist/`:
- `dist/portable/` — la carpeta descomprimida lista para doble-clic.
- `dist/te-reparo-portable[-<os>].zip` — el ZIP para distribuir.

### Cómo lo usa el usuario final

1. Recibe el ZIP por correo, USB, Drive, etc.
2. Lo descomprime en cualquier carpeta (ej: Escritorio).
3. Hace **doble clic** en el launcher correspondiente:
   - **Windows**: `start.bat`
   - **macOS**: `start.command` (la primera vez: click derecho → Abrir, para autorizar)
   - **Linux**: `start.sh` (doble clic en gestor de archivos o `./start.sh` en terminal)
4. **Se abre el navegador** por defecto en `http://localhost:3000` con la app.
5. Login inicial: `superadmin@tereparo.mx` / `admin123`.
6. Cierra la terminal/consola para detener el servidor cuando termines.

### Dónde se guardan los datos del usuario final

La base de datos SQLite se guarda en `data/te-reparo.db` **dentro de la misma
carpeta descomprimida**. Esto significa:
- Persiste entre reinicios.
- Si el usuario copia la carpeta a otra PC, se lleva los datos.
- Para resetear a estado de fábrica: borrar `data/te-reparo.db`.

## 🔧 Comandos disponibles

### Desarrollo
```bash
bun run dev              # Servidor de desarrollo en :3000
bun run lint             # ESLint
bun run test             # Tests unitarios (vitest)
bun run test:e2e         # Tests E2E (playwright)
```

### Build
```bash
bun run build            # Build Next.js standalone (a .next/standalone/)
bun run dist:portable   # Genera dist/portable/ + ZIP sin Node.js bundled
bun run dist:portable:win   # Genera ZIP con Node.js portable para Windows
bun run dist:portable:mac   # Genera ZIP con Node.js portable para macOS
bun run dist:portable:linux # Genera ZIP con Node.js portable para Linux
```

### Base de datos
```bash
bun run db:push          # Sincroniza schema con DB (sin perder datos)
bun run db:reset         # Borra todo y recrea el schema (CUIDADO)
bun run db:seed          # Inserta datos semilla
bun run db:reseed        # Reset + seed en un comando
bun run db:studio        # Abre Prisma Studio en localhost:5555
bun run db:generate      # Regenera el cliente Prisma
```

## 🔐 Usuarios demo (seed)

| Rol          | Email                     | Password       | Talleres asignados           |
|--------------|---------------------------|----------------|------------------------------|
| SUPER_ADMIN  | superadmin@tereparo.mx    | admin123       | Todos                        |
| ADMIN        | admin.centro@tereparo.mx  | admin123       | taller-1 (Centro Habana)     |
| ADMIN        | admin.norte@tereparo.mx   | admin123       | taller-2 (Santiago)          |
| VENDEDOR     | vendedor@tereparo.mx      | vendedor123    | taller-1                     |

## 📁 Estructura del proyecto

```
te-reparo-manager/
├── prisma/
│   ├── schema.prisma         # Schema de la DB (24 tablas)
│   └── dev.db                # SQLite DB local (se crea con db:reseed)
├── src/
│   ├── app/
│   │   ├── api/              # 40+ Next.js API Routes (auth, ventas, etc.)
│   │   ├── page.tsx          # Home (login si no autenticado, app shell si lo está)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── modules/          # Módulos de UI (POS, Servicios, Clientes, etc.)
│   │   └── shared/           # Componentes reutilizables
│   └── lib/
│       ├── prisma.ts         # Singleton de PrismaClient
│       ├── session.ts        # Cookie-based auth (HMAC)
│       ├── api-helpers.ts    # Helpers para API routes
│       ├── store.ts          # Zustand (cache de lectura)
│       └── electron-adapter.ts # useDataService() — fetch contra /api/*
├── scripts/
│   ├── seed-sqlite.js        # Script de seed
│   ├── build-portable.js     # Empaquetador portable
│   ├── start.bat             # Launcher Windows (template)
│   ├── start.command         # Launcher macOS (template)
│   └── start.sh              # Launcher Linux/macOS (template)
└── package.json
```

## 🐛 Troubleshooting

### "Environment variable not found: DATABASE_URL"

Tu shell tiene un `DATABASE_URL` stale. Solución:

```bash
# Opción A: limpiar el env var
unset DATABASE_URL

# Opción B: abrir un shell nuevo
exec bash

# Opción C: correr con env -u
env -u DATABASE_URL bun run dev
```

Para que sea permanente, revisa `~/.bashrc` o `~/.zshrc` y elimina cualquier
línea que haga `export DATABASE_URL=...`.

### Build falla con Turbopack (panic en globals.css)

Si `next build` falla con error de Turbopack, prueba con:

```bash
NODE_OPTIONS="--max-old-space-size=8192" bunx next build --webpack
```

El build necesita ~4-6 GB RAM. Cierra otras apps antes del build.

### "No se encontró Node.js" al ejecutar el portable

El usuario final necesita Node.js instalado (descarga desde https://nodejs.org,
versión LTS). O usa el modo `dist:portable:win/mac/linux` que ya incluye Node.js
bundled (no requiere instalar nada en destino).

### En macOS: "start.command no se puede abrir porque es de un desarrollador no identificado"

Click derecho sobre `start.command` → **Abrir** → confirmar. Solo la primera vez.

### Puerto 3000 ocupado

Edita el archivo `start.bat` / `start.command` / `start.sh` y cambia `PORT=3000`
por otro puerto libre (ej: `PORT=8080`).

## 📝 Licencia

MIT
