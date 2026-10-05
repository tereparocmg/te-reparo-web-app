'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ShieldCheck, Eye, Printer, AlertTriangle, FileText, Clock, CheckCircle2, XCircle,
} from 'lucide-react'
import { WarrantyCertificate } from '@/components/shared/warranty-certificate'
import { formatDate, daysBetween } from '@/lib/format'
import { type Garantia, type ResolucionReclamacion } from '@/lib/types'
import { toast } from 'sonner'

export function GarantiasModule() {
  const garantias = useStore((s) => s.garantias)
  const reclamaciones = useStore((s) => s.reclamaciones)
  const talleres = useStore((s) => s.talleres)
  const clientes = useStore((s) => s.clientes)
  const ventas = useStore((s) => s.ventas)
  // Defensive fallback: `s.ordenes` was renamed to `s.servicios` in the new
  // architecture. Without this guard, `ordenes` would be `undefined` and any
  // downstream `.map` / `.find` would crash at runtime.
  const ordenes = useStore((s) => s.ordenes) || useStore((s) => s.servicios) || []
  const usuarios = useStore((s) => s.usuarios)
  const usuarioActual = useStore((s) => s.usuarioActual)

  const [filtro, setFiltro] = useState('todas')
  const [verGarantia, setVerGarantia] = useState<Garantia | null>(null)
  const [dialogReclamacion, setDialogReclamacion] = useState<Garantia | null>(null)
  const [dialogReasignar, setDialogReasignar] = useState<Garantia | null>(null)
  const [reclamacionForm, setReclamacionForm] = useState<{ descripcion: string; resolucion: ResolucionReclamacion; motivoResolucion: string }>({
    descripcion: '', resolucion: 'REPARACION_SIN_COSTO', motivoResolucion: '',
  })
  const [nuevoClienteId, setNuevoClienteId] = useState('')

  const esSuperAdmin = usuarioActual?.rol === 'SUPER_ADMIN'
  const esAdmin = usuarioActual?.rol === 'ADMIN'
  const puedeReasignar = esSuperAdmin || esAdmin

  const talleresIds = esSuperAdmin
    ? talleres.map((t) => t.id)
    : usuarioActual?.tallerIds || []

  const garantiasFiltradas = useMemo(() => {
    return garantias.filter((g) => {
      if (!talleresIds.includes(g.tallerId)) return false
      if (filtro === 'todas') return true
      if (filtro === 'activas') return g.estado === 'ACTIVA'
      if (filtro === 'porVencer') {
        if (g.estado !== 'ACTIVA') return false
        const dias = daysBetween(new Date(), new Date(g.fechaVencimiento))
        return dias >= 0 && dias <= 15
      }
      if (filtro === 'vencidas') return g.estado === 'VENCIDA' || (g.estado === 'ACTIVA' && new Date(g.fechaVencimiento) < new Date())
      if (filtro === 'invalidadas') return g.estado === 'INVALIDADA'
      return true
    })
  }, [garantias, talleresIds, filtro])

  const guardarReclamacion = async () => {
    if (!dialogReclamacion) return
    if (!reclamacionForm.descripcion.trim()) {
      toast.error('La descripción es obligatoria')
      return
    }
    try {
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI, y hace fallback al crearReclamacion de Zustand en modo web puro.
      // El adapter ya sincroniza Zustand desde SQLite tras la mutación.
      await useDataService().crearReclamacion({
        garantiaId: dialogReclamacion.id,
        descripcion: reclamacionForm.descripcion,
        resolucion: reclamacionForm.resolucion,
        motivoResolucion: reclamacionForm.motivoResolucion,
      })
      toast.success('Reclamación registrada')
      setReclamacionForm({ descripcion: '', resolucion: 'REPARACION_SIN_COSTO', motivoResolucion: '' })
      setDialogReclamacion(null)
    } catch (err: any) {
      console.error('[Garantias] Error al crear reclamación:', err)
      toast.error('Error al crear la reclamación', { description: err?.message })
    }
  }

  const handleReasignar = async () => {
    if (!dialogReasignar || !nuevoClienteId) return
    try {
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI, y hace fallback al reasignarGarantia de Zustand en modo web puro.
      // El adapter ya sincroniza Zustand desde SQLite tras la mutación.
      await useDataService().reasignarGarantia(dialogReasignar.id, nuevoClienteId)
      toast.success('Garantía reasignada al cliente')
      setDialogReasignar(null)
      setNuevoClienteId('')
    } catch (err: any) {
      console.error('[Garantias] Error al reasignar garantía:', err)
      toast.error('Error al reasignar la garantía', { description: err?.message })
    }
  }

  const getEstadoInfo = (g: Garantia) => {
    if (g.estado === 'INVALIDADA') return { label: 'Invalidada', variant: 'destructive' as const }
    if (g.estado === 'VENCIDA' || new Date(g.fechaVencimiento) < new Date()) {
      return { label: 'Vencida', variant: 'secondary' as const }
    }
    const dias = daysBetween(new Date(), new Date(g.fechaVencimiento))
    if (dias <= 15) return { label: `Por vencer (${dias}d)`, variant: 'default' as const }
    return { label: 'Activa', variant: 'default' as const }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Garantías"
        description="Gestión de garantías de productos y servicios"
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'todas', label: 'Todas' },
          { value: 'activas', label: 'Activas' },
          { value: 'porVencer', label: 'Por vencer (15d)' },
          { value: 'vencidas', label: 'Vencidas' },
          { value: 'invalidadas', label: 'Invalidadas' },
        ].map((f) => (
          <Button
            key={f.value}
            variant={filtro === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Días Rest.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {garantiasFiltradas.map((g) => {
                const cliente = clientes.find((c) => c.id === g.clienteId)
                const estadoInfo = getEstadoInfo(g)
                const diasRest = daysBetween(new Date(), new Date(g.fechaVencimiento))
                const numReclamaciones = reclamaciones.filter((r) => r.garantiaId === g.id).length
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-xs font-bold">{g.folio}</TableCell>
                    <TableCell>
                      <Badge variant={g.tipo === 'PRODUCTO' ? 'secondary' : 'outline'}>
                        {g.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        {cliente?.nombre || '—'}
                        {cliente?.esClienteGeneral && (
                          <Badge variant="outline" className="ml-1 text-[10px]">GENERAL</Badge>
                        )}
                      </div>
                      {numReclamaciones > 0 && (
                        <span className="text-xs text-accent">{numReclamaciones} reclamación(es)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(g.fechaInicio)}</TableCell>
                    <TableCell className="text-xs">{formatDate(g.fechaVencimiento)}</TableCell>
                    <TableCell className="text-center">
                      <span className={diasRest < 0 ? 'text-red-600 font-bold' : diasRest <= 15 ? 'text-accent font-bold' : ''}>
                        {diasRest < 0 ? 'Vencida' : `${diasRest}d`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={estadoInfo.variant}>{estadoInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVerGarantia(g)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {g.estado === 'ACTIVA' && diasRest >= 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDialogReclamacion(g)}
                            title="Registrar reclamación"
                          >
                            <AlertTriangle className="h-4 w-4 text-accent" />
                          </Button>
                        )}
                        {puedeReasignar && cliente?.esClienteGeneral && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDialogReasignar(g)}
                            title="Reasignar a cliente"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {garantiasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay garantías en este filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog ver garantía */}
      <Dialog open={!!verGarantia} onOpenChange={(o) => !o && setVerGarantia(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certificado de Garantía — {verGarantia?.folio}</DialogTitle>
          </DialogHeader>
          {verGarantia && <WarrantyCertificate garantiaId={verGarantia.id} />}

          {/* Reclamaciones previas */}
          {verGarantia && reclamaciones.filter((r) => r.garantiaId === verGarantia.id).length > 0 && (
            <div className="no-print border-t pt-4">
              <h4 className="text-sm font-semibold mb-2">Reclamaciones Anteriores</h4>
              <div className="space-y-2">
                {reclamaciones.filter((r) => r.garantiaId === verGarantia.id).map((r) => {
                  const atendio = usuarios.find((u) => u.id === r.atendidaPorId)
                  return (
                    <div key={r.id} className="p-2 rounded border text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline">{r.resolucion}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(r.fecha, true)}</span>
                      </div>
                      <p className="text-sm">{r.descripcion}</p>
                      {r.motivoResolucion && <p className="text-xs text-muted-foreground mt-1">Motivo: {r.motivoResolucion}</p>}
                      <p className="text-xs text-muted-foreground">Atendió: {atendio?.nombre}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DialogFooter className="no-print">
            <Button variant="outline" onClick={() => setVerGarantia(null)}>Cerrar</Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog reclamación */}
      <Dialog open={!!dialogReclamacion} onOpenChange={(o) => !o && setDialogReclamacion(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Reclamación de Garantía</DialogTitle>
          </DialogHeader>
          {dialogReclamacion && (
            <div className="p-3 rounded-lg bg-muted mb-3 text-sm">
              <p className="font-medium">Folio: {dialogReclamacion.folio}</p>
              <p className="text-xs text-muted-foreground">
                Tipo: {dialogReclamacion.tipo} · Vence: {formatDate(dialogReclamacion.fechaVencimiento)}
              </p>
            </div>
          )}
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Descripción del problema *</Label>
              <Textarea
                value={reclamacionForm.descripcion}
                onChange={(e) => setReclamacionForm({ ...reclamacionForm, descripcion: e.target.value })}
                rows={3}
                placeholder="Describe el problema reportado por el cliente"
              />
            </div>
            <div className="space-y-2">
              <Label>Resolución</Label>
              <Select
                value={reclamacionForm.resolucion}
                onValueChange={(v) => setReclamacionForm({ ...reclamacionForm, resolucion: v as ResolucionReclamacion })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPARACION_SIN_COSTO">Reparación sin costo</SelectItem>
                  <SelectItem value="REEMPLAZO">Reemplazo</SelectItem>
                  <SelectItem value="RECHAZO">Rechazo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo de la resolución</Label>
              <Textarea
                value={reclamacionForm.motivoResolucion}
                onChange={(e) => setReclamacionForm({ ...reclamacionForm, motivoResolucion: e.target.value })}
                rows={2}
                placeholder="Explica el motivo de la resolución"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReclamacion(null)}>Cancelar</Button>
            <Button onClick={guardarReclamacion}>Registrar Reclamación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog reasignar garantía */}
      <Dialog open={!!dialogReasignar} onOpenChange={(o) => !o && setDialogReasignar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reasignar Garantía a Cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta garantía está asociada al Cliente General. Puedes reasignarla a un cliente registrado.
          </p>
          <div className="space-y-2 py-2">
            <Label>Cliente destino</Label>
            <Select value={nuevoClienteId} onValueChange={setNuevoClienteId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
              <SelectContent>
                {clientes.filter((c) => !c.esClienteGeneral).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReasignar(null)}>Cancelar</Button>
            <Button onClick={handleReasignar} disabled={!nuevoClienteId}>Reasignar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
