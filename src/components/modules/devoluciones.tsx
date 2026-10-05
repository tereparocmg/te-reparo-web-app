'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RotateCcw, Check, X, Eye } from 'lucide-react'
import { formatMXN, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { type Devolucion, type EstadoDevolucion } from '@/lib/types'

export function DevolucionesModule() {
  const devoluciones = useStore((s) => s.devoluciones)
  const ventas = useStore((s) => s.ventas)
  // Defensive fallback: en la nueva arquitectura el campo `ordenes` fue renombrado
  // a `servicios`. Mantenemos el fallback a `servicios` y `[]` para evitar crashes
  // cuando el módulo se carga en un store que ya no expone `ordenes`.
  const ordenes = useStore((s) => s.ordenes) || useStore((s) => s.servicios) || []
  const productos = useStore((s) => s.productos)
  const piezas = useStore((s) => s.piezas)
  const usuarios = useStore((s) => s.usuarios)

  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [dialogRevisar, setDialogRevisar] = useState<Devolucion | null>(null)
  const [notasRevision, setNotasRevision] = useState('')

  const devolucionesFiltradas = devoluciones.filter(
    (d) => filtroEstado === 'todos' || d.estado === filtroEstado
  )

  const pendientes = devoluciones.filter((d) => d.estado === 'PENDIENTE_REVISION')
  const aprobadas = devoluciones.filter((d) => d.estado === 'APROBADA')
  const rechazadas = devoluciones.filter((d) => d.estado === 'RECHAZADA')

  const getProductoNombre = (d: Devolucion) => {
    if (d.productoId) {
      const p = productos.find((x) => x.id === d.productoId)
      return p?.nombre || 'Producto eliminado'
    }
    if (d.piezaId) {
      const p = piezas.find((x) => x.id === d.piezaId)
      return p?.nombre || 'Pieza eliminada'
    }
    return '—'
  }

  const getOrigen = (d: Devolucion) => {
    if (d.ventaId) {
      const v = ventas.find((x) => x.id === d.ventaId)
      return v ? `Venta ${v.folio}` : 'Venta eliminada'
    }
    if (d.ordenId) {
      const o = ordenes.find((x) => x.id === d.ordenId)
      return o ? `Orden ${o.folio}` : 'Orden eliminada'
    }
    return '—'
  }

  const abrirRevisar = (d: Devolucion) => {
    setDialogRevisar(d)
    setNotasRevision('')
  }

  const handleRevisar = async (estado: EstadoDevolucion) => {
    if (!dialogRevisar) return
    try {
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI, y hace fallback a revisarDevolucion de Zustand en modo web
      // puro. El adapter ya sincroniza Zustand desde SQLite tras la mutación.
      await useDataService().revisarDevolucion(dialogRevisar.id, estado, notasRevision)
      toast.success(
        estado === 'APROBADA'
          ? 'Devolución aprobada — stock devuelto al inventario'
          : 'Devolución rechazada'
      )
      setDialogRevisar(null)
      setNotasRevision('')
    } catch (err: any) {
      console.error('[DEVOLUCIONES] Error al revisar:', err)
      toast.error('Error al revisar la devolución', { description: err?.message })
    }
  }

  const getEstadoBadge = (estado: string) => {
    if (estado === 'PENDIENTE_REVISION') return <Badge variant="secondary">Pendiente de Revisión</Badge>
    if (estado === 'APROBADA') return <Badge variant="default" className="bg-green-600">Aprobada</Badge>
    return <Badge variant="destructive">Rechazada</Badge>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devoluciones"
        description="Las devoluciones deben ser revisadas antes de volver al inventario"
        icon={<RotateCcw className="h-5 w-5" />}
      />

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Pendientes de Revisión</p>
            <p className="text-2xl font-bold text-accent">{pendientes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Aprobadas</p>
            <p className="text-2xl font-bold text-green-600">{aprobadas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Rechazadas</p>
            <p className="text-2xl font-bold text-red-600">{rechazadas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { value: 'todos', label: 'Todas' },
          { value: 'PENDIENTE_REVISION', label: 'Pendientes' },
          { value: 'APROBADA', label: 'Aprobadas' },
          { value: 'RECHAZADA', label: 'Rechazadas' },
        ].map((f) => (
          <Button
            key={f.value}
            variant={filtroEstado === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroEstado(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto/Pieza</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devolucionesFiltradas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs font-bold">{d.folio}</TableCell>
                  <TableCell>
                    <Badge variant={d.tipo === 'PRODUCTO' ? 'secondary' : 'outline'}>
                      {d.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{getProductoNombre(d)}</TableCell>
                  <TableCell className="text-center">{d.cantidad}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{d.motivo}</TableCell>
                  <TableCell>{getEstadoBadge(d.estado)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {d.estado === 'PENDIENTE_REVISION' ? (
                      <Button size="sm" onClick={() => abrirRevisar(d)}>
                        Revisar
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" disabled>
                        Revisada
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {devolucionesFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay devoluciones en este filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog revisar devolución */}
      <Dialog open={!!dialogRevisar} onOpenChange={(o) => !o && setDialogRevisar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revisar Devolución — {dialogRevisar?.folio}</DialogTitle>
          </DialogHeader>
          {dialogRevisar && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm"><strong>Tipo:</strong> {dialogRevisar.tipo}</p>
                <p className="text-sm"><strong>Producto:</strong> {getProductoNombre(dialogRevisar)}</p>
                <p className="text-sm"><strong>Cantidad:</strong> {dialogRevisar.cantidad}</p>
                <p className="text-sm"><strong>Origen:</strong> {getOrigen(dialogRevisar)}</p>
                <p className="text-sm"><strong>Motivo:</strong> {dialogRevisar.motivo}</p>
              </div>
              <div className="space-y-2">
                <Label>Notas de revisión (opcional)</Label>
                <Textarea
                  value={notasRevision}
                  onChange={(e) => setNotasRevision(e.target.value)}
                  rows={3}
                  placeholder="Ej: Producto en buen estado, se devuelve al inventario"
                />
              </div>
              <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-xs">
                <strong>Importante:</strong> Si apruebas, el stock se devolverá al inventario automáticamente.
                Si rechazas, el stock no se modifica.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRevisar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleRevisar('RECHAZADA')}>
              <X className="h-4 w-4 mr-2" /> Rechazar
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleRevisar('APROBADA')}>
              <Check className="h-4 w-4 mr-2" /> Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
