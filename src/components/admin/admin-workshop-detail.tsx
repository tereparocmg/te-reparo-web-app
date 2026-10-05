'use client'

// ============================================================
// AdminWorkshopDetail — single workshop drill-down.
// Shows workshop info header + KPI cards + tabs for every
// cloud resource belonging to that workshop. Each tab renders
// an AdminResourceBrowser for that tableName.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle, DollarSign, Package, ShoppingCart, Wallet, Wrench, Boxes,
} from 'lucide-react'
import { toast } from 'sonner'
import { cloudGetWorkshopDashboard } from '@/lib/cloud-data-service'
import { formatMXN } from '@/lib/format'
import { AdminResourceBrowser } from '@/components/admin/admin-resource-browser'

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
// Tabs definition
// ============================================================

interface TabDef {
  tableName: string
  label: string
}

const TABS: TabDef[] = [
  { tableName: 'venta', label: 'Ventas' },
  { tableName: 'servicio', label: 'Servicios' },
  { tableName: 'producto', label: 'Productos' },
  { tableName: 'pieza', label: 'Piezas' },
  { tableName: 'cliente', label: 'Clientes' },
  { tableName: 'movimiento', label: 'Movimientos' },
  { tableName: 'garantia', label: 'Garantías' },
  { tableName: 'usuario', label: 'Usuarios' },
  { tableName: 'operario', label: 'Operarios' },
  { tableName: 'pedidoInterno', label: 'Pedidos' },
  { tableName: 'devolucion', label: 'Devoluciones' },
  { tableName: 'commissionEntry', label: 'Comisiones' },
  { tableName: 'operatorPayment', label: 'Pagos' },
  { tableName: 'configuracionGlobal', label: 'Configuración' },
]

// ============================================================
// Component
// ============================================================

interface AdminWorkshopDetailProps {
  workshopId: string
  workshops: any[]
}

export function AdminWorkshopDetail({ workshopId, workshops }: AdminWorkshopDetailProps) {
  const [dashboard, setDashboard] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('venta')
  const mountedRef = useRef(true)

  const workshop = workshops.find((w) => w.id === workshopId)

  const fetchDashboard = useCallback(async () => {
    if (!workshopId) return
    setLoading(true)
    try {
      const d = await cloudGetWorkshopDashboard(workshopId)
      if (!mountedRef.current) return
      setDashboard(d)
    } catch (err: any) {
      console.error('[admin-workshop-detail] dashboard error', err)
      toast.error('Error al cargar KPIs del taller', { description: err?.message })
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [workshopId])

  useEffect(() => {
    mountedRef.current = true
    fetchDashboard()
    return () => {
      mountedRef.current = false
    }
  }, [fetchDashboard])

  // ============================================================
  // KPI grid for the workshop
  // ============================================================

  const kpis = dashboard || {}
  const kpiCards = [
    {
      title: 'Ventas Hoy',
      value: num(kpis.ventasCountHoy ?? kpis.ventasHoy),
      subtitle: 'Transacciones completadas',
      icon: ShoppingCart,
      variant: 'default' as const,
    },
    {
      title: 'Ingresos Hoy',
      value: formatMXN(num(kpis.ingresosHoy)),
      subtitle: 'Entradas de caja',
      icon: DollarSign,
      variant: 'success' as const,
    },
    {
      title: 'Gastos Hoy',
      value: formatMXN(num(kpis.gastosHoy)),
      subtitle: 'Salidas + compras',
      icon: Wallet,
      variant: 'danger' as const,
    },
    {
      title: 'Balance Hoy',
      value: formatMXN(num(kpis.balanceHoy)),
      subtitle: 'Ingresos − Gastos',
      icon: DollarSign,
      variant: num(kpis.balanceHoy) >= 0 ? ('accent' as const) : ('danger' as const),
    },
    {
      title: 'Total Productos',
      value: num(kpis.totalProductos),
      subtitle: 'En inventario',
      icon: Package,
      variant: 'default' as const,
    },
    {
      title: 'Total Piezas',
      value: num(kpis.totalPiezas),
      subtitle: 'En inventario',
      icon: Boxes,
      variant: 'default' as const,
    },
    {
      title: 'Stock Bajo',
      value: num(kpis.productosStockBajo),
      subtitle: 'Productos bajo mínimo',
      icon: AlertTriangle,
      variant: num(kpis.productosStockBajo) > 0 ? ('danger' as const) : ('default' as const),
    },
    {
      title: 'Pedidos Pendientes',
      value: num(kpis.pedidosPendientes),
      subtitle: 'En bandeja de aprobación',
      icon: Wrench,
      variant: num(kpis.pedidosPendientes) > 0 ? ('danger' as const) : ('default' as const),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Workshop info header */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold truncate">
                  {workshop?.name || `Taller ${workshopId.slice(0, 8)}`}
                </h2>
                {workshop?.isActive ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-300/40">
                    🟢 Activo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    ⚫ Inactivo
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Dirección: </span>
                  {workshop?.address || '—'}
                </div>
                <div>
                  <span className="font-medium text-foreground">Teléfono: </span>
                  {workshop?.phone || '—'}
                </div>
                <div>
                  <span className="font-medium text-foreground">Última conexión: </span>
                  <span title={workshop?.lastSeenAt || ''}>
                    {timeAgo(workshop?.lastSeenAt)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">ID: </span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{workshopId}</code>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading}>
              {loading ? 'Cargando...' : 'Refrescar KPIs'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {kpiCards.map((k) => (
            <MiniKpi key={k.title} {...k} />
          ))}
        </div>
      )}

      {/* Tabs with resource browsers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recursos del Taller</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full overflow-x-auto pb-2">
              <TabsList className="flex w-max">
                {TABS.map((t) => (
                  <TabsTrigger key={t.tableName} value={t.tableName} className="text-xs">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {TABS.map((t) => (
              <TabsContent key={t.tableName} value={t.tableName} className="mt-4">
                {activeTab === t.tableName ? (
                  <AdminResourceBrowser workshopId={workshopId} tableName={t.tableName} />
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// MiniKpi — compact KPI card for the workshop detail view
// ============================================================

function MiniKpi({
  title, value, subtitle, icon: Icon, variant,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  variant?: 'default' | 'accent' | 'danger' | 'success'
}) {
  const colorClass = {
    default: 'text-foreground',
    accent: 'text-accent-foreground',
    danger: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
  }[variant || 'default']
  const bgClass = {
    default: 'bg-muted text-muted-foreground',
    accent: 'bg-accent/10 text-accent',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  }[variant || 'default']
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className={`text-lg font-bold truncate ${colorClass}`}>{value}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className={`flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${bgClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
