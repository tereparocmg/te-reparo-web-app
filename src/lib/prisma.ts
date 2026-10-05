// ============================================================
// Prisma Client Singleton (Next.js + SQLite) + Sync Extension
// ============================================================
// Singleton con hot-reload safety + extensión que auto-enqueue
// mutaciones en SyncQueue para sincronizar con la Cloud API.
//
// Cuando se hace prisma.venta.create({...}), la extensión
// automáticamente también hace prisma.syncQueue.create({...}).
// El SyncWorker (background job) procesa la cola y sube al cloud.
// ============================================================

import { PrismaClient, Prisma } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

const prismaBase =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prismaBase
}

// ============================================================
// Modelos que NO se encolan en SyncQueue
// (porque son la cola misma, o son sub-records que se sync via parent)
// ============================================================

const SKIP_ENQUEUE = new Set<string>([
  'SyncQueue',
  'SyncState',
  'ChangeLog',
])

// Sub-records que se sincronizan como parte del payload de su parent:
//   - VentaItem: viene como parte de Venta
//   - ServicioItemPieza: viene como parte de Servicio
//   - CompraItem: viene como parte de Compra (que viene con Movimiento)
//   - ReclamacionGarantia: viene como parte de Garantia
//   - UsuarioTaller: se mantiene via Usuario (sus tallerIds)
const SYNC_VIA_PARENT = new Set<string>([
  'VentaItem',
  'ServicioItemPieza',
  'CompraItem',
  'ReclamacionGarantia',
  'UsuarioTaller',
])

// ============================================================
// Helper: encolar entrada en SyncQueue (fire-and-forget, no bloquea)
// ============================================================

function enqueue(
  model: string,
  recordId: string | undefined,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: any,
) {
  if (!recordId) return
  if (SKIP_ENQUEUE.has(model) || SYNC_VIA_PARENT.has(model)) return
  // Defer al próximo tick del event loop para no bloquear la transacción
  // padre (que tiene un timeout de 5s por defecto en Prisma). Si lo
  // hiciéramos sync, el create del SyncQueue dentro del hook extendería
  // el tiempo de la transacción y causaría timeout.
  const tableName = model.charAt(0).toLowerCase() + model.slice(1)
  const payloadStr = JSON.stringify(payload ?? {})
  setImmediate(() => {
    prismaRaw.syncQueue.create({
      data: { tableName, recordId, operation, payload: payloadStr },
    }).catch((e: any) => {
      console.error('[sync-extension] Failed to enqueue:', e)
    })
  })
}

// ============================================================
// Prisma extension: intercepta create/update/delete y encola
// ============================================================

const syncExtension = Prisma.defineExtension((p) => {
  return p.$extends({
    query: {
      $allModels: {
        // —— create ——
        async create({ model, args, query }) {
          const result = await query(args)
          enqueue(model, (result as any)?.id, 'INSERT', result)
          return result
        },

        // —— createMany (no devuelve IDs en SQLite, así que registramos operación bulk)
        async createMany({ model, args, query }) {
          if (SKIP_ENQUEUE.has(model) || SYNC_VIA_PARENT.has(model)) {
            return query(args)
          }
          const result = await query(args)
          if (result?.count > 0) {
            enqueue(model, '__bulk_create__', 'INSERT', { bulk: true, count: result.count })
          }
          return result
        },

        // —— update ——
        async update({ model, args, query }) {
          const result = await query(args)
          enqueue(model, (result as any)?.id, 'UPDATE', result)
          return result
        },

        // —— updateMany ——
        async updateMany({ model, args, query }) {
          if (SKIP_ENQUEUE.has(model) || SYNC_VIA_PARENT.has(model)) {
            return query(args)
          }
          const result = await query(args)
          if (result?.count > 0) {
            enqueue(model, '__bulk_update__', 'UPDATE', { bulk: true, count: result.count })
          }
          return result
        },

        // —— delete (soft-delete via deletedAt preferido, pero soportamos hard delete) ——
        async delete({ model, args, query }) {
          const result = await query(args)
          enqueue(model, (result as any)?.id, 'DELETE', result)
          return result
        },

        // —— deleteMany ——
        async deleteMany({ model, args, query }) {
          if (SKIP_ENQUEUE.has(model) || SYNC_VIA_PARENT.has(model)) {
            return query(args)
          }
          const result = await query(args)
          if (result?.count > 0) {
            enqueue(model, '__bulk_delete__', 'DELETE', { bulk: true, count: result.count })
          }
          return result
        },

        // —— upsert ——
        async upsert({ model, args, query }) {
          const result = await query(args)
          enqueue(model, (result as any)?.id, 'UPDATE', result)
          return result
        },
      },
    },
  })
})

// Prisma client con extensión — todas las mutaciones se auto-encolan
export const prisma = prismaBase.$extends(syncExtension)

// Exportar también el cliente base para casos donde no queremos encolar
// (ej: el SyncWorker cuando aplica cambios del cloud a local).
export const prismaRaw = prismaBase

// ============================================================
// Helpers
// ============================================================

// Convertir fechas de Prisma (Date) a ISO strings para el frontend
export function normalizeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj as T
  if (obj instanceof Date) return obj.toISOString() as unknown as T
  if (Array.isArray(obj)) return obj.map(normalizeDates) as unknown as T
  if (typeof obj === 'object') {
    const out: any = {}
    for (const k in obj as any) out[k] = normalizeDates((obj as any)[k])
    return out
  }
  return obj
}

// Parsear tags de JSON string a array
export function parseTags(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return []
  try { return JSON.parse(tagsStr) } catch { return [] }
}

// Serializar tags de array a JSON string
export function serializeTags(tagsArr: string[] | null | undefined): string {
  if (!tagsArr || !Array.isArray(tagsArr)) return '[]'
  return JSON.stringify(tagsArr)
}
