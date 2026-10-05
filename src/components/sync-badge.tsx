'use client'

import { useState, useEffect } from 'react'
import {
  Cloud, RefreshCw, CheckCircle2, AlertCircle, WifiOff, Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'

type SyncStatus = {
  running: boolean
  online: boolean
  wsConnected: boolean
  lastTickAt: string | null
  nextTickAt: string | null
  lastResult: { pushed: number; pulled: number; applied: number; errors: any[] } | null
  queue: { pending: number; errors: number; lastError: string | null; lastErrorAt: string | null }
  state: {
    workshopId: string | null
    serverUrl: string | null
    syncEnabled: boolean
    syncIntervalSec: number
    lastPullAt: string | null
    lastPushAt: string | null
    lastError: string | null
  } | null
}

export function SyncBadge() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [ticking, setTicking] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sync/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {
      // ignore
    }
  }

  // Poll status every 15s
  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 15000)
    return () => clearInterval(timer)
  }, [])

  // Force refresh when popover opens
  useEffect(() => {
    if (open) fetchStatus()
  }, [open])

  const handleTick = async () => {
    setTicking(true)
    try {
      const res = await fetch('/api/sync/tick', { method: 'POST' })
      if (res.ok) {
        toast.success('Sincronización forzada')
        await fetchStatus()
      } else {
        toast.error('Error al sincronizar')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setTicking(false)
    }
  }

  // Determinar el estado visual
  const getBadgeState = () => {
    if (!status) return { variant: 'secondary' as const, label: '...', icon: Loader2, color: 'text-muted-foreground' }
    if (!status.state?.serverUrl || !status.state?.syncEnabled) {
      return { variant: 'outline' as const, label: 'No configurado', icon: Cloud, color: 'text-muted-foreground' }
    }
    if (status.queue.pending === 0 && status.state?.lastError == null) {
      return { variant: 'default' as const, label: 'Sincronizado', icon: CheckCircle2, color: 'text-green-500' }
    }
    if (status.queue.pending > 0 && status.online) {
      return { variant: 'default' as const, label: `${status.queue.pending} pendientes`, icon: RefreshCw, color: 'text-amber-500' }
    }
    if (!status.online) {
      return { variant: 'destructive' as const, label: 'Sin conexión', icon: WifiOff, color: 'text-red-500' }
    }
    if (status.queue.errors > 0 || status.state?.lastError) {
      return { variant: 'destructive' as const, label: `${status.queue.errors} errores`, icon: AlertCircle, color: 'text-red-500' }
    }
    return { variant: 'default' as const, label: 'Sincronizado', icon: CheckCircle2, color: 'text-green-500' }
  }

  const badge = getBadgeState()
  const Icon = badge.icon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
          <Icon className={`h-4 w-4 ${ticking ? 'animate-spin' : ''} ${badge.color}`} />
          <span className="text-xs font-medium hidden sm:inline">{badge.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Estado de Sincronización</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleTick}
              disabled={ticking}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${ticking ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>

          {!status?.state?.serverUrl && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs">
              <p className="font-medium text-amber-900 mb-1">Cloud API no configurada</p>
              <p className="text-amber-700">
                Ve a <strong>Configuración → Sync</strong> para conectar este taller con la nube.
              </p>
            </div>
          )}

          {status?.state?.serverUrl && (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Conexión</p>
                  <p className="font-medium">
                    {status.online ? '🟢 Online' : '🔴 Offline'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">WebSocket</p>
                  <p className="font-medium">
                    {status.wsConnected ? '🟢 Conectado' : '⚪ Desconectado'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Worker</p>
                  <p className="font-medium">
                    {status.running ? '🟢 Activo' : '⚪ Detenido'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cola pendiente</p>
                  <p className="font-medium">{status.queue.pending} registros</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Errores</p>
                  <p className="font-medium">{status.queue.errors}</p>
                </div>
              </div>

              {status.state.lastPushAt && (
                <div className="text-xs">
                  <p className="text-muted-foreground">Último push:</p>
                  <p className="font-mono">
                    {new Date(status.state.lastPushAt).toLocaleString('es-ES')}
                  </p>
                </div>
              )}

              {status.state.lastPullAt && (
                <div className="text-xs">
                  <p className="text-muted-foreground">Último pull:</p>
                  <p className="font-mono">
                    {new Date(status.state.lastPullAt).toLocaleString('es-ES')}
                  </p>
                </div>
              )}

              {status.state.lastError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs">
                  <p className="text-red-700 font-medium">Último error:</p>
                  <p className="text-red-600 font-mono mt-1 break-all">{status.state.lastError}</p>
                </div>
              )}

              {status.lastResult && status.lastResult.pushed > 0 && (
                <div className="text-xs text-green-700 bg-green-50 rounded p-2">
                  Subidos {status.lastResult.pushed} registros · Bajados {status.lastResult.applied}
                </div>
              )}

              <div className="text-xs text-muted-foreground border-t pt-2">
                <p>Servidor: <span className="font-mono">{status.state.serverUrl}</span></p>
                <p>Workshop ID: <span className="font-mono">{status.state.workshopId || '—'}</span></p>
                <p>Intervalo: {status.state.syncIntervalSec}s</p>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
