# Te Reparo Manager — Informe Técnico Completo

**Fecha de generación:** 26 de septiembre de 2026
**Versión del proyecto:** 1.0.0
**Stack:** Next.js 16 + NestJS 11 + Prisma 6 + SQLite + PostgreSQL + Socket.io

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Decisiones de Diseño](#3-decisiones-de-diseño)
4. [Lo que se construyó (Fase por Fase)](#4-lo-que-se-construyó-fase-por-fase)
5. [Estructura del Proyecto](#5-estructura-del-proyecto)
6. [Cómo ejecutar en desarrollo local](#6-cómo-ejecutar-en-desarrollo-local)
7. [Cómo desplegar a producción](#7-cómo-desplegar-a-producción)
8. [Flujos del sistema](#8-flujos-del-sistema)
9. [Seguridad](#9-seguridad)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Resumen Ejecutivo

Te Reparo Manager es un sistema integral de gestión para talleres de reparación en Cuba, diseñado para operar en múltiples talleres con sincronización cloud bidireccional y soporte offline.

El sistema consta de dos componentes principales:

- **App Local (Next.js + SQLite):** Se ejecuta en cada PC de cada taller. Funciona 100% offline. Cuando hay internet, sincroniza datos con la nube automáticamente.
- **Cloud API (NestJS + PostgreSQL):** Servidor central que almacena los datos de todos los talleres. Permite al super-admin gestionar todo remotamente desde un navegador.

**Características clave:**
- Local-first: la app del taller siempre funciona, sin internet.
- Sync bidireccional con resolución de conflictos LWW (Last-Write-Wins).
- Cola offline: las ventas hechas sin internet se suben cuando se recupera la conexión.
- WebSocket real-time: los cambios del super-admin llegan a los talleres en vivo.
- Admin multi-taller: el super-admin ve y edita todos los talleres desde una vista unificada.

---

## 2. Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│                    Cloud (Railway / Render)                       │
│  ┌──────────────────────────────────────────────────┐            │
│  │  NestJS API (puerto 4000)                         │            │
│  │  ├── Auth (JWT: workshop 1 año / admin 7d)       │            │
│  │  ├── Sync (push / pull / bootstrap)               │            │
│  │  ├── Admin CRUD (workshops /:id /:tabla)          │            │
│  │  ├── Realtime (Socket.io — push instantáneo)      │            │
│  │  └── AuditLog (todas las mutaciones registradas)  │            │
│  │                                                    │            │
│  │  PostgreSQL                                        │            │
│  │  ├── Workshop (registro de talleres conectados)   │            │
│  │  ├── 23 tablas syncable (+ cloud-specific fields)  │            │
│  │  ├── SyncEvent (cola de eventos para pull)         │            │
│  │  └── AuditLog (registro de mutaciones)             │            │
│  └──────────────────────────┬───────────────────────┘            │
│                              │ WebSocket push                      │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
     Taller 1              Taller 2              Taller 3
     (PC con app)         (PC con app)          (PC con app)
     ┌──────────┐        ┌──────────┐          ┌──────────┐
     │ Next.js   │        │ Next.js  │          │ Next.js  │
     │ + SQLite  │        │ + SQLite │          │ + SQLite │
     │ + Worker  │◄──WS──│ + Worker │◄──WS────│ + Worker │
     │ + Queue   │        │ + Queue  │          │ + Queue  │
     └──────────┘        └──────────┘          └──────────┘

     El super-admin usa la MISMA app Next.js pero con
     vista "Modo Admin Multi-Taller" que consume el
     Cloud API directamente (sin SQLite local para él).
```

---

## 3. Decisiones de Diseño

### 3.1 Local-first

Cada taller tiene su propia SQLite local. Todas las operaciones diarias (POS, servicios, inventario) operan contra el SQLite local — no dependen de internet. La sincronización con la nube es secundaria y no bloquea la operación.

**Ventaja:** el taller sigue funcionando aunque se caa internet.
**Trade-off:** los datos del super-admin tardan unos segundos en llegar al taller (30s vía polling, o instantáneo vía WebSocket).

### 3.2 Resolución de conflictos: LWW + Ownership + Soft delete

- **LWW (Last-Write-Wins):** cuando dos versiones del mismo registro entran en conflicto, gana la que tiene el timestamp más reciente. Se registra en AuditLog para auditoría.
- **Ownership estricto por campo:** ciertos campos solo el super-admin puede modificarlos (ej: `precioCosto` en Producto, `tipoCambio` en ConfiguraciónGlobal). Si el taller intenta cambiarlos, el cloud los rechaza.
- **Soft delete en todas las tablas:** ningún registro se borra físicamente. Se marca `deletedAt = now()`. Esto preserva el histórico (ej: una venta sigue referenciando un producto que fue "borrado" del catálogo).

### 3.3 Sync bidireccional con WebSocket + polling fallback

- **Push (taller → cloud):** el sync worker local lee la cola `SyncQueue`, hace `POST /api/sync/push` al cloud cada 30s.
- **Pull (cloud → taller):** el sync worker hace `GET /api/sync/pull?since=<cursor>` cada 30s.
- **WebSocket (Phase 4):** cuando el super-admin edita algo en cloud, el cloud emite un evento `sync-available` vía WebSocket al taller afectado. El taller hace `pullFromCloud()` inmediato + refresca la UI. Latencia: <1 segundo en vez de 30s.
- **Fallback:** si el WebSocket se cae, el polling de 30s sigue funcionando como respaldo. Auto-reconnect con backoff exponencial (2s, 4s, 8s, 16s, 30s).

### 3.4 Prisma extension auto-encoladora

La extensión de Prisma intercepta TODA mutación (`create`, `update`, `delete`, `createMany`, `updateMany`, `deleteMany`, `upsert`) en TODAS las tablas syncable y automáticamente encola una entrada en `SyncQueue`. Esto significa que los API routes no necesitan saber nada sobre sync — la extensión es transparente.

Las sub-records (`VentaItem`, `ServicioItemPieza`, `CompraItem`, `ReclamacionGarantia`, `UsuarioTaller`) no se encolan individualmente — se sincronizan como parte del payload de su parent.

### 3.5 Admin multi-taller

El super-admin usa la misma app Next.js pero con un modo diferente (`vistaMode = 'admin'`). En este modo:
- No usa el SQLite local para lectura/escritura.
- Consume directo el Cloud API vía `cloud-data-service.ts`.
- Tiene un selector de taller + dashboard consolidado + 14 tabs de recursos con CRUD genérico.
- El JWT del super-admin del cloud se guarda en `localStorage` (separado del cookie-based auth local).

---

## 4. Lo que se construyó (Fase por Fase)

### Fase 0: Migración de Electron a Next.js puro

Originalmente el proyecto era una app Electron. Se migró a Next.js puro:
- Prisma schema migrado de `electron-src/prisma/schema.prisma` a `prisma/schema.prisma` (raíz).
- 40+ API Routes creadas en `src/app/api/` (auth, talleres, usuarios, productos, piezas, ventas, servicios, movimientos, pedidos, devoluciones, garantías, comisiones, configuración, dashboard, validar código de barras).
- Frontend migrado de `window.electronAPI.*` a `fetch('/api/*')`.
- Store Zustand con `bootstrapFromBackend()` que carga datos desde las API routes.

### Fase 1: Cloud API MVP (NestJS + PostgreSQL)

**Ubicación:** `cloud-api/`

Se creó un NestJS API separado que sirve como servidor central:
- **Prisma schema PostgreSQL** con 23 modelos syncable + 3 cloud-only (Workshop, SyncEvent, AuditLog).
- Cada tabla syncable tiene campos cloud-specific: `originWorkshopId`, `cloudVersion`, `lastSyncedFromWorkshopAt`, `lastSyncedToWorkshopAt`, `deletedAt`.
- **Auth module:** JWT con dos tipos de tokens:
  - Workshop JWT (válido 1 año) — para talleres que hacen sync.
  - Super-admin JWT (access 7d + refresh 30d) — para la web admin.
  - `POST /api/auth/register-workshop` — registra un nuevo taller, devuelve JWT.
  - `POST /api/auth/login-admin` — login del super-admin.
- **Sync module:** 
  - `POST /api/sync/push` — recibe batch de mutaciones del taller, aplica a PostgreSQL con LWW.
  - `GET /api/sync/pull?since=<cursor>` — devuelve SyncEvents pendientes para el taller.
  - `GET /api/sync/bootstrap` — descarga completa inicial.
- **Workshops module (super-admin CRUD):**
  - `GET /api/admin/workshops` — lista todos los talleres.
  - `GET /api/admin/workshops/:id/dashboard` — KPIs de un taller.
  - `GET/POST/PUT/DELETE /api/admin/workshops/:id/:tableName` — CRUD genérico sobre cualquier tabla.
- **Audit module:** registra todas las mutaciones con before/after data.

**Deployment:** Dockerfile multi-stage + railway.toml. Variables de entorno en Railway dashboard.

### Fase 2: Sync Worker Local

**Ubicación:** `src/lib/` (app local)

- **Schema local modificado:** añadidos `syncedAt`, `syncVersion`, `deletedAt` a 16 tablas syncable + `syncedAt`/`syncVersion` a 5 sub-records.
- **Nuevas tablas locales:**
  - `SyncQueue` — cola de operaciones pendientes (tableName, recordId, operation, payload JSON, attempts, lastError, priority).
  - `SyncState` — config del taller (workshopId, apiToken, serverUrl, syncEnabled, syncIntervalSec, lastPullAt, lastPushAt, lastPullCursor, lastError).
- **Prisma extension** (`src/lib/prisma.ts`): intercepta todas las mutaciones y auto-encola en `SyncQueue` usando `setImmediate()` (fire-and-forget para no bloquear transacciones).
- **SyncService** (`src/lib/sync-service.ts`):
  - `pushPending()` — lee SyncQueue, POST al cloud, marca syncedAt, remueve de queue.
  - `pullFromCloud()` — GET eventos del cloud, aplica al SQLite local via upsert.
  - `bootstrapFromCloud()` — descarga completa inicial.
  - `checkInternet()` — HEAD a google.com.
  - `pingCloud()` — verifica conexión con el cloud.
- **SyncWorker** (`src/lib/sync-worker.ts`): background job con `setInterval` cada 30s. Auto-arranca 5s después del primer request.
- **8 API routes locales** para gestionar el worker:
  - `GET /api/sync/status` — estado del worker (running, online, wsConnected, queue, errors).
  - `POST /api/sync/start` / `POST /api/sync/stop` — arrancar/detener worker.
  - `POST /api/sync/tick` — forzar sync inmediato.
  - `GET/PUT /api/sync/config` — leer/editar config (serverUrl, apiToken, syncEnabled, interval).
  - `POST /api/sync/ping` — probar conexión cloud.
  - `POST /api/sync/bootstrap` — descarga completa.
  - `POST /api/sync/register` — registrar taller contra cloud.
- **UI:** SyncBadge en topbar (🟢 Sincronizado / 🟡 N pendientes / 🔴 Sin conexión) + sección "Sincronización con Cloud" en Configuración (solo SUPER_ADMIN).

### Fase 3: Web Admin Multi-Taller

**Ubicación:** `src/components/admin*` (app local)

- **Cloud Data Service** (`src/lib/cloud-data-service.ts`): 18 funciones que hablan directo con el Cloud API:
  - Token management en localStorage.
  - `cloudLogin`, `cloudLogout`, `cloudMe`.
  - `cloudListWorkshops`, `cloudGetWorkshopDashboard`.
  - `cloudListResource`, `cloudGetResource`, `cloudCreateResource`, `cloudUpdateResource`, `cloudDeleteResource`.
- **CloudLoginDialog:** modal para que el super-admin se loguee al cloud (email + password + URL del cloud).
- **Store change:** nuevo campo `vistaMode: 'local' | 'admin'` en Zustand. Si `admin` + `SUPER_ADMIN` → renderiza AdminShell en vez de AppShell.
- **Botón "Modo Admin Multi-Taller"** en el sidebar regular (solo SUPER_ADMIN).
- **AdminShell:** layout completo con:
  - Sidebar: Dashboard Consolidado, Detalle por Taller, selector de taller, botones Actualizar/Desconectar/Volver a modo local.
  - Topbar: título contextual, server URL, badge con count de talleres, SyncBadge.
  - Auto-carga de talleres via `cloudListWorkshops()`. Si no hay token cloud → CloudLoginDialog.
- **AdminDashboard:** 6 KPI cards consolidados (ingresos/gastos/balance/ventas/productos/pedidos sumados de todos los talleres). Tabla de talleres con last seen, estado, KPIs. Auto-refresh 60s.
- **AdminWorkshopDetail:** 8 KPI cards del taller + 14 tabs (ventas, servicios, productos, piezas, clientes, movimientos, garantías, usuarios, operarios, pedidos, devoluciones, comisiones, pagos, configuración). Lazy mount.
- **AdminResourceBrowser:** browser genérico con CRUD completo para cualquier tabla. Toolbar (Nuevo, search, refresh, paginación). TABLE_COLUMNS map (columnas por tabla). TABLE_FORM_FIELDS map (form fields por tabla con todos los enums). Create/Edit/Delete dialogs. Auto-detect de columnas como fallback.

### Fase 4: WebSocket Real-Time

**Ubicación:** Cloud API `src/modules/realtime/` + Local `src/lib/sync-worker.ts`

- **Cloud API RealtimeModule:**
  - `RealtimeGateway`: `@WebSocketGateway` con Socket.io. Verifica JWT del handshake. Workshop tokens → join room `workshop:<id>`. Admin tokens → join room `admin`. Invalid → disconnect.
  - `RealtimeService`: facade inyectable con `notifyWorkshop(workshopId, event)`, `notifyAllWorkshops(event)`, `notifyAdmin(event)`.
- **SyncService + WorkshopsService modificados:** después de crear cada SyncEvent, llaman `realtimeService.notifyWorkshop()` → el taller afectado recibe push instantáneo.
- **Local sync-worker modificado:**
  - `connectWebSocket()`: dynamic import de `socket.io-client`, conecta al cloud con auth token.
  - Evento `sync-available` (clave): al recibirlo, hace `pullFromCloud(200)` inmediato + `bootstrapFromBackend()` → UI del taller refresca en vivo.
  - Auto-reconnect con backoff exponencial (2s, 4s, 8s, 16s, 30s max).
  - Fallback: si WS caído, polling de 30s sigue funcionando.
- **SyncBadge:** muestra estado del WebSocket (🟢 Conectado / ⚪ Desconectado) junto con el resto del estado.

### Funcionalidades adicionales

- **POS con crear cliente al vuelo:** botón "Nuevo" junto al selector de cliente en el POS que abre un dialog para crear un cliente sin salir de la pantalla.
- **Garantía de producto personalizable en POS:** checkbox para elegir qué producto del carrito se garantiza + días custom + cobertura custom.
- **Mismo en Servicios:** botón "Nuevo cliente" + garantía con cobertura custom.
- **Distribución portable:** scripts `build-portable.js` que genera un ZIP con el Next.js standalone + launchers (`start.bat`, `start.command`, `start.sh`) que abren la app en el navegador. Opción de bundlear Node.js portable (cero dependencias en destino).
- **Backup local:** export de SQLite desde Settings.

---

## 5. Estructura del Proyecto

```
te-reparo-manager/
├── cloud-api/                          # NestJS Cloud API
│   ├── prisma/
│   │   ├── schema.prisma               # PostgreSQL schema (23 syncable + 3 cloud-only)
│   │   └── seed.ts                     # Crea super-admin del cloud
│   ├── src/
│   │   ├── main.ts                     # Bootstrap (CORS, Swagger, IoAdapter, ValidationPipe)
│   │   ├── app.module.ts               # Root module
│   │   └── modules/
│   │       ├── auth/                   # JWT, login, register-workshop, guards, strategies, DTOs
│   │       ├── sync/                   # /sync/push, /sync/pull, /sync/bootstrap
│   │       ├── workshops/              # /admin/workshops CRUD super-admin
│   │       ├── audit/                  # AuditLog service
│   │       ├── realtime/               # WebSocket gateway (Socket.io) — Fase 4
│   │       └── prisma/                 # PrismaClient singleton
│   ├── Dockerfile                      # Multi-stage build para Railway
│   ├── railway.toml                    # Config de Railway
│   ├── .env.example                    # Variables de entorno
│   ├── README.md                       # Guía de deployment
│   ├── package.json, tsconfig.json, nest-cli.json
│   └── package-lock.json
├── prisma/
│   ├── schema.prisma                   # SQLite local (con syncedAt, syncVersion, deletedAt, SyncQueue, SyncState)
│   └── dev.db                          # DB local con seed
├── src/
│   ├── app/
│   │   ├── api/                        # 48+ Next.js API Routes (auth, ventas, productos, sync/*, etc.)
│   │   │   ├── auth/                   # login, logout, me
│   │   │   ├── sync/                   # status, start, stop, tick, config, ping, bootstrap, register
│   │   │   ├── talleres/, usuarios/, operarios/, clientes/
│   │   │   ├── categorias/, productos/, piezas/
│   │   │   ├── ventas/, servicios/, movimientos/
│   │   │   ├── pedidos/, devoluciones/, garantias/
│   │   │   ├── comisiones/, configuracion/, dashboard/
│   │   │   └── validar/codigo-barras/
│   │   ├── page.tsx                    # Home (AppShell o AdminShell según vistaMode)
│   │   ├── layout.tsx                  # Root layout (fonts, ThemeProvider, Toaster)
│   │   └── globals.css                 # TailwindCSS v4 + tw-animate-css
│   ├── components/
│   │   ├── admin-shell.tsx             # Layout para modo admin multi-taller
│   │   ├── cloud-login-dialog.tsx      # Modal para login al cloud
│   │   ├── sync-badge.tsx              # Badge de sync en topbar (🟢/🟡/🔴 + WS)
│   │   ├── app-shell.tsx               # Layout normal (modo local)
│   │   ├── sidebar.tsx                # Sidebar con nav + botón "Modo Admin"
│   │   ├── login-screen.tsx           # Login local (cookie-based)
│   │   ├── theme-toggle.tsx, theme-provider.tsx
│   │   ├── admin/
│   │   │   ├── admin-dashboard.tsx     # Dashboard consolidado multi-taller
│   │   │   ├── admin-workshop-detail.tsx # Detalle de un taller con 14 tabs
│   │   │   └── admin-resource-browser.tsx # CRUD genérico para cualquier tabla
│   │   ├── modules/                    # Módulos de la app local
│   │   │   ├── pos.tsx                 # Punto de venta
│   │   │   ├── servicios.tsx           # Servicios
│   │   │   ├── configuracion.tsx       # Configuración + sync con cloud
│   │   │   ├── dashboard.tsx, talleres.tsx, usuarios.tsx, etc.
│   │   └── shared/                     # Componentes reutilizables
│   │       ├── client-form-dialog.tsx  # Crear cliente al vuelo
│   │       ├── invoice-template.tsx, warranty-certificate.tsx
│   │       ├── product-selector.tsx, client-selector.tsx, tag-filter.tsx
│   │       └── page-header.tsx, stat-card.tsx
│   ├── lib/
│   │   ├── prisma.ts                   # PrismaClient + sync extension (auto-encola)
│   │   ├── sync-service.ts             # push/pull/bootstrap contra cloud
│   │   ├── sync-worker.ts              # Background job + WebSocket client
│   │   ├── cloud-data-service.ts       # Fetch helpers para admin multi-taller
│   │   ├── store.ts                   # Zustand (cache de lectura + bootstrapFromBackend)
│   │   ├── electron-adapter.ts        # useDataService() → fetch('/api/*')
│   │   ├── session.ts                  # Cookie-based auth (HMAC)
│   │   ├── api-helpers.ts             # Helpers para API routes
│   │   ├── folio.ts                   # generateFolio, addDays
│   │   ├── format.ts                  # formatMXN, formatDate, formatUSD, formatCUP
│   │   ├── db.ts                      # (legacy)
│   │   ├── types.ts                   # Tipos TypeScript
│   │   └── utils.ts                   # cn() helper
│   └── hooks/
│       ├── use-toast.ts, use-mobile.ts
├── scripts/
│   ├── seed-sqlite.js                  # Seed de la DB local
│   ├── build-portable.js               # Empaquetador portable (ZIP + Node.js bundled)
│   ├── start.bat                       # Launcher Windows
│   ├── start.command                   # Launcher macOS
│   └── start.sh                        # Launcher Linux
├── e2e/                                # Tests E2E (Playwright)
├── .env                                # DATABASE_URL=file:dev.db
├── package.json                        # Scripts: dev, build, db:*, dist:portable:*
├── README.md                           # Documentación principal
├── worklog.md                          # Log de cambios por iteración
└── prisma/dev.db                       # SQLite con seed (2 talleres, 4 usuarios, etc.)
```

---

## 6. Cómo ejecutar en desarrollo local

### 6.1 Prerequisitos

- **Node.js 18+** (recomendado 20 LTS)
- **bun** (instalar: `curl -fsSL https://bun.sh/install | bash`)
- **PostgreSQL 16+** (para el cloud API; puedes usar Docker: `docker run --name pg -e POSTGRES_PASSWORD=tereparo -e POSTGRES_DB=tereparo -p 5432:5432 -d postgres:16`)
- **Git** (opcional, solo si vas a deployar via GitHub)

### 6.2 App Local (Next.js + SQLite)

```bash
# 1. Descomprimir el ZIP
unzip te-reparo-manager-20260926.zip -d te-reparo-manager
cd te-reparo-manager

# 2. Limpiar env var stale si existe
unset DATABASE_URL

# 3. Instalar dependencias
bun install

# 4. Crear la base de datos SQLite local con datos semilla
bun run db:reseed

# 5. Iniciar el servidor de desarrollo
bun run dev
# → App en http://localhost:3000
# → Login: superadmin@tereparo.mx / admin123
```

### 6.3 Cloud API (NestJS + PostgreSQL)

En otra terminal:

```bash
cd cloud-api

# 1. Instalar dependencias
npm install --legacy-peer-deps

# 2. Configurar .env
cp .env.example .env
# Editar .env:
#   DATABASE_URL=postgresql://postgres:tereparo@localhost:5432/tereparo
#   JWT_SECRET=(generar con: openssl rand -hex 64)
#   SUPER_ADMIN_EMAIL=superadmin@tereparo.cu
#   SUPER_ADMIN_PASSWORD=admin123
#   SUPER_ADMIN_NAME=Super Administrador
#   CORS_ORIGINS=http://localhost:3000

# 3. Generar Prisma client
npx prisma generate

# 4. Crear las tablas en PostgreSQL
npx prisma migrate dev --name init

# 5. Seed (crea el super-admin del cloud)
npm run prisma:seed

# 6. Iniciar el servidor
npm run dev
# → API en http://localhost:4000
# → Swagger docs en http://localhost:4000/docs
```

### 6.4 Conectar la app local con el cloud

1. Abre `http://localhost:3000` en tu navegador.
2. Login con `superadmin@tereparo.mx` / `admin123`.
3. Ve a **Configuración → Sync** (solo visible para SUPER_ADMIN).
4. En la sección "Sincronización con Cloud":
   - **Server URL:** `http://localhost:4000`
   - Click en **"Registrar Taller"** → ingresa nombre, dirección, teléfono.
   - El cloud devuelve un `apiToken` que se guarda automáticamente.
   - `syncEnabled` se activa automáticamente.
5. El sync worker arranca automáticamente (5s después del primer request).
6. El badge del topbar cambia a 🟢 cuando sincroniza.

### 6.5 Probar el modo admin multi-taller

1. Estando logueado como SUPER_ADMIN en la app local.
2. Click en **"Modo Admin Multi-Taller"** en el sidebar.
3. Si no hay token cloud en localStorage, aparece el CloudLoginDialog.
4. Ingresar:
   - URL: `http://localhost:4000`
   - Email: `superadmin@tereparo.cu` (el del cloud, NO el local)
   - Password: `admin123` (o la que configuraste en .env)
5. El AdminShell carga la lista de talleres del cloud.
6. Click en un taller → ve los 14 tabs con CRUD completo.
7. Edita algo (ej: cambia el precio de un producto) → se hace PUT al cloud → el cloud emite WebSocket → la app local del taller recibe el cambio en vivo.

### 6.6 Usuarios demo (seed local)

| Rol | Email | Password | Talleres |
|---|---|---|---|
| SUPER_ADMIN | superadmin@tereparo.mx | admin123 | Todos |
| ADMIN | admin.centro@tereparo.mx | admin123 | taller-1 (Centro Habana) |
| ADMIN | admin.norte@tereparo.mx | admin123 | taller-2 (Santiago) |
| VENDEDOR | vendedor@tereparo.mx | vendedor123 | taller-1 |

### 6.7 Comandos útiles

```bash
# App local
bun run dev              # Desarrollo en :3000
bun run build            # Build standalone
bun run db:reseed        # Reset + seed de la DB local
bun run db:studio        # Prisma Studio en localhost:5555

# Cloud API
npm run dev              # Desarrollo en :4000
npm run build            # Build para producción
npx prisma studio        # Explorar PostgreSQL del cloud
npx prisma migrate dev   # Crear migración nueva
npm run prisma:seed      # Re-crear super-admin

# Distribución portable
bun run dist:portable:win    # ZIP para Windows (con Node.js bundled)
bun run dist:portable:mac    # ZIP para macOS
bun run dist:portable:linux  # ZIP para Linux
```

---

## 7. Cómo desplegar a producción

### 7.1 Cloud API → Railway

**Paso 1: Preparar el repositorio**
1. Sube el proyecto a GitHub (recomendado: repo separado para `cloud-api/` o subdirectorio del repo principal).

**Paso 2: Crear proyecto en Railway**
1. Ve a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Selecciona tu repo.
3. En **Settings** → **Root Directory** → `cloud-api/`.
4. Railway detecta el `Dockerfile` automáticamente.

**Paso 3: Agregar PostgreSQL**
1. En el proyecto → **New** → **Database** → **Add PostgreSQL**.
2. Railway crea la DB y setea `DATABASE_URL` automáticamente.

**Paso 4: Configurar variables de entorno**
En el servicio del cloud-api → **Variables**:
```
DATABASE_URL            ← (Railway la setea automáticamente)
JWT_SECRET              ← (generar: openssl rand -hex 64)
JWT_EXPIRES_IN          = 365d
JWT_ADMIN_EXPIRES_IN    = 7d
JWT_REFRESH_EXPIRES_IN  = 30d
CORS_ORIGINS            = https://tu-dominio.com
PORT                    = 4000
NODE_ENV                = production
SUPER_ADMIN_EMAIL       = superadmin@tereparo.cu
SUPER_ADMIN_PASSWORD    = (contraseña segura, NO usar admin123)
SUPER_ADMIN_NAME        = Super Administrador
```

**Paso 5: Deploy**
1. Railway construye la imagen Docker (multi-stage, ~3 min).
2. Ejecuta `npx prisma migrate deploy` automáticamente (Dockerfile CMD).
3. Inicia el server con `node dist/main.js`.
4. URL pública: `https://<nombre-proyecto>.up.railway.app`.

**Paso 6: Verificar**
1. Visita `https://<tu-url>/docs` → Swagger UI.
2. `POST /api/auth/login-admin` con tu SUPER_ADMIN_EMAIL + PASSWORD → devuelve tokens.

### 7.2 App Local → Distribución portable

Genera un ZIP que el usuario final descomprime y ejecuta con doble clic:

```bash
# En tu PC de desarrollo:
bun run dist:portable:win     # Para Windows (~80 MB con Node.js bundled)
bun run dist:portable:mac     # Para macOS
bun run dist:portable:linux   # Para Linux
```

Output en `dist/`:
- `dist/portable/` — carpeta lista para comprimir.
- `dist/te-reparo-portable-<os>.zip` — ZIP distribuible.

**El usuario final:**
1. Descomprime el ZIP.
2. Doble clic en `start.bat` (Windows) / `start.command` (macOS) / `start.sh` (Linux).
3. El navegador abre `http://localhost:3000` automáticamente.
4. Login: `superadmin@tereparo.mx` / `admin123` (o el que hayas seedeado).
5. La DB SQLite se guarda en `data/te-reparo.db` dentro de la carpeta (persistente).

### 7.3 Conectar cada taller al cloud (producción)

Una vez que el cloud API esté en Railway:

1. En cada PC de cada taller, ejecuta la app portable.
2. Login como SUPER_ADMIN local.
3. Ve a **Configuración → Sync**.
4. En "Sincronización con Cloud":
   - **Server URL:** `https://<tu-url-de-railway>.up.railway.app`
   - Click en **"Registrar Taller"** → nombre, dirección, teléfono.
   - El cloud devuelve un JWT que se guarda en SyncState.
5. El sync worker arranca automáticamente. El badge del topbar muestra 🟢.
6. El WebSocket se conecta. Los cambios del super-admin llegan en vivo.

### 7.4 Primera configuración del super-admin en el cloud

1. El cloud API ya tiene el super-admin creado (vía `prisma:seed` con las env vars).
2. En cualquier PC, ejecuta la app portable.
3. Login como SUPER_ADMIN local.
4. Click en **"Modo Admin Multi-Taller"** en el sidebar.
5. Aparece el CloudLoginDialog:
   - **URL del Cloud API:** `https://<tu-url-de-railway>.up.railway.app`
   - **Email:** `superadmin@tereparo.cu`
   - **Password:** la que configuraste en `SUPER_ADMIN_PASSWORD`.
6. El AdminShell carga. Ahora puedes gestionar todos los talleres remotamente.

---

## 8. Flujos del sistema

### 8.1 Vendedor hace una venta (online)

```
1. Vendedor cobra venta en POS.
2. POST /api/ventas (local) → transacción SQLite:
   - Crea Venta + VentaItems (syncedAt = null)
   - Descuenta stock de Producto
   - Crea Movimiento INGRESO
   - Crea Garantía (si aplica)
   - Crea CommissionEntry (si aplica)
3. Prisma extension auto-encola 5 entries en SyncQueue (fire-and-forget).
4. UI muestra "🟡 5 pendientes" en topbar.
5. Sync worker (cada 30s): POST /api/sync/push al cloud.
6. Cloud procesa: aplica a PostgreSQL, crea SyncEvents.
7. Cloud emite WebSocket a otros talleres si aplica (raro — cada taller ve solo lo suyo).
8. Sync worker marca syncedAt = now, limpia SyncQueue.
9. UI muestra "🟢 Sincronizado".
```

### 8.2 Vendedor hace una venta (offline)

```
1. Vendedor cobra venta en POS (sin internet).
2. POST /api/ventas (local) → SQLite + SyncQueue (igual que online).
3. UI muestra "🔴 Sin conexión" en topbar.
4. Sync worker intenta push cada 30s → falla → backoff.
5. Recupera internet.
6. Sync worker hace push → cloud procesa → entries marcadas synced.
7. UI cambia a "🟢 Sincronizado".
8. Si el WebSocket estaba caído, se reconecta automáticamente.
```

### 8.3 Super-admin edita remotamente

```
1. Super-admin abre "Modo Admin Multi-Taller" en cualquier PC.
2. Selecciona un taller → abre la tab "Productos".
3. Edita el precio de "iPhone 13" → PUT /api/admin/workshops/taller-1/productos/prod-1.
4. Cloud API:
   - UPDATE en PostgreSQL.
   - CREATE SyncEvent (workshopId: "taller-1", operation: "UPDATE").
   - RealtimeService.notifyWorkshop("taller-1", { type: "sync-available" }).
5. Taller-1 recibe "sync-available" via WebSocket (<1 segundo).
6. Sync worker hace pullFromCloud() inmediato.
7. Aplica el UPDATE al SQLite local.
8. Llama bootstrapFromBackend() → Zustand se re-sincroniza.
9. UI del taller muestra el nuevo precio EN VIVO.
```

### 8.4 Bootstrap inicial (primer arranque de un taller)

```
1. El taller se registra contra el cloud (POST /api/auth/register-workshop).
2. Recibe workshopId + apiToken.
3. El super-admin hace "Bootstrap" desde la Configuración → Sync.
4. GET /api/sync/bootstrap al cloud → descarga TODOS los datos del taller.
5. Upserta todo en el SQLite local.
6. A partir de ahí, sync incremental (push + pull cada 30s + WebSocket).
```

---

## 9. Seguridad

### 9.1 Auth dual

- **Auth local (cookie-based):** cookie `tereparo_session` firmada con HMAC. Válida 7 días. Para la app local normal (POS, inventario, etc.).
- **Auth cloud workshop (JWT):** token de 1 año. Guardado en `SyncState.apiToken` (SQLite local). Para sync push/pull/bootstrap.
- **Auth cloud super-admin (JWT):** access token 7d + refresh 30d. Guardado en `localStorage`. Para admin multi-taller.

### 9.2 Ownership estricto

- Cada workshop solo puede tocar registros donde `originWorkshopId === workshopId` (filtro en SyncService.pushBatch).
- El super-admin puede tocar todo (WorkshopsService no tiene restricción de ownership).
- Campos readonly por rol: `precioCosto`, `garantiaDias`, `operatorCommissionType/Value` en Producto — solo super-admin puede cambiarlos.

### 9.3 Passwords

- **Local SQLite:** plain text (simplificado para Cuba, como el seed usa `admin123`).
- **Cloud PostgreSQL:** bcrypt hash (10 rounds). NUNCA se devuelve en respuestas.

### 9.4 CORS

- Configurable via `CORS_ORIGINS` env var. En producción, setear al dominio de la app.

### 9.5 AuditLog

- Todas las mutaciones en el cloud se registran en `AuditLog` con before/after data.
- Permite trazabilidad de quién cambió qué y cuándo.

---

## 10. Troubleshooting

### "Environment variable not found: DATABASE_URL"

Tu shell tiene un `DATABASE_URL` stale que sobreescribe el `.env`:
```bash
unset DATABASE_URL
# o
env -u DATABASE_URL bun run dev
```

### Build de Next.js falla con Turbopack (panic en globals.css)

El build necesita ~4-6 GB RAM. En máquinas con poca memoria:
```bash
NODE_OPTIONS="--max-old-space-size=8192" bunx next build --webpack
```

### "Transaction already closed" en POST /api/ventas

Las transacciones tienen timeout de 30s (configurado en las API routes). Si la Prisma extension tarda mucho en encolar, puede ocurrir. La extensión usa `setImmediate()` (fire-and-forget) para no bloquear la transacción.

### Cloud API: "No se puede conectar a PostgreSQL"

Verifica que PostgreSQL esté corriendo y `DATABASE_URL` sea correcta:
```bash
# Docker:
docker run --name pg -e POSTGRES_PASSWORD=tereparo -e POSTGRES_DB=tereparo -p 5432:5432 -d postgres:16

# .env:
DATABASE_URL=postgresql://postgres:tereparo@localhost:5432/tereparo
```

### Sync worker no arranca

Verifica que SyncState esté configurado:
```bash
GET /api/sync/status → verificar que state.serverUrl y state.apiToken no sean null.
```
Si faltan, ve a Configuración → Sync y registra el taller contra el cloud.

### WebSocket no conecta

- Verifica que el cloud API esté corriendo y accesible.
- Verifica que `CORS_ORIGINS` en el cloud incluya la URL de la app local.
- El SyncBadge muestra "WebSocket: ⚪ Desconectado" cuando no hay conexión. El worker reintenta con backoff.

### En macOS: "start.command no se puede abrir"

Click derecho sobre `start.command` → **Abrir** → confirmar. Solo la primera vez (Gatekeeper de macOS).

---

## Licencia

MIT
