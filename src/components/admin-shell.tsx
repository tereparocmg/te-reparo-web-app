'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Menu, Cloud, Building2, ArrowLeft, RefreshCw, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { SyncBadge } from '@/components/sync-badge'
import { toast } from 'sonner'
import {
  cloudListWorkshops, cloudLogout, isLoggedInCloud, getCloudServerUrl,
} from '@/lib/cloud-data-service'
import { CloudLoginDialog } from '@/components/cloud-login-dialog'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { AdminWorkshopDetail } from '@/components/admin/admin-workshop-detail'

type AdminView = 'dashboard' | 'workshop-detail'

interface AdminShellProps {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const setVistaMode = useStore((s) => s.setVistaMode)
  const [workshops, setWorkshops] = useState<any[]>([])
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('')
  const [view, setView] = useState<AdminView>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCloudLogin, setShowCloudLogin] = useState(false)

  const loadWorkshops = async () => {
    if (!isLoggedInCloud()) {
      setShowCloudLogin(true)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await cloudListWorkshops()
      setWorkshops(list)
      if (list.length > 0 && !selectedWorkshopId) {
        setSelectedWorkshopId(list[0].id)
      }
    } catch (err: any) {
      console.error('[admin] loadWorkshops error:', err)
      toast.error('Error al cargar talleres del cloud', { description: err?.message })
      if (err?.status === 401) {
        // Token inválido, mostrar login
        setShowCloudLogin(true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkshops()
  }, [])

  const handleCloudLoginSuccess = () => {
    setShowCloudLogin(false)
    loadWorkshops()
  }

  const handleLogout = async () => {
    await cloudLogout()
    setWorkshops([])
    setSelectedWorkshopId('')
    toast.info('Desconectado del cloud')
    // Volver al modo local
    setVistaMode('local')
  }

  const handleRefresh = () => {
    loadWorkshops()
    toast.success('Lista de talleres actualizada')
  }

  const selectedWorkshop = workshops.find((w) => w.id === selectedWorkshopId)
  const serverUrl = getCloudServerUrl()

  const navItems: { key: AdminView; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard Consolidado', icon: Building2 },
    { key: 'workshop-detail', label: 'Detalle por Taller', icon: Building2 },
  ]

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 lg:w-64'} transition-all overflow-hidden border-r bg-muted/30 flex-shrink-0`}>
        <div className="w-64 h-full flex flex-col">
          <div className="h-16 flex items-center gap-2 px-4 border-b">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: '#E63946' }}>
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Te Reparo Cloud</p>
              <p className="text-[10px] text-muted-foreground">Super-Admin Multi-Taller</p>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setView(item.key)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === item.key ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/10'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>

          {selectedWorkshop && view === 'workshop-detail' && (
            <div className="p-3 border-t space-y-2">
              <Label className="text-xs text-muted-foreground">Taller seleccionado</Label>
              <Select value={selectedWorkshopId} onValueChange={setSelectedWorkshopId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workshops.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="p-3 border-t space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Desconectar Cloud
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setVistaMode('local')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a modo local
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-full items-center gap-3 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold truncate">
                {view === 'dashboard' ? 'Dashboard Multi-Taller' : `Taller: ${selectedWorkshop?.name || '...'}`}
              </h2>
              {serverUrl && (
                <p className="text-xs text-muted-foreground truncate">{serverUrl}</p>
              )}
            </div>
            <Badge variant="outline" className="hidden md:inline-flex">
              <Cloud className="h-3 w-3 mr-1" />
              {workshops.length} talleres
            </Badge>
            <ThemeToggle />
            <SyncBadge />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="mx-auto max-w-7xl">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Cargando talleres...</span>
              </div>
            ) : !isLoggedInCloud() ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Cloud className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-semibold">No conectado al Cloud</p>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Necesitas iniciar sesión con tu cuenta super-admin del Cloud API
                  para gestionar todos los talleres remotamente.
                </p>
                <Button onClick={() => setShowCloudLogin(true)}>
                  <Cloud className="h-4 w-4 mr-2" />
                  Conectar al Cloud
                </Button>
              </div>
            ) : (
              <>
                {view === 'dashboard' && (
                  <AdminDashboard workshops={workshops} onSelectWorkshop={(id) => {
                    setSelectedWorkshopId(id)
                    setView('workshop-detail')
                  }} />
                )}
                {view === 'workshop-detail' && selectedWorkshopId && (
                  <AdminWorkshopDetail workshopId={selectedWorkshopId} workshops={workshops} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <CloudLoginDialog
        open={showCloudLogin}
        onOpenChange={setShowCloudLogin}
        onSuccess={handleCloudLoginSuccess}
      />
    </div>
  )
}
