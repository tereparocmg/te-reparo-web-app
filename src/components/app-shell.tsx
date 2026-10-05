'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { setTipoCambio } from '@/lib/format'
import { Sidebar } from './sidebar'
import { ThemeToggle } from './theme-toggle'
import { SyncBadge } from './sync-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Menu, Building2, Bell } from 'lucide-react'
import { DashboardModule } from './modules/dashboard'
import { TalleresModule } from './modules/talleres'
import { UsuariosModule } from './modules/usuarios'
import { InventarioProductosModule } from './modules/inventario-productos'
import { InventarioPiezasModule } from './modules/inventario-piezas'
import { PosModule } from './modules/pos'
import { ServiciosModule } from './modules/servicios'
import { OperariosModule } from './modules/operarios'
import { MovimientosModule } from './modules/movimientos'
import { PedidosModule } from './modules/pedidos'
import { GarantiasModule } from './modules/garantias'
import { ClientesModule } from './modules/clientes'
import { ConfiguracionModule } from './modules/configuracion'
import { ComisionesModule } from './modules/comisiones'
import { DevolucionesModule } from './modules/devoluciones'
import { ROL_LABELS, type VistaApp } from '@/lib/types'

const VISTA_TITULOS: Record<VistaApp, string> = {
  dashboard: 'Dashboard',
  talleres: 'Gestión de Talleres',
  usuarios: 'Gestión de Usuarios',
  'inventario-productos': 'Inventario de Productos',
  'inventario-piezas': 'Inventario de Piezas',
  pos: 'Punto de Venta (POS)',
  servicios: 'Servicios',
  operarios: 'Gestión de Operarios',
  movimientos: 'Movimientos y Caja',
  pedidos: 'Pedidos Internos',
  garantias: 'Garantías',
  clientes: 'Gestión de Clientes',
  configuracion: 'Configuración',
  comisiones: 'Comisiones y Pagos a Operarios',
  devoluciones: 'Devoluciones',
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const usuario = useStore((s) => s.usuarioActual)
  const tallerActualId = useStore((s) => s.tallerActualId)
  const setTallerActual = useStore((s) => s.setTallerActual)
  const vista = useStore((s) => s.vistaActual)
  const talleres = useStore((s) => s.talleres)
  const pedidos = useStore((s) => s.pedidos)
  const tipoCambio = useStore((s) => s.configuracion.tipoCambio)

  // Sincronizar tipo de cambio global para que formatMXN lo use
  useEffect(() => {
    setTipoCambio(tipoCambio || 650)
  }, [tipoCambio])

  // Cargar todos los datos desde la API (Next.js + Prisma + SQLite) al montar la app
  useEffect(() => {
    useStore.getState().bootstrapFromBackend()
  }, [])

  if (!usuario) return null

  const talleresAsignados = talleres.filter(
    (t) => usuario.rol === 'SUPER_ADMIN' || usuario.tallerIds.includes(t.id)
  )
  const tallerActual = talleres.find((t) => t.id === tallerActualId)
  const pedidosPendientes = pedidos.filter((p) => p.estado === 'PENDIENTE').length

  const renderVista = () => {
    switch (vista) {
      case 'dashboard': return <DashboardModule />
      case 'talleres': return <TalleresModule />
      case 'usuarios': return <UsuariosModule />
      case 'inventario-productos': return <InventarioProductosModule />
      case 'inventario-piezas': return <InventarioPiezasModule />
      case 'pos': return <PosModule />
      case 'servicios': return <ServiciosModule />
      case 'operarios': return <OperariosModule />
      case 'movimientos': return <MovimientosModule />
      case 'pedidos': return <PedidosModule />
      case 'garantias': return <GarantiasModule />
      case 'clientes': return <ClientesModule />
      case 'configuracion': return <ConfiguracionModule />
      case 'comisiones': return <ComisionesModule />
      case 'devoluciones': return <DevolucionesModule />
      default: return <DashboardModule />
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-full items-center gap-3 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold truncate">
                {VISTA_TITULOS[vista]}
              </h2>
            </div>

            {/* Selector de taller */}
            {talleresAsignados.length > 1 && (
              <Select
                value={tallerActualId || ''}
                onValueChange={(v) => setTallerActual(v)}
              >
                <SelectTrigger className="w-auto hidden sm:flex h-9 gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {talleresAsignados.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {talleresAsignados.length === 1 && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{tallerActual?.nombre}</span>
              </div>
            )}

            {/* Rol badge */}
            <Badge variant="outline" className="hidden md:inline-flex">
              {ROL_LABELS[usuario.rol]}
            </Badge>

            {/* Notificaciones (pedidos pendientes) */}
            {pedidosPendientes > 0 && (usuario.rol === 'SUPER_ADMIN' || usuario.rol === 'ADMIN') && (
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {pedidosPendientes}
                </span>
              </Button>
            )}

            <ThemeToggle />
            <SyncBadge />
          </div>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {renderVista()}
          </div>
        </main>
      </div>
    </div>
  )
}
