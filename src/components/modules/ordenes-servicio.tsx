'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Wrench, Plus, Pencil, Trash2, Eye, Printer, CheckCircle2,
  Package as PackageIcon, X,
} from 'lucide-react'
import { ClientSelector } from '@/components/shared/client-selector'
import { InvoiceTemplate } from '@/components/shared/invoice-template'
import { WarrantyCertificate } from '@/components/shared/warranty-certificate'
import { formatMXN, formatDate } from '@/lib/format'
import {
  type OrdenServicio, type OrdenServicioLinea, type OrdenServicioItemPieza,
  type EstadoOrden,
} from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ESTADOS: { value: EstadoOrden; label: string; variant: any }[] = [
  { value: 'PENDIENTE', label: 'Pendiente', variant: 'secondary' },
  { value: 'EN_PROCESO', label: 'En Proceso', variant: 'default' },
  { value: 'REPARADO', label: 'Reparado', variant: 'default' },
  { value: 'ENTREGADO', label: 'Entregado', variant: 'default' },
  { value: 'CANCELADO', label: 'Cancelado', variant: 'destructive' },
]

const SERVICIOS_PREDEFINIDOS = [
  { descripcion: 'Cambio de pantalla', precio: 800 },
  { descripcion: 'Cambio de batería', precio: 400 },
  { descripcion: 'Cambio de puerto de carga', precio: 500 },
  { descripcion: 'Desbloqueo FRP', precio: 600 },
  { descripcion: 'Instalación de Windows', precio: 500 },
  { descripcion: 'Instalación de aplicaciones', precio: 200 },
  { descripcion: 'Soldadura de microcomponentes', precio: 700 },
  { descripcion: 'Diagnóstico', precio: 150 },
]

