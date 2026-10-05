'use client'

import { useState } from 'react'
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
import { Wrench, Plus, Eye, CheckCircle2, Trash2, Cpu, CircuitBoard, UserPlus } from 'lucide-react'
import { formatMXN, formatDate, formatUSD, formatCUP } from '@/lib/format'
import { toast } from 'sonner'
import { type TipoServicio, ESPECIALIDAD_LABELS } from '@/lib/types'
import { ClientFormDialog } from '@/components/shared/client-form-dialog'

interface PiezaItem {
  id: string
  piezaId: string
  cantidad: number
  costoUnitario: number
  precioVenta: number
  subtotal: number
}

export function ServiciosModule() {
  const servicios = useStore((s) => s.servicios)
  const piezas = useStore((s) => s.piezas)
  const clientes = useStore((s) => s.clientes)
  const operarios = useStore((s) => s.operarios)
  const talleres = useStore((s) => s.talleres)
  const usuarioActual = useStore((s) => s.usuarioActual)
  const tallerActualId = useStore((s) => s.tallerActualId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogClienteOpen, setDialogClienteOpen] = useState(false)
  const [verServicio, setVerServicio] = useState<string | null>(null)
  const [dialogEntregar, setDialogEntregar] = useState<string | null>(null)
  const [garantiaDias, setGarantiaDias] = useState(90)
  const [cobertura, setCobertura] = useState('')

  const [form, setForm] = useState({
    operarioId: '',
    tipo: 'ELECTRONICA' as TipoServicio,
    clienteId: 'cliente-general',
    marca: '',
    modelo: '',
    imei: '',
    problemaReportado: '',
    diagnostico: '',
    descripcionServicio: '',
    precioServicio: 0,
    operatorPaymentType: '' as string,
    operatorPaymentValue: 0,
    requiereGarantia: true,
    garantiaDias: 90,
    metodoPago: 'Efectivo',
    piezas: [] as PiezaItem[],
  })

  const tallerFiltro = tallerActualId || talleres[0]?.id || ''
  const operariosTaller = operarios.filter((o) => o.activo)

  const serviciosFiltrados = servicios

  const abrirNuevo = () => {
    setForm({
      operarioId: operariosTaller[0]?.id || '',
      tipo: (operariosTaller[0]?.especialidad || 'ELECTRONICA') as TipoServicio,
      clienteId: 'cliente-general',
      marca: '', modelo: '', imei: '', problemaReportado: '',
      diagnostico: '', descripcionServicio: '', precioServicio: 0,
      operatorPaymentType: '', operatorPaymentValue: 0,
      requiereGarantia: true, garantiaDias: 90,
      metodoPago: 'Efectivo', piezas: [],
    })
    setDialogOpen(true)
  }

  const addPieza = (piezaId: string) => {
    const pz = piezas.find((p) => p.id === piezaId)
    if (!pz || pz.stock <= 0) {
      toast.error('No hay stock disponible')
      return
    }
    setForm({
      ...form,
      piezas: [...form.piezas, {
        id: Math.random().toString(36).slice(2),
        piezaId,
        cantidad: 1,
        costoUnitario: pz.costoUnitario,
        precioVenta: pz.precioVenta,
        subtotal: pz.precioVenta,
      }],
    })
  }

  const updatePiezaCantidad = (id: string, delta: number) => {
    setForm({
      ...form,
      piezas: form.piezas.flatMap((p) => {
        if (p.id !== id) return [p]
        const nueva = p.cantidad + delta
        if (nueva <= 0) return []
        return [{ ...p, cantidad: nueva, subtotal: nueva * p.precioVenta }]
      }),
    })
  }

  const removePieza = (id: string) => {
    setForm({ ...form, piezas: form.piezas.filter((p) => p.id !== id) })
  }

  const subtotalPiezas = form.piezas.reduce((s, p) => s + p.subtotal, 0)
  const total = form.piezas.length > 0 ? form.precioServicio + subtotalPiezas : form.precioServicio

  const guardar = async () => {
    if (!form.operarioId) {
      toast.error('Selecciona un operario')
      return
    }
    if (form.requiereGarantia && (!form.marca || !form.modelo)) {
      toast.error('Si el servicio tiene garantía, marca y modelo son obligatorios')
      return
    }
    if (!form.problemaReportado) {
      toast.error('Describe el problema reportado')
      return
    }
    const dto = {
      tallerId: tallerFiltro,
      operarioId: form.operarioId,
      tipo: form.tipo,
      clienteId: form.clienteId,
      marca: form.marca,
      modelo: form.modelo,
      imei: form.imei,
      problemaReportado: form.problemaReportado,
      diagnostico: form.diagnostico,
      descripcionServicio: form.descripcionServicio,
      precioManoObra: form.precioServicio,
      piezasUtilizadas: form.piezas.map((p) => ({
        id: p.id,
        piezaId: p.piezaId,
        cantidad: p.cantidad,
        costoUnitario: p.costoUnitario,
        precioVenta: p.precioVenta,
        subtotal: p.subtotal,
      })),
      metodoPago: form.metodoPago,
    }
    try {
      const result = await useDataService().crearServicio(dto)
      const id = typeof result === 'string' ? result : (result as any)?.id
      if (id) {
        toast.success('Servicio registrado')
        setDialogOpen(false)
      } else {
        toast.error('No se pudo registrar el servicio')
      }
    } catch (err: any) {
      console.error('[Servicios] Error al guardar:', err)
      toast.error('Error al guardar el servicio', { description: err?.message })
    }
  }

  const confirmarEntrega = async () => {
    if (!dialogEntregar) return
    try {
      await useDataService().entregarServicio(dialogEntregar, garantiaDias, cobertura)
      toast.success('Servicio entregado y garantía generada')
      setDialogEntregar(null)
      setCobertura('')
    } catch (err: any) {
      console.error('[Servicios] Error al entregar:', err)
      toast.error('Error al guardar el servicio', { description: err?.message })
    }
  }

  const handleClienteCreado = (nuevo: any) => {
    if (nuevo?.id) {
      setForm({ ...form, clienteId: nuevo.id })
      toast.success('Cliente seleccionado', { description: nuevo.nombre })
    }
  }

  const servicioVisto = verServicio ? servicios.find((s) => s.id === verServicio) : null
  const operarioNombre = (id: string) => operarios.find((o) => o.id === id)?.nombre || '—'
  const clienteNombre = (id: string) => clientes.find((c) => c.id === id)?.nombre || 'Cliente General'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios"
        description="Registro de servicios realizados por operarios"
        icon={<Wrench className="h-5 w-5" />}
        actions={
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Servicio
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Operario</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviciosFiltrados.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs font-bold">{s.folio}</TableCell>
                  <TableCell className="text-sm">{operarioNombre(s.operarioId)}</TableCell>
                  <TableCell>
                    <Badge variant={s.tipo === 'ELECTRONICA' ? 'default' : 'secondary'}>
                      {s.tipo === 'ELECTRONICA' ? <CircuitBoard className="h-3 w-3 mr-1" /> : <Cpu className="h-3 w-3 mr-1" />}
                      {ESPECIALIDAD_LABELS[s.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{s.marca} {s.modelo}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMXN(s.total)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setVerServicio(s.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {serviciosFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay servicios registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog crear/editar servicio */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Servicio</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {/* Operario */}
            <div className="space-y-2">
              <Label>Operario *</Label>
              <Select value={form.operarioId} onValueChange={(v) => {
                const op = operarios.find((o) => o.id === v)
                setForm({ ...form, operarioId: v, tipo: (op?.especialidad || 'ELECTRONICA') as TipoServicio })
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar operario" /></SelectTrigger>
                <SelectContent>
                  {operariosTaller.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nombre} — {ESPECIALIDAD_LABELS[op.especialidad]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de servicio */}
            <div className="space-y-2">
              <Label>Tipo de Servicio</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoServicio })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ELECTRONICA">Electrónica</SelectItem>
                  <SelectItem value="INFORMATICA">Informática</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cliente</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setDialogClienteOpen(true)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Nuevo cliente
                </Button>
              </div>
              <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.esClienteGeneral ? ' Cliente General' : c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ¿Requiere garantía? */}
            <div className="col-span-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiereGarantia}
                  onChange={(e) => setForm({ ...form, requiereGarantia: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">Este servicio requiere garantía</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Si se marca, los datos del dispositivo (marca, modelo, IMEI) son obligatorios para la garantía.
                Si no se marca (ej. instalación de aplicaciones), no se requieren estos datos.
              </p>
            </div>

            {/* Datos del dispositivo (condicionales) */}
            {form.requiereGarantia && (
              <>
                <div className="space-y-2">
                  <Label>Marca {form.requiereGarantia ? '*' : '(opcional)'}</Label>
                  <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Apple" />
                </div>
                <div className="space-y-2">
                  <Label>Modelo {form.requiereGarantia ? '*' : '(opcional)'}</Label>
                  <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="iPhone 13" />
                </div>
                <div className="space-y-2">
                  <Label>IMEI / Serie</Label>
                  <Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
                </div>
              </>
            )}

            <div className="col-span-2 space-y-2">
              <Label>Problema reportado *</Label>
              <Textarea value={form.problemaReportado} onChange={(e) => setForm({ ...form, problemaReportado: e.target.value })} rows={2} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Descripción del servicio realizado</Label>
              <Textarea value={form.descripcionServicio} onChange={(e) => setForm({ ...form, descripcionServicio: e.target.value })} rows={2} placeholder="Ej: Cambio de pantalla, desbloqueo FRP, etc." />
            </div>

            {/* Días de garantía (si requiere) */}
            {form.requiereGarantia && (
              <div className="space-y-2">
                <Label>Garantía (días)</Label>
                <Input type="number" value={form.garantiaDias} onChange={(e) => setForm({ ...form, garantiaDias: Number(e.target.value) })} />
              </div>
            )}

            {/* Precio del servicio */}
            <div className="space-y-2">
              <Label>Precio del servicio</Label>
              <Input type="number" value={form.precioServicio || ''} onChange={(e) => setForm({ ...form, precioServicio: Number(e.target.value) || 0 })} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={form.metodoPago} onValueChange={(v) => setForm({ ...form, metodoPago: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Piezas */}
            <div className="col-span-2">
              <Separator className="mb-3" />
              <Label className="mb-2 block">Piezas utilizadas</Label>
              <Select value="" onValueChange={(v) => addPieza(v)}>
                <SelectTrigger><SelectValue placeholder="+ Agregar pieza" /></SelectTrigger>
                <SelectContent>
                  {piezas.filter((p) => p.tallerId === tallerFiltro && p.activo && p.stock > 0).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} — Stock: {p.stock} — {formatUSD(p.precioVenta)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {form.piezas.length > 0 && (
                <div className="mt-2 space-y-1">
                  {form.piezas.map((p) => {
                    const pz = piezas.find((x) => x.id === p.piezaId)
                    return (
                      <div key={p.id} className="flex items-center gap-2 p-2 rounded border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{pz?.nombre}</p>
                          <p className="text-xs text-muted-foreground">{formatMXN(p.precioVenta)}</p>
                        </div>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updatePiezaCantidad(p.id, -1)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{p.cantidad}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updatePiezaCantidad(p.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-bold w-20 text-right">{formatMXN(p.subtotal)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pago al operario */}
            <div className="col-span-2">
              <Separator className="mb-3" />
              <Label className="mb-2 block">Pago al operario</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Define cuánto se le paga al operario por este servicio.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Tipo de pago</Label>
                  <Select
                    value={form.operatorPaymentType || 'NINGUNO'}
                    onValueChange={(v) => setForm({ ...form, operatorPaymentType: v === 'NINGUNO' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NINGUNO">Sin pago</SelectItem>
                      <SelectItem value="PERCENTAGE">Porcentaje (%)</SelectItem>
                      <SelectItem value="FIXED">Monto fijo (CUP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">
                    {form.operatorPaymentType === 'PERCENTAGE' ? 'Porcentaje (%)' :
                     form.operatorPaymentType === 'FIXED' ? 'Monto (CUP)' : 'Valor'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.operatorPaymentValue || ''}
                    onChange={(e) => setForm({ ...form, operatorPaymentValue: Number(e.target.value) || 0 })}
                    disabled={!form.operatorPaymentType}
                    placeholder={form.operatorPaymentType === 'PERCENTAGE' ? 'Ej: 15' : 'Ej: 100'}
                  />
                </div>
              </div>
              {form.operatorPaymentType && form.operatorPaymentValue > 0 && form.precioServicio > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-accent/5 text-xs">
                  {form.operatorPaymentType === 'PERCENTAGE' ? (
                    <span>Pago al operario: <strong className="text-accent">{formatMXN(form.precioServicio * form.operatorPaymentValue / 100)}</strong> ({form.operatorPaymentValue}% de {formatMXN(form.precioServicio)})</span>
                  ) : (
                    <span>Pago al operario: <strong className="text-accent">{formatMXN(form.operatorPaymentValue)}</strong> (monto fijo)</span>
                  )}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="col-span-2 flex justify-between items-center border-t pt-3">
              <span className="text-sm text-muted-foreground">
                Servicio: {formatMXN(form.precioServicio)} + Piezas: {formatMXN(subtotalPiezas)}
              </span>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-accent">{formatMXN(total)}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar Servicio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ver servicio */}
      <Dialog open={!!verServicio} onOpenChange={(o) => !o && setVerServicio(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Servicio {servicioVisto?.folio}</DialogTitle>
          </DialogHeader>
          {servicioVisto && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Operario:</strong> {operarioNombre(servicioVisto.operarioId)}</div>
                <div><strong>Tipo:</strong> {ESPECIALIDAD_LABELS[servicioVisto.tipo]}</div>
                <div><strong>Cliente:</strong> {clienteNombre(servicioVisto.clienteId)}</div>
                <div><strong>Dispositivo:</strong> {servicioVisto.marca} {servicioVisto.modelo}</div>
                {servicioVisto.imei && <div><strong>IMEI:</strong> {servicioVisto.imei}</div>}
              </div>
              <Separator />
              <div className="text-sm"><strong>Problema:</strong> {servicioVisto.problemaReportado}</div>
              {servicioVisto.descripcionServicio && (
                <div className="text-sm"><strong>Servicio realizado:</strong> {servicioVisto.descripcionServicio}</div>
              )}
              {servicioVisto.piezasUtilizadas.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-semibold mb-2">Piezas utilizadas</p>
                    {servicioVisto.piezasUtilizadas.map((p) => {
                      const pz = piezas.find((x) => x.id === p.piezaId)
                      return (
                        <div key={p.id} className="flex justify-between text-sm py-1">
                          <span>{p.cantidad}x {pz?.nombre}</span>
                          <span className="font-semibold">{formatMXN(p.subtotal)}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-accent">{formatMXN(servicioVisto.total)}</span>
              </div>
              <Button className="w-full" onClick={() => { setVerServicio(null); setDialogEntregar(servicioVisto.id) }}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Entregar y Generar Garantía
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerServicio(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog entregar servicio */}
      <Dialog open={!!dialogEntregar} onOpenChange={(o) => !o && setDialogEntregar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entregar Servicio y Generar Garantía</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Garantía (días)</Label>
              <Input type="number" value={garantiaDias} onChange={(e) => setGarantiaDias(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Cobertura</Label>
              <Textarea value={cobertura} onChange={(e) => setCobertura(e.target.value)} rows={3} placeholder="Descripción de la cobertura..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEntregar(null)}>Cancelar</Button>
            <Button onClick={confirmarEntrega}>Confirmar Entrega</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog crear nuevo cliente (en Servicios) */}
      <ClientFormDialog
        open={dialogClienteOpen}
        onOpenChange={setDialogClienteOpen}
        onCreated={handleClienteCreado}
      />
    </div>
  )
}
