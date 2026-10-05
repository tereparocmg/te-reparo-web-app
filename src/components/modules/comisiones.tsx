'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
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
  DollarSign, Wallet, FileSpreadsheet, Eye, CheckCircle2, XCircle,
  Users, Clock, Check, ChevronRight, History,
} from 'lucide-react'
import { formatMXN, formatDate, exportarExcel } from '@/lib/format'
import { type CommissionEntry, type OperatorPayment } from '@/lib/types'
import { toast } from 'sonner'

interface ResumenOperario {
  operarioId: string
  nombre: string
  rol: string
  pendientes: CommissionEntry[]
  totalPendiente: number
  totalHistorico: number
  totalPagado: number
}

export function ComisionesModule() {
  const usuarios = useStore((s) => s.usuarios)
  const talleres = useStore((s) => s.talleres)
  const usuarioActual = useStore((s) => s.usuarioActual)
  const tallerActualId = useStore((s) => s.tallerActualId)
  const commissionEntries = useStore((s) => s.commissionEntries)
  const operatorPayments = useStore((s) => s.operatorPayments)

  const [filtroOperario, setFiltroOperario] = useState('todos')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [dialogDetalle, setDialogDetalle] = useState<ResumenOperario | null>(null)
  const [dialogPago, setDialogPago] = useState<ResumenOperario | null>(null)
  const [dialogHistorial, setDialogHistorial] = useState<ResumenOperario | null>(null)
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const [notasPago, setNotasPago] = useState('')

  const esSuperAdmin = usuarioActual?.rol === 'SUPER_ADMIN'

  const talleresIds = esSuperAdmin
    ? talleres.map((t) => t.id)
    : usuarioActual?.tallerIds || []

  // Operarios (vendedores, informáticos, electrónicos)
  const operarios = usuarios.filter(
    (u) => u.activo && ['VENDEDOR', 'INFORMATICO', 'ELECTRONICO'].includes(u.rol)
  )

  // Filtrar comisiones por taller y fecha
  const comisionesFiltradas = useMemo(() => {
    return commissionEntries.filter((ce) => {
      if (!talleresIds.includes(ce.tallerId)) return false
      if (filtroOperario !== 'todos' && ce.operarioId !== filtroOperario) return false
      if (filtroFechaInicio) {
        const fi = new Date(filtroFechaInicio)
        if (new Date(ce.createdAt) < fi) return false
      }
      if (filtroFechaFin) {
        const ff = new Date(filtroFechaFin)
        ff.setHours(23, 59, 59)
        if (new Date(ce.createdAt) > ff) return false
      }
      return true
    })
  }, [commissionEntries, talleresIds, filtroOperario, filtroFechaInicio, filtroFechaFin])

  // Resumen por operario
  const resumenOperarios: ResumenOperario[] = useMemo(() => {
    return operarios
      .map((op) => {
        const todas = comisionesFiltradas.filter((ce) => ce.operarioId === op.id)
        const pendientes = todas.filter((ce) => ce.estado === 'ACTIVE' && !ce.operatorPaymentId)
        const pagadas = todas.filter((ce) => ce.estado === 'ACTIVE' && !!ce.operatorPaymentId)
        return {
          operarioId: op.id,
          nombre: op.nombre,
          rol: op.rol,
          pendientes,
          totalPendiente: pendientes.reduce((s, ce) => s + ce.amount, 0),
          totalHistorico: todas.filter((ce) => ce.estado === 'ACTIVE').reduce((s, ce) => s + ce.amount, 0),
          totalPagado: pagadas.reduce((s, ce) => s + ce.amount, 0),
        }
      })
      .filter((r) => r.totalHistorico > 0 || r.pendientes.length > 0)
  }, [operarios, comisionesFiltradas])

  // Métricas generales
  const totalPendiente = resumenOperarios.reduce((s, r) => s + r.totalPendiente, 0)
  const totalPagado = resumenOperarios.reduce((s, r) => s + r.totalPagado, 0)
  const totalOperariosConPendiente = resumenOperarios.filter((r) => r.totalPendiente > 0).length
  const totalComisiones = comisionesFiltradas.filter((ce) => ce.estado === 'ACTIVE').length

  // Pagos pendientes de confirmación
  const pagosPendientes = operatorPayments.filter(
    (op) => talleresIds.includes(op.tallerId) && op.status === 'PENDING'
  )
  const pagosRealizados = operatorPayments.filter(
    (op) => talleresIds.includes(op.tallerId) && op.status === 'PAID'
  )

  const abrirPagar = (resumen: ResumenOperario) => {
    setDialogPago(resumen)
    setSeleccionadas(resumen.pendientes.map((ce) => ce.id))
    setNotasPago('')
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const totalSeleccionado = seleccionadas.reduce((s, id) => {
    const ce = dialogPago?.pendientes.find((x) => x.id === id)
    return s + (ce?.amount || 0)
  }, 0)

  const generarPago = async () => {
    if (!dialogPago || seleccionadas.length === 0) return
    const dto = {
      operarioId: dialogPago.operarioId,
      tallerId: tallerActualId || dialogPago.pendientes[0]?.tallerId || '',
      commissionEntryIds: seleccionadas,
      notas: notasPago,
    }
    try {
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI, y hace fallback al crearPagoOperador de Zustand en modo web.
      // El adapter ya sincroniza Zustand desde SQLite tras la mutación.
      const result = await useDataService().crearPagoOperador(dto)
      const pagoId = typeof result === 'string' ? result : (result as any)?.id
      if (pagoId) {
        toast.success('Pago generado (estado PENDIENTE)', {
          description: `Folio: ${operatorPayments.find((p) => p.id === pagoId)?.folio || ''}`,
        })
        setDialogPago(null)
        setSeleccionadas([])
        setNotasPago('')
      } else {
        toast.error('No se pudo generar el pago')
      }
    } catch (err: any) {
      console.error('[Comisiones] Error al generar pago:', err)
      toast.error('Error al crear el pago', { description: err?.message })
    }
  }

  const handleConfirmarPago = async (pagoId: string) => {
    try {
      await useDataService().confirmarPagoOperador(pagoId)
      toast.success('Pago confirmado como PAID')
    } catch (err: any) {
      console.error('[Comisiones] Error al confirmar pago:', err)
      toast.error('Error al confirmar el pago', { description: err?.message })
    }
  }

  const handleCancelarPago = async (pagoId: string) => {
    try {
      await useDataService().cancelarPagoOperador(pagoId)
      toast.success('Pago cancelado — comisiones liberadas')
    } catch (err: any) {
      console.error('[Comisiones] Error al cancelar pago:', err)
      toast.error('Error al cancelar el pago', { description: err?.message })
    }
  }

  const exportarExcelPagos = async () => {
    const datos = operatorPayments
      .filter((op) => talleresIds.includes(op.tallerId))
      .map((op) => {
        const operario = usuarios.find((u) => u.id === op.operarioId)
        const taller = talleres.find((t) => t.id === op.tallerId)
        const pagadoPor = usuarios.find((u) => u.id === op.paidById)
        return {
          'Folio': op.folio,
          'Operario': operario?.nombre || '',
          'Taller': taller?.nombre || '',
          'Monto': op.amount,
          'Estado': op.status,
          'Fecha Generación': formatDate(op.date, true),
          'Fecha Pago': op.paidAt ? formatDate(op.paidAt, true) : '',
          'Pagado Por': pagadoPor?.nombre || '',
          'Notas': op.notas || '',
        }
      })
    await exportarExcel(datos, `Pagos_Operarios_TeReparo.xlsx`, 'Pagos')
    toast.success('Excel exportado correctamente')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comisiones y Pagos a Operarios"
        description="Gestión de comisiones por ventas y servicios, liquidación diaria"
        icon={<DollarSign className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={exportarExcelPagos}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Pagos Excel
          </Button>
        }
      />

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pendiente"
          value={formatMXN(totalPendiente)}
          subtitle={`${totalOperariosConPendiente} operario(s)`}
          icon={Clock}
          variant="accent"
        />
        <StatCard
          title="Total Pagado"
          value={formatMXN(totalPagado)}
          subtitle={`${pagosRealizados.length} pagos realizados`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Comisiones del Período"
          value={totalComisiones}
          subtitle={`${comisionesFiltradas.filter((ce) => ce.estado === 'CANCELLED').length} canceladas`}
          icon={DollarSign}
        />
        <StatCard
          title="Pagos por Confirmar"
          value={pagosPendientes.length}
          subtitle="En estado PENDING"
          icon={Wallet}
          variant="danger"
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Operario</Label>
              <Select value={filtroOperario} onValueChange={setFiltroOperario}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {operarios.map((op) => (
                    <SelectItem key={op.id} value={op.id}>{op.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFiltroOperario('todos'); setFiltroFechaInicio(''); setFiltroFechaFin('') }}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de operarios con comisiones pendientes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Comisiones por Operario
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-center">Comisiones Pendientes</TableHead>
                <TableHead className="text-right">Total Pendiente</TableHead>
                <TableHead className="text-right">Total Pagado</TableHead>
                <TableHead className="text-right">Histórico</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumenOperarios.map((r) => (
                <TableRow key={r.operarioId}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  <TableCell><Badge variant="secondary">{r.rol}</Badge></TableCell>
                  <TableCell className="text-center">{r.pendientes.length}</TableCell>
                  <TableCell className="text-right">
                    <span className={r.totalPendiente > 0 ? 'font-bold text-accent' : 'text-muted-foreground'}>
                      {formatMXN(r.totalPendiente)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-green-600">{formatMXN(r.totalPagado)}</TableCell>
                  <TableCell className="text-right text-sm">{formatMXN(r.totalHistorico)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => setDialogDetalle(r)}>
                        <Eye className="h-3.5 w-3.5" /> Detalle
                      </Button>
                      {r.totalPendiente > 0 && (
                        <Button size="sm" className="h-8" onClick={() => abrirPagar(r)}>
                          <Wallet className="h-3.5 w-3.5 mr-1" /> Pagar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => setDialogHistorial(r)}>
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {resumenOperarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay comisiones registradas con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagos pendientes de confirmación */}
      {pagosPendientes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Pagos Generados — Pendientes de Confirmar ({pagosPendientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Operario</TableHead>
                  <TableHead className="text-center">Comisiones</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Generado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagosPendientes.map((op) => {
                  const operario = usuarios.find((u) => u.id === op.operarioId)
                  return (
                    <TableRow key={op.id}>
                      <TableCell className="font-mono text-xs font-bold">{op.folio}</TableCell>
                      <TableCell className="font-medium">{operario?.nombre}</TableCell>
                      <TableCell className="text-center">{op.commissionEntryIds.length}</TableCell>
                      <TableCell className="text-right font-bold text-accent">{formatMXN(op.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(op.date, true)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" className="h-8" onClick={() => handleConfirmarPago(op.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirmar Pago
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-red-600" onClick={() => handleCancelarPago(op.id)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Historial de pagos realizados */}
      {pagosRealizados.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Pagos Realizados ({pagosRealizados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Operario</TableHead>
                  <TableHead className="text-center">Comisiones</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Pagado Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagosRealizados.slice(0, 20).map((op) => {
                  const operario = usuarios.find((u) => u.id === op.operarioId)
                  const pagadoPor = usuarios.find((u) => u.id === op.paidById)
                  return (
                    <TableRow key={op.id}>
                      <TableCell className="font-mono text-xs font-bold">{op.folio}</TableCell>
                      <TableCell className="font-medium">{operario?.nombre}</TableCell>
                      <TableCell className="text-center">{op.commissionEntryIds.length}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{formatMXN(op.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {op.paidAt ? formatDate(op.paidAt, true) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{pagadoPor?.nombre || '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog detalle de comisiones (solo lectura) */}
      <Dialog open={!!dialogDetalle} onOpenChange={(o) => !o && setDialogDetalle(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comisiones de {dialogDetalle?.nombre}</DialogTitle>
          </DialogHeader>
          {dialogDetalle && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border text-center">
                  <p className="text-xs text-muted-foreground uppercase">Pendientes</p>
                  <p className="text-xl font-bold text-accent">{formatMXN(dialogDetalle.totalPendiente)}</p>
                  <p className="text-xs">{dialogDetalle.pendientes.length} comisiones</p>
                </div>
                <div className="p-3 rounded-lg border text-center">
                  <p className="text-xs text-muted-foreground uppercase">Pagadas</p>
                  <p className="text-xl font-bold text-green-600">{formatMXN(dialogDetalle.totalPagado)}</p>
                </div>
                <div className="p-3 rounded-lg border text-center">
                  <p className="text-xs text-muted-foreground uppercase">Histórico</p>
                  <p className="text-xl font-bold">{formatMXN(dialogDetalle.totalHistorico)}</p>
                </div>
              </div>
              <Separator />
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comisionesFiltradas
                      .filter((ce) => ce.operarioId === dialogDetalle.operarioId)
                      .slice(0, 50)
                      .map((ce) => (
                        <TableRow key={ce.id}>
                          <TableCell className="text-xs">{formatDate(ce.createdAt, true)}</TableCell>
                          <TableCell className="text-sm">{ce.description}</TableCell>
                          <TableCell>
                            <Badge variant={ce.type === 'SALE' ? 'default' : 'outline'}>
                              {ce.type === 'SALE' ? 'Venta' : 'Servicio'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ce.estado === 'CANCELLED' ? (
                              <Badge variant="destructive">Cancelada</Badge>
                            ) : ce.operatorPaymentId ? (
                              <Badge variant="default" className="bg-green-600">Pagada</Badge>
                            ) : (
                              <Badge variant="secondary">Pendiente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatMXN(ce.amount)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDetalle(null)}>Cerrar</Button>
            {dialogDetalle && dialogDetalle.totalPendiente > 0 && (
              <Button onClick={() => { setDialogDetalle(null); abrirPagar(dialogDetalle) }}>
                <Wallet className="h-4 w-4 mr-2" /> Generar Pago
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog generar pago */}
      <Dialog open={!!dialogPago} onOpenChange={(o) => !o && setDialogPago(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generar Pago a {dialogPago?.nombre}</DialogTitle>
          </DialogHeader>
          {dialogPago && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecciona las comisiones a incluir en este pago. Una vez generado, el pago quedará en estado PENDIENTE hasta que lo confirmes.
              </p>
              <div className="max-h-80 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dialogPago.pendientes.map((ce) => (
                      <TableRow key={ce.id} className={seleccionadas.includes(ce.id) ? 'bg-accent/5' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={seleccionadas.includes(ce.id)}
                            onCheckedChange={() => toggleSeleccion(ce.id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(ce.createdAt, true)}</TableCell>
                        <TableCell className="text-sm">{ce.description}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMXN(ce.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea value={notasPago} onChange={(e) => setNotasPago(e.target.value)} rows={2} placeholder="Ej: Pago diario — ventas del día" />
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {seleccionadas.length} de {dialogPago.pendientes.length} comisiones seleccionadas
                </span>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total a pagar</p>
                  <p className="text-2xl font-bold text-accent">{formatMXN(totalSeleccionado)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPago(null)}>Cancelar</Button>
            <Button onClick={generarPago} disabled={seleccionadas.length === 0}>
              <Wallet className="h-4 w-4 mr-2" /> Generar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog historial de pagos del operario */}
      <Dialog open={!!dialogHistorial} onOpenChange={(o) => !o && setDialogHistorial(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Pagos — {dialogHistorial?.nombre}</DialogTitle>
          </DialogHeader>
          {dialogHistorial && (
            <div className="space-y-3">
              {operatorPayments
                .filter((op) => op.operarioId === dialogHistorial.operarioId)
                .length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay pagos registrados para este operario.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-center">Comisiones</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operatorPayments
                      .filter((op) => op.operarioId === dialogHistorial.operarioId)
                      .map((op) => (
                        <TableRow key={op.id}>
                          <TableCell className="font-mono text-xs">{op.folio}</TableCell>
                          <TableCell className="text-xs">{formatDate(op.date, true)}</TableCell>
                          <TableCell className="text-center">{op.commissionEntryIds.length}</TableCell>
                          <TableCell className="text-right font-bold">{formatMXN(op.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={op.status === 'PAID' ? 'default' : 'secondary'} className={op.status === 'PAID' ? 'bg-green-600' : ''}>
                              {op.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{op.paidAt ? formatDate(op.paidAt, true) : '—'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogHistorial(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
