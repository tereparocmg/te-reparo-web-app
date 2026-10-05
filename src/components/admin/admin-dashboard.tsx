'use client'

// ============================================================
// AdminDashboard — consolidated multi-taller dashboard.
// Renders KPIs aggregated across all workshops (Promise.all of
// cloudGetWorkshopDashboard) + a per-workshop table with quick
// navigation into the workshop detail view.
// Auto-refreshes every 60s.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/shared/stat-card'
import {
  AlertTriangle, Building2, DollarSign, Package, RefreshCw, ShoppingCart, Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { cloudGetWorkshopDashboard } from '@/lib/cloud-data-service'
import { formatMXN } from '@/lib/format'

// ============================================================
// Helpers
// ============================================================

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 0) return 'justo ahora'
  if (secs < 60) return 'hace unos segundos'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
  return `hace ${Math.floor(months / 12)} año(s)`
}

function num(v: any): number {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

// ============================================================
// Component
// ============================================================

interface AdminDashboardProps {
  workshops: any[]
  onSelectWorkshop: (id: string) => void
}

export function AdminDashboard({ workshops, onSelectWorkshop }: AdminDashboardProps) {
  const [dashboards, setDashboards] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const mountedRef = useRef(true)

  const fetchAll = useCallback(async () => {
    if (workshops.length === 0) {
      setDashboards({})
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const entries = await Promise.all(
        workshops.map(async (w) => {
          try {
            const d = await cloudGetWorkshopDashboard(w.id)
            return [w.id, d] as const
          } catch (err: any) {
            console.error('[admin-dashboard] error loading workshop dashboard', w.id, err)
            // Don't fail the entire batch for one workshop error
            return [w.id, { __error: err?.message || 'Error' }] as const
          }
        })
      )
      if (!mountedRef.current) return
      const map: Record<string, any> = {}
      for (const [id, d] of entries) map[id] = d
      setDashboards(map)
      setLastFetch(new Date())
    } catch (err: any) {
      console.error('[admin-dashboard] fetchAll error', err)
      toast.error('Error al cargar dashboard consolidado', { description: err?.message })
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [workshops])

  useEffect(() => {
    mountedRef.current = true
    fetchAll()
    const interval = setInterval(() => {
      fetchAll()
    }, 60_000) // 60s refresh
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchAll])

  // ============================================================
  // Consolidated KPIs
  // ============================================================

  const consolidated = (() => {
    let ingresosHoy = 0
    let gastosHoy = 0
    let balanceHoy = 0
    let ventasHoyCount = 0
    let totalProductos = 0
    let pedidosPendientes = 0
    let talleresActivos = 0
    let talleresConError = 0

    for (const w of workshops) {
      const d = dashboards[w.id]
      if (!d) continue
      if (d.__error) {
        talleresConError++
        continue
      }
      ingresosHoy += num(d.ingresosHoy)
      gastosHoy += num(d.gastosHoy)
      balanceHoy += num(d.balanceHoy)
      ventasHoyCount += num(d.ventasCountHoy ?? d.ventasHoy)
      totalProductos += num(d.totalProductos)
      pedidosPendientes += num(d.pedidosPendientes)
      if (w.isActive) talleresActivos++
    }
    return {
      ingresosHoy,
      gastosHoy,
      balanceHoy,
      ventasHoyCount,
      totalProductos,
      pedidosPendientes,
      talleresActivos,
      talleresConError,
    }
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Multi-Taller</h2>
          <p className="text-sm text-muted-foreground">
            {workshops.length} taller{workshops.length === 1 ? '' : 'es'} bajo gestión
            {lastFetch && (
              <> · Última actualización: {lastFetch.toLocaleTimeString('es-CU')}</>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Consolidated KPIs */}
      {loading && Object.keys(dashboards).length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Ingresos Hoy (Consolidado)"
              value={formatMXN(consolidated.ingresosHoy)}
              subtitle="Suma de todos los talleres"
              icon={DollarSign}
              variant="success"
            />
            <StatCard
              title="Gastos Hoy (Consolidado)"
              value={formatMXN(consolidated.gastosHoy)}
              subtitle="Suma de todos los talleres"
              icon={Wallet}
              variant="danger"
            />
            <StatCard
              title="Balance Hoy (Consolidado)"
              value={formatMXN(consolidated.balanceHoy)}
              subtitle="Ingresos − Gastos"
              icon={DollarSign}
              variant={consolidated.balanceHoy >= 0 ? 'accent' : 'danger'}
            />
            <StatCard
              title="Ventas Hoy"
              value={consolidated.ventasHoyCount}
              subtitle="Transacciones completadas"
              icon={ShoppingCart}
            />
            <StatCard
              title="Total Productos"
              value={consolidated.totalProductos}
              subtitle="Inventario consolidado"
              icon={Package}
            />
            <StatCard
              title="Pedidos Pendientes"
              value={consolidated.pedidosPendientes}
              subtitle="En bandeja de aprobación"
              icon={AlertTriangle}
              variant={consolidated.pedidosPendientes > 0 ? 'danger' : 'default'}
            />
          </div>

          {consolidated.talleresConError > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
              ⚠ {consolidated.talleresConError} taller{consolidated.talleresConError === 1 ? '' : 'es'} no reportaron datos (error de conexión o sin dashboard).
            </div>
          )}
        </>
      )}

      {/* Talleres table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Talleres
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur z-10">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última conexión</TableHead>
                  <TableHead className="text-right">Ventas hoy</TableHead>
                  <TableHead className="text-right">Ingresos hoy</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workshops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No hay talleres registrados en el cloud.
                    </TableCell>
                  </TableRow>
                ) : (
                  workshops.map((w) => {
                    const d = dashboards[w.id]
                    const hasError = d && d.__error
                    return (
                      <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectWorkshop(w.id)}>
                        <TableCell className="font-medium">
                          <button
                            type="button"
                            className="text-left hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectWorkshop(w.id)
                            }}
                          >
                            {w.name || '—'}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <span className="block max-w-[200px] truncate" title={w.address}>
                            {w.address || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{w.phone || '—'}</TableCell>
                        <TableCell>
                          {w.isActive ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-300/40">
                              🟢 Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              ⚫ Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" title={w.lastSeenAt || ''}>
                          {timeAgo(w.lastSeenAt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {hasError ? (
                            <span className="text-amber-600 text-xs">⚠ error</span>
                          ) : d ? (
                            num(d.ventasCountHoy ?? d.ventasHoy)
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {hasError ? (
                            <span className="text-amber-600 text-xs">⚠</span>
                          ) : d ? (
                            formatMXN(num(d.ingresosHoy))
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectWorkshop(w.id)
                            }}
                          >
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
