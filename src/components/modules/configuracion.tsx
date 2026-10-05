'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Settings, Save, Building2, Globe, ShieldCheck, DollarSign,
  RefreshCw, Wifi, WifiOff, Loader2, Plug, Database, Eye, EyeOff,
} from 'lucide-react'
import { setTipoCambio, formatUSD, formatCUP } from '@/lib/format'
import { toast } from 'sonner'

export function ConfiguracionModule() {
  const configuracion = useStore((s) => s.configuracion)
  const talleres = useStore((s) => s.talleres)
  const usuarioActual = useStore((s) => s.usuarioActual)

  const esSuperAdmin = usuarioActual?.rol === 'SUPER_ADMIN'
  const [configGlobal, setConfigGlobal] = useState(configuracion)
  const [tallerEditId, setTallerEditId] = useState<string>(talleres[0]?.id || '')
  const [tallerDatos, setTallerDatos] = useState(
    talleres.find((t) => t.id === talleres[0]?.id) || null
  )

  // --- Sincronización con Cloud (solo SUPER_ADMIN) ---
  const [cloudStatus, setCloudStatus] = useState<any>(null)
  const [syncConfig, setSyncConfig] = useState({
    serverUrl: '', apiToken: '', workshopId: '',
    syncEnabled: false, syncIntervalSec: 30,
  })
  const [registerForm, setRegisterForm] = useState({ serverUrl: '', name: '', address: '', phone: '' })
  const [showToken, setShowToken] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [bootstrapOpen, setBootstrapOpen] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [ticking, setTicking] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)

  // Sincronizar tipo de cambio global con el módulo de formato
  useEffect(() => {
    setTipoCambio(configuracion.tipoCambio || 650)
  }, [configuracion.tipoCambio])

  // --- Cloud sync: polling de estado cada 15s + fetch inicial de config ---
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status')
      if (res.ok) setCloudStatus(await res.json())
    } catch {
      // ignore
    }
  }, [])

  const fetchCloudConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/config')
      if (res.ok) {
        const d = await res.json()
        setSyncConfig({
          serverUrl: d.serverUrl || '',
          apiToken: d.apiToken || '',
          workshopId: d.workshopId || '',
          syncEnabled: d.syncEnabled ?? false,
          syncIntervalSec: d.syncIntervalSec || 30,
        })
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!esSuperAdmin) return
    fetchCloudConfig()
    refreshStatus()
    const timer = setInterval(refreshStatus, 15000)
    return () => clearInterval(timer)
  }, [esSuperAdmin, fetchCloudConfig, refreshStatus])

  const guardarGlobal = async () => {
    try {
      await useDataService().updateConfiguracion(configGlobal)
      setTipoCambio(configGlobal.tipoCambio || 650)
      toast.success('Configuración global guardada')
    } catch (err: any) {
      console.error('[Configuracion] Error al guardar configuracion global:', err)
      toast.error('Error al guardar la configuración', { description: err?.message })
    }
  }

  const guardarTaller = async () => {
    if (!tallerDatos) return
    try {
      await useDataService().updateTallerConfig(tallerDatos.id, tallerDatos)
      toast.success('Configuración del taller guardada')
    } catch (err: any) {
      console.error('[Configuracion] Error al guardar configuracion del taller:', err)
      toast.error('Error al guardar la configuración', { description: err?.message })
    }
  }

  const cambiarTaller = (id: string) => {
    setTallerEditId(id)
    setTallerDatos(talleres.find((t) => t.id === id) || null)
  }

  // --- Cloud sync handlers ---
  const handleSaveSyncConfig = async () => {
    setSavingConfig(true)
    try {
      const res = await fetch('/api/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: syncConfig.serverUrl,
          apiToken: syncConfig.apiToken,
          syncEnabled: syncConfig.syncEnabled,
          syncIntervalSec: syncConfig.syncIntervalSec,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`)
      toast.success('Configuración de sync guardada')
      refreshStatus()
    } catch (err: any) {
      toast.error('Error al guardar la config de sync', { description: err?.message })
    } finally {
      setSavingConfig(false)
    }
  }

  const handlePing = async () => {
    setPinging(true)
    try {
      const res = await fetch('/api/sync/ping', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`)
      if (d.online) {
        toast.success('Conexión OK', { description: `Latencia: ${d.latencyMs ?? '?'}ms` })
      } else {
        toast.error('Cloud no responde', { description: d.error || 'Sin respuesta' })
      }
      refreshStatus()
    } catch (err: any) {
      toast.error('Error al hacer ping', { description: err?.message })
    } finally {
      setPinging(false)
    }
  }

  const handleRegister = async () => {
    setRegistering(true)
    try {
      const res = await fetch('/api/sync/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: registerForm.serverUrl,
          name: registerForm.name,
          address: registerForm.address,
          phone: registerForm.phone,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`)
      toast.success('Taller registrado en el cloud', {
        description: `API Token: ${d.apiToken?.slice(0, 20) || ''}...`,
      })
      setSyncConfig({
        serverUrl: d.serverUrl || registerForm.serverUrl,
        apiToken: d.apiToken || '',
        workshopId: d.workshop?.id || '',
        syncEnabled: true,
        syncIntervalSec: syncConfig.syncIntervalSec,
      })
      setRegisterOpen(false)
      refreshStatus()
    } catch (err: any) {
      toast.error('Error al registrar taller', { description: err?.message })
    } finally {
      setRegistering(false)
    }
  }

  const handleBootstrap = () => setBootstrapOpen(true)

  const confirmBootstrap = async () => {
    setBootstrapping(true)
    try {
      const res = await fetch('/api/sync/bootstrap', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`)
      toast.success('Bootstrap completado', { description: `Aplicados: ${d.applied ?? '?'}` })
      setBootstrapOpen(false)
      refreshStatus()
    } catch (err: any) {
      toast.error('Error en bootstrap', { description: err?.message })
    } finally {
      setBootstrapping(false)
    }
  }

  const handleForceSync = async () => {
    setTicking(true)
    try {
      const res = await fetch('/api/sync/tick', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`)
      toast.success('Sincronización forzada')
      refreshStatus()
    } catch (err: any) {
      toast.error('Error al forzar sync', { description: err?.message })
    } finally {
      setTicking(false)
    }
  }

  const talleresDisponibles = esSuperAdmin
    ? talleres
    : talleres.filter((t) => usuarioActual?.tallerIds.includes(t.id))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description={esSuperAdmin ? 'Parámetros globales y por taller' : 'Configuración del taller'}
        icon={<Settings className="h-5 w-5" />}
      />

      {esSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-accent" />
              Configuración Global
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de cambio */}
            <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-accent" />
                <h4 className="text-sm font-semibold">Tipo de Cambio</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Todos los precios se ingresan en USD (dólares). El sistema calcula automáticamente el equivalente en CUP (pesos cubanos) usando este tipo de cambio.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label>1 USD =</Label>
                  <Input
                    type="number"
                    step="1"
                    value={configGlobal.tipoCambio || 0}
                    onChange={(e) => setConfigGlobal({ ...configGlobal, tipoCambio: Number(e.target.value) })}
                    placeholder="650"
                  />
                </div>
                <div className="text-sm font-semibold pt-5">CUP</div>
              </div>
              <div className="mt-3 p-2 rounded bg-muted text-xs space-y-1">
                <p>Ejemplo con tipo de cambio actual:</p>
                <p>$100.00 USD = <strong>{formatCUP(100 * (configGlobal.tipoCambio || 650))}</strong></p>
                <p>$50.00 USD = <strong>{formatCUP(50 * (configGlobal.tipoCambio || 650))}</strong></p>
                <p>$1000.00 USD = <strong>{formatCUP(1000 * (configGlobal.tipoCambio || 650))}</strong></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>País</Label>
                <Input
                  value={configGlobal.pais || 'Cuba'}
                  onChange={(e) => setConfigGlobal({ ...configGlobal, pais: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Formato de Ticket</Label>
                <Input
                  value={configGlobal.formatoTicket || ''}
                  onChange={(e) => setConfigGlobal({ ...configGlobal, formatoTicket: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Datos de la Empresa</Label>
                <Textarea
                  value={configGlobal.datosFiscalesEmpresa || ''}
                  onChange={(e) => setConfigGlobal({ ...configGlobal, datosFiscalesEmpresa: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <Button onClick={guardarGlobal}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración Global
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Configuración por taller */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-accent" />
            Configuración por Taller
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {talleresDisponibles.length > 1 && (
            <div className="space-y-2">
              <Label>Seleccionar Taller</Label>
              <div className="flex flex-wrap gap-2">
                {talleresDisponibles.map((t) => (
                  <Button
                    key={t.id}
                    variant={tallerEditId === t.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => cambiarTaller(t.id)}
                  >
                    {t.nombre}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {tallerDatos && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Taller</Label>
                  <Input
                    value={tallerDatos.nombre}
                    onChange={(e) => setTallerDatos({ ...tallerDatos, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Encargado</Label>
                  <Input
                    value={tallerDatos.encargado || ''}
                    onChange={(e) => setTallerDatos({ ...tallerDatos, encargado: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={tallerDatos.direccion}
                    onChange={(e) => setTallerDatos({ ...tallerDatos, direccion: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={tallerDatos.telefono}
                    onChange={(e) => setTallerDatos({ ...tallerDatos, telefono: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horario Apertura</Label>
                  <Input
                    type="time"
                    value={tallerDatos.horarioApertura || ''}
                    onChange={(e) => setTallerDatos({ ...tallerDatos, horarioApertura: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horario Cierre</Label>
                  <Input
                    type="time"
                    value={tallerDatos.horarioCierre || ''}
                    onChange={(e) => setTallerDatos({ ...tallerDatos, horarioCierre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Métodos de Pago (separados por coma)</Label>
                  <Input
                    value={tallerDatos.metodosPago}
                    onChange={(e) => setTallerDatos({ ...tallerDatos, metodosPago: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <h4 className="text-sm font-semibold">Configuración de Garantías</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Garantía por defecto — Productos (días)</Label>
                    <Input
                      type="number"
                      value={tallerDatos.garantiaProductoDias}
                      onChange={(e) => setTallerDatos({ ...tallerDatos, garantiaProductoDias: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Garantía por defecto — Servicios (días)</Label>
                    <Input
                      type="number"
                      value={tallerDatos.garantiaServicioDias}
                      onChange={(e) => setTallerDatos({ ...tallerDatos, garantiaServicioDias: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Plantilla de Texto para Certificados de Garantía</Label>
                  <Textarea
                    value={tallerDatos.plantillaGarantia || ''}
                    onChange={(e) => setTallerDatos({ ...tallerDatos, plantillaGarantia: e.target.value })}
                    rows={4}
                    placeholder="Esta garantía cubre defectos de fabricación e instalación por el período indicado..."
                  />
                </div>
              </div>

              <Button onClick={guardarTaller}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración del Taller
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {esSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-accent" />
              Sincronización con Cloud
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado de solo lectura */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Conexión</p>
                {cloudStatus?.online ? (
                  <Badge className="bg-green-600 text-white"><Wifi className="h-3 w-3" />Online</Badge>
                ) : (
                  <Badge variant="destructive"><WifiOff className="h-3 w-3" />Offline</Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Worker</p>
                {cloudStatus?.running ? (
                  <Badge className="bg-green-600 text-white">Activo</Badge>
                ) : (
                  <Badge variant="secondary">Detenido</Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Cola pendiente</p>
                <p className="font-semibold">{cloudStatus?.queue?.pending ?? 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Errores</p>
                <p className="font-semibold">{cloudStatus?.queue?.errors ?? 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Últ. push</p>
                <p className="text-xs">{cloudStatus?.state?.lastPushAt ? new Date(cloudStatus.state.lastPushAt).toLocaleString('es-ES') : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Últ. pull</p>
                <p className="text-xs">{cloudStatus?.state?.lastPullAt ? new Date(cloudStatus.state.lastPullAt).toLocaleString('es-ES') : '—'}</p>
              </div>
            </div>
            {cloudStatus?.state?.lastError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-xs">
                <p className="font-medium text-destructive">Último error:</p>
                <p className="font-mono mt-1 break-all">{cloudStatus.state.lastError}</p>
              </div>
            )}

            <Separator />

            {/* Form de configuración */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>URL del Cloud API</Label>
                <Input
                  value={syncConfig.serverUrl}
                  onChange={(e) => setSyncConfig({ ...syncConfig, serverUrl: e.target.value })}
                  placeholder="https://te-reparo-cloud-api.up.railway.app"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>API Token (JWT)</Label>
                <div className="flex gap-2">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    value={syncConfig.apiToken}
                    onChange={(e) => setSyncConfig({ ...syncConfig, apiToken: e.target.value })}
                    placeholder="eyJhbGciOi..."
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Workshop ID</Label>
                <Input value={syncConfig.workshopId || ''} readOnly placeholder="No registrado" className="font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Intervalo (s)</Label>
                <Input
                  type="number"
                  min={5}
                  max={3600}
                  value={syncConfig.syncIntervalSec}
                  onChange={(e) => setSyncConfig({ ...syncConfig, syncIntervalSec: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between sm:col-span-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Sync automática</p>
                  <p className="text-xs text-muted-foreground">Activa el worker push/pull</p>
                </div>
                <Switch
                  checked={syncConfig.syncEnabled}
                  onCheckedChange={(v) => setSyncConfig({ ...syncConfig, syncEnabled: v })}
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveSyncConfig} disabled={savingConfig}>
                {savingConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
              <Button variant="outline" onClick={handlePing} disabled={pinging || !syncConfig.serverUrl}>
                {pinging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                Ping
              </Button>
              <Button variant="outline" onClick={handleForceSync} disabled={ticking}>
                {ticking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Forzar sync
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRegisterForm((f) => ({ ...f, serverUrl: syncConfig.serverUrl }))
                  setRegisterOpen(true)
                }}
              >
                <Plug className="h-4 w-4 mr-2" />
                Registrar taller
              </Button>
              <Button
                variant="outline"
                onClick={handleBootstrap}
                disabled={!syncConfig.serverUrl || !syncConfig.apiToken || bootstrapping}
              >
                {bootstrapping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                Bootstrap
              </Button>
            </div>

            {/* Dialog: Registrar taller nuevo */}
            <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar taller en el Cloud</DialogTitle>
                  <DialogDescription>
                    Crea un taller en el Cloud API y devuelve un API token. Solo necesario la primera vez.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-2">
                    <Label>URL del Cloud API</Label>
                    <Input
                      value={registerForm.serverUrl}
                      onChange={(e) => setRegisterForm({ ...registerForm, serverUrl: e.target.value })}
                      placeholder="https://te-reparo-cloud-api.up.railway.app"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del taller *</Label>
                    <Input value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Dirección</Label>
                      <Input value={registerForm.address} onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancelar</Button>
                  <Button onClick={handleRegister} disabled={registering || !registerForm.name || !registerForm.serverUrl}>
                    {registering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Confirmar bootstrap */}
            <Dialog open={bootstrapOpen} onOpenChange={setBootstrapOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar bootstrap</DialogTitle>
                  <DialogDescription>
                    Esto sobrescribe los datos locales con los del cloud. ¿Estás seguro? Puede tardar 10-60s.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBootstrapOpen(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={confirmBootstrap} disabled={bootstrapping}>
                    {bootstrapping && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Sí, descargar todo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Información del sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Versión</p>
            <p className="font-semibold">Te Reparo Manager v1.0</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Framework</p>
            <p className="font-semibold">Next.js 16 + TypeScript</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">País</p>
            <p className="font-semibold">{configuracion.pais || 'Cuba'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Tipo de Cambio</p>
            <p className="font-semibold">1 USD = {configuracion.tipoCambio || 650} CUP</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
