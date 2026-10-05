'use client'

import { useStore } from '@/lib/store'
import { type VistaApp, ROL_LABELS, type RolUsuario } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard, Building2, Package, Cog, Wrench, ShoppingCart,
  Wallet, PackageOpen, ShieldCheck, Users, Settings, LogOut, ChevronLeft,
  DollarSign, RotateCcw, UserCog, Cloud,
} from 'lucide-react'
import { getInitials } from '@/lib/format'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  vista: VistaApp
  label: string
  icon: any
  roles: RolUsuario[]
  badge?: 'stockBajo' | 'pedidosPendientes' | 'comisionesPendientes'
}

const NAV_ITEMS: NavItem[] = [
  { vista: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'] },
  { vista: 'talleres', label: 'Talleres', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { vista: 'usuarios', label: 'Usuarios', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { vista: 'operarios', label: 'Operarios', icon: UserCog, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'] },
  { vista: 'inventario-productos', label: 'Productos (Venta)', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'] },
  { vista: 'inventario-piezas', label: 'Piezas (Reparación)', icon: Cog, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'] },
  { vista: 'pos', label: 'Punto de Venta', icon: ShoppingCart, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'] },
  { vista: 'servicios', label: 'Servicios', icon: Wrench, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'] },
  { vista: 'movimientos', label: 'Movimientos / Caja', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'] },
  { vista: 'pedidos', label: 'Pedidos Internos', icon: PackageOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'], badge: 'pedidosPendientes' },
  { vista: 'garantias', label: 'Garantías', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'] },
  { vista: 'devoluciones', label: 'Devoluciones', icon: RotateCcw, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { vista: 'clientes', label: 'Clientes', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'] },
  { vista: 'comisiones', label: 'Comisiones y Pagos', icon: DollarSign, roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'], badge: 'comisionesPendientes' },
  { vista: 'configuracion', label: 'Configuración', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const usuario = useStore((s) => s.usuarioActual)
  const vista = useStore((s) => s.vistaActual)
  const setVista = useStore((s) => s.setVista)
  const setVistaMode = useStore((s) => s.setVistaMode)
  const logout = useStore((s) => s.logout)
  const productos = useStore((s) => s.productos)
  const piezas = useStore((s) => s.piezas)
  const pedidos = useStore((s) => s.pedidos)
  const commissionEntries = useStore((s) => s.commissionEntries)

  if (!usuario) return null

  const itemsFiltrados = NAV_ITEMS.filter((item) => item.roles.includes(usuario.rol))

  const stockBajo = [
    ...productos.filter((p) => p.activo && p.stock <= p.stockMinimo),
    ...piezas.filter((p) => p.activo && p.stock <= p.stockMinimo),
  ].length
  const pedidosPendientes = pedidos.filter((p) => p.estado === 'PENDIENTE').length
  // Comisiones pendientes: para operarios, las suyas; para admin, todas las del taller
  const comisionesPendientes = commissionEntries.filter(
    (ce) => ce.estado === 'ACTIVE' && !ce.operatorPaymentId &&
    (usuario.rol === 'SUPER_ADMIN' || usuario.rol === 'ADMIN' ? true : ce.operarioId === usuario.id)
  ).length

  const handleNav = (v: VistaApp) => {
    setVista(v)
    onClose()
  }

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 transform transition-transform duration-200',
          'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-black tracking-tight leading-tight">Te Reparo</p>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">
                Manager
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={onClose}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Usuario actual */}
          <div className="px-3 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-sidebar-accent/50">
              <Avatar className="h-8 w-8 border border-sidebar-border">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                  {getInitials(usuario.nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{usuario.nombre}</p>
                <p className="text-[10px] text-sidebar-foreground/60">{ROL_LABELS[usuario.rol]}</p>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
            {itemsFiltrados.map((item) => {
              const Icon = item.icon
              const activo = vista === item.vista
              const badgeCount =
                item.badge === 'stockBajo' ? stockBajo
                : item.badge === 'pedidosPendientes' ? pedidosPendientes
                : item.badge === 'comisionesPendientes' ? comisionesPendientes
                : 0
              return (
                <button
                  key={item.vista}
                  onClick={() => handleNav(item.vista)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    activo
                      ? 'bg-accent text-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {badgeCount > 0 && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                      {badgeCount}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-sidebar-border space-y-0.5">
            {/* Botón "Modo Admin Multi-Taller" — solo SUPER_ADMIN */}
            {usuario.rol === 'SUPER_ADMIN' && (
              <button
                onClick={() => {
                  setVistaMode('admin')
                  onClose()
                }}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <Cloud className="h-4 w-4 shrink-0" />
                Modo Admin Multi-Taller
              </button>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