export function OrdenesServicioModule() {
  // Nota: en la arquitectura actual, `ordenes` fue reemplazado por `servicios`.
  // Fallback defensivo para que este módulo no crashee al cargar.
  // TODO: migrar este módulo completamente al nuevo modelo `Servicio`.
  const ordenes = useStore((s) => s.ordenes) || useStore((s) => s.servicios) || []
  const piezas = useStore((s) => s.piezas)
  const clientes = useStore((s) => s.clientes)
  const talleres = useStore((s) => s.talleres)
  const usuarioActual = useStore((s) => s.usuarioActual)
  const tallerActualId = useStore((s) => s.tallerActualId)
  const crearOrden = useStore((s) => s.crearOrdenServicio)
  const updateOrden = useStore((s) => s.updateOrdenServicio)
  const entregarOrden = useStore((s) => s.entregarOrden)
  const garantias = useStore((s) => s.garantias)

  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<OrdenServicio | null>(null)
  const [verOrden, setVerOrden] = useState<OrdenServicio | null>(null)
  const [dialogEntregar, setDialogEntregar] = useState<OrdenServicio | null>(null)
  const [garantiaDias, setGarantiaDias] = useState(90)
  const [cobertura, setCobertura] = useState('')

  // Form state
  const [form, setForm] = useState<Partial<OrdenServicio>>({})
  const [lineas, setLineas] = useState<OrdenServicioLinea[]>([])
  const [piezasUtilizadas, setPiezasUtilizadas] = useState<OrdenServicioItemPieza[]>([])

  const esSuperAdmin = usuarioActual?.rol === 'SUPER_ADMIN'
  const esAdmin = usuarioActual?.rol === 'ADMIN'
  const esTecnico = usuarioActual?.rol === 'INFORMATICO' || usuarioActual?.rol === 'ELECTRONICO'
  const puedeEditarPrecio = esSuperAdmin || esAdmin

  const talleresIds = esSuperAdmin
    ? talleres.map((t) => t.id)
    : usuarioActual?.tallerIds || []

  const ordenesFiltradas = ordenes.filter((o) => {
    if (!talleresIds.includes(o.tallerId)) return false
    if (filtroEstado !== 'todos' && o.estado !== filtroEstado) return false
    return true
  })

  const abrirNuevo = () => {
    setEditando(null)
    setForm({
      marca: '', modelo: '', imei: '', problemaReportado: '', diagnostico: '',
      estado: 'PENDIENTE', clienteId: 'cliente-general', tallerId: tallerActualId,
      metodoPago: 'Efectivo',
    })
    setLineas([])
    setPiezasUtilizadas([])
    setDialogOpen(true)
  }

  const abrirEditar = (o: OrdenServicio) => {
    setEditando(o)
    setForm(o)
    setLineas(o.lineas)
    setPiezasUtilizadas(o.piezasUtilizadas)
    setDialogOpen(true)
  }

  const addLineaPredef = (descripcion: string, precio: number) => {
    setLineas([
      ...lineas,
      { id: Math.random().toString(36).slice(2), descripcion, precioManoObra: precio, personalizada: false },
    ])
  }

  const addLineaCustom = () => {
    setLineas([
      ...lineas,
      { id: Math.random().toString(36).slice(2), descripcion: '', precioManoObra: 0, personalizada: true },
    ])
  }

  const updateLinea = (id: string, datos: Partial<OrdenServicioLinea>) => {
    setLineas(lineas.map((l) => (l.id === id ? { ...l, ...datos } : l)))
  }

  const removeLinea = (id: string) => {
    setLineas(lineas.filter((l) => l.id !== id))
  }

  const addPieza = (piezaId: string) => {
    const pz = piezas.find((p) => p.id === piezaId)
    if (!pz) return
    if (pz.stock <= 0) {
      toast.error('No hay stock disponible de esta pieza')
      return
    }
    const existente = piezasUtilizadas.find((i) => i.piezaId === piezaId)
    if (existente) {
      if (existente.cantidad + 1 > pz.stock) {
        toast.error(`Stock máximo: ${pz.stock}`)
        return
      }
      setPiezasUtilizadas(piezasUtilizadas.map((i) =>
        i.piezaId === piezaId
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.costoUnitario }
          : i
      ))
    } else {
      setPiezasUtilizadas([
        ...piezasUtilizadas,
        {
          id: Math.random().toString(36).slice(2),
          piezaId,
          cantidad: 1,
          costoUnitario: pz.costoUnitario,
          subtotal: pz.costoUnitario,
        },
      ])
    }
  }

  const updatePiezaCantidad = (id: string, delta: number) => {
    setPiezasUtilizadas(piezasUtilizadas.flatMap((i) => {
      if (i.id !== id) return [i]
      const nuevaCantidad = i.cantidad + delta
      if (nuevaCantidad <= 0) return []
      const pz = piezas.find((p) => p.id === i.piezaId)
      if (pz && nuevaCantidad > pz.stock) {
        toast.error(`Stock máximo: ${pz.stock}`)
        return [i]
      }
      return [{ ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.costoUnitario }]
    }))
  }

  const removePieza = (id: string) => {
    setPiezasUtilizadas(piezasUtilizadas.filter((i) => i.id !== id))
  }

  const subtotalManoObra = lineas.reduce((s, l) => s + l.precioManoObra, 0)
  const subtotalPiezas = piezasUtilizadas.reduce((s, p) => s + p.subtotal, 0)
  const total = subtotalManoObra + subtotalPiezas

  const guardar = () => {
    if (!form.marca || !form.modelo || !form.problemaReportado) {
      toast.error('Faltan campos obligatorios del dispositivo')
      return
    }
    if (!form.clienteId) {
      toast.error('Selecciona un cliente')
      return
    }
    const datos = {
      ...form,
      lineas,
      piezasUtilizadas,
      tallerId: form.tallerId || tallerActualId,
    }
    if (editando) {
      updateOrden(editando.id, datos)
      toast.success('Orden actualizada')
    } else {
      const id = crearOrden(datos)
      if (id) {
        toast.success('Orden de servicio creada')
      }
    }
    setDialogOpen(false)
  }

  const cambiarEstado = (orden: OrdenServicio, nuevoEstado: EstadoOrden) => {
    if (nuevoEstado === 'ENTREGADO') {
      const taller = talleres.find((t) => t.id === orden.tallerId)
      setGarantiaDias(taller?.garantiaServicioDias || 90)
      setCobertura(taller?.plantillaGarantia || '')
      setDialogEntregar(orden)
    } else {
      updateOrden(orden.id, { estado: nuevoEstado })
      toast.success(`Estado cambiado a: ${nuevoEstado}`)
    }
  }

  const confirmarEntrega = () => {
    if (dialogEntregar) {
      entregarOrden(dialogEntregar.id, garantiaDias, cobertura)
      toast.success('Orden entregada y garantía generada')
      setDialogEntregar(null)
    }
  }

  const ordenGarantia = (ordenId: string) => garantias.find((g) => g.ordenId === ordenId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órdenes de Servicio"
        description="Gestión de reparaciones y servicios técnicos"
        icon={<Wrench className="h-5 w-5" />}
        actions={
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filtroEstado === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroEstado('todos')}
        >
          Todas
        </Button>
        {ESTADOS.map((e) => (
          <Button
            key={e.value}
            variant={filtroEstado === e.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroEstado(e.value)}
          >
            {e.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenesFiltradas.map((o) => {
                const cliente = clientes.find((c) => c.id === o.clienteId)
                const estadoCfg = ESTADOS.find((e) => e.value === o.estado)
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs font-bold">{o.folio}</TableCell>
                    <TableCell className="text-sm">{cliente?.nombre || '—'}</TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <p className="font-medium">{o.marca} {o.modelo}</p>
                        {o.imei && <p className="text-xs text-muted-foreground">IMEI: {o.imei}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">
                      <p className="truncate">{o.problemaReportado}</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatMXN(o.total)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={estadoCfg?.variant}>{estadoCfg?.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVerOrden(o)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(esSuperAdmin || esAdmin || (esTecnico && o.tecnicoId === usuarioActual?.id)) && o.estado !== 'ENTREGADO' && o.estado !== 'CANCELADO' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(o)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {ordenesFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay órdenes de servicio.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog crear/editar orden */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? `Editar Orden ${editando.folio}` : 'Nueva Orden de Servicio'}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <ClientSelector value={form.clienteId || 'cliente-general'} onChange={(v) => setForm({ ...form, clienteId: v })} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.estado || 'PENDIENTE'}
                onValueChange={(v) => setForm({ ...form, estado: v as EstadoOrden })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca *</Label>
              <Input value={form.marca || ''} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Apple" />
            </div>
            <div className="space-y-2">
              <Label>Modelo *</Label>
              <Input value={form.modelo || ''} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="iPhone 13" />
            </div>
            <div className="space-y-2">
              <Label>IMEI / Serie</Label>
              <Input value={form.imei || ''} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={form.metodoPago || 'Efectivo'} onValueChange={(v) => setForm({ ...form, metodoPago: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Problema Reportado *</Label>
              <Textarea value={form.problemaReportado || ''} onChange={(e) => setForm({ ...form, problemaReportado: e.target.value })} rows={2} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Diagnóstico</Label>
              <Textarea value={form.diagnostico || ''} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} rows={2} />
            </div>
          </div>

          {/* Servicios predefinidos */}
          <div className="space-y-2">
            <Label>Servicios Predefinidos</Label>
            <div className="flex flex-wrap gap-2">
              {SERVICIOS_PREDEFINIDOS.map((s) => (
                <Button
                  key={s.descripcion}
                  variant="outline"
                  size="sm"
                  onClick={() => addLineaPredef(s.descripcion, s.precio)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {s.descripcion} ({formatMXN(s.precio)})
                </Button>
              ))}
            </div>
          </div>

          {/* Líneas de servicio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Líneas de Servicio (Mano de Obra)</Label>
              <Button variant="outline" size="sm" onClick={addLineaCustom}>
                <Plus className="h-3 w-3 mr-1" /> Personalizada
              </Button>
            </div>
            {lineas.map((l) => (
              <div key={l.id} className="flex gap-2">
                <Input
                  value={l.descripcion}
                  onChange={(e) => updateLinea(l.id, { descripcion: e.target.value })}
                  placeholder="Descripción del servicio"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={l.precioManoObra}
                  onChange={(e) => updateLinea(l.id, { precioManoObra: Number(e.target.value) })}
                  className="w-32"
                  disabled={!puedeEditarPrecio && !l.personalizada}
                />
                <Button variant="ghost" size="icon" className="text-red-600" onClick={() => removeLinea(l.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {lineas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3 border rounded-lg border-dashed">
                No hay servicios agregados
              </p>
            )}
          </div>

          {/* Piezas */}
          <div className="space-y-2">
            <Label>Piezas Utilizadas (se descuenta del inventario)</Label>
            <Select value="" onValueChange={(v) => addPieza(v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar pieza..." /></SelectTrigger>
              <SelectContent>
                {piezas
                  .filter((p) => p.tallerId === (form.tallerId || tallerActualId) && p.activo && p.stock > 0)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} — Stock: {p.stock} — {formatMXN(p.costoUnitario)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {piezasUtilizadas.map((i) => {
              const pz = piezas.find((p) => p.id === i.piezaId)
              return (
                <div key={i.id} className="flex items-center gap-2 p-2 rounded-lg border">
                  <PackageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pz?.nombre}</p>
                    <p className="text-xs text-muted-foreground">{formatMXN(i.costoUnitario)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">x{i.cantidad}</span>
                  <span className="text-sm font-bold w-20 text-right">{formatMXN(i.subtotal)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updatePiezaCantidad(i.id, -1)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updatePiezaCantidad(i.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Totales */}
          <div className="border-t pt-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>Subtotal Mano de Obra:</span>
              <span>{formatMXN(subtotalManoObra)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal Piezas:</span>
              <span>{formatMXN(subtotalPiezas)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Descuento:</span>
              <Input
                type="number"
                value={form.descuento || 0}
                onChange={(e) => setForm({ ...form, descuento: Number(e.target.value) || 0 })}
                className="w-32 h-7 text-right"
                disabled={!puedeEditarPrecio}
              />
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-accent">{formatMXN(total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar Orden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ver orden */}
      <Dialog open={!!verOrden} onOpenChange={(o) => !o && setVerOrden(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Orden {verOrden?.folio}</span>
              {verOrden && (
                <Badge variant={ESTADOS.find((e) => e.value === verOrden.estado)?.variant}>
                  {ESTADOS.find((e) => e.value === verOrden.estado)?.label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {verOrden && <InvoiceTemplate ordenId={verOrden.id} />}

          {/* Acciones de estado */}
          {verOrden && (
          <div className="no-print border-t pt-4 space-y-3">
            {verOrden.estado !== 'ENTREGADO' && verOrden.estado !== 'CANCELADO' && (
              <div className="flex flex-wrap gap-2">
                {verOrden.estado === 'PENDIENTE' && (
                  <Button onClick={() => cambiarEstado(verOrden, 'EN_PROCESO')}>
                    Iniciar Proceso
                  </Button>
                )}
                {(verOrden.estado === 'PENDIENTE' || verOrden.estado === 'EN_PROCESO') && (
                  <Button onClick={() => cambiarEstado(verOrden, 'REPARADO')}>
                    Marcar Reparado
                  </Button>
                )}
                {verOrden.estado === 'REPARADO' && (
                  <Button onClick={() => cambiarEstado(verOrden, 'ENTREGADO')}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Entregar y Generar Garantía
                  </Button>
                )}
                <Button variant="outline" onClick={() => cambiarEstado(verOrden, 'CANCELADO')}>
                  Cancelar Orden
                </Button>
              </div>
            )}
            {verOrden.estado === 'ENTREGADO' && ordenGarantia(verOrden.id) && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Factura
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Certificado de Garantía
                </Button>
              </div>
            )}
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog entregar y generar garantía */}
      <Dialog open={!!dialogEntregar} onOpenChange={(o) => !o && setDialogEntregar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entregar Orden y Generar Garantía</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm font-medium">Orden: {dialogEntregar?.folio}</p>
              <p className="text-xs text-muted-foreground">
                {dialogEntregar?.marca} {dialogEntregar?.modelo} — {formatMXN(dialogEntregar?.total || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Duración de Garantía (días)</Label>
              <Input
                type="number"
                value={garantiaDias}
                onChange={(e) => setGarantiaDias(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción de Cobertura</Label>
              <Textarea
                value={cobertura}
                onChange={(e) => setCobertura(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEntregar(null)}>Cancelar</Button>
            <Button onClick={confirmarEntrega}>Confirmar Entrega</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
