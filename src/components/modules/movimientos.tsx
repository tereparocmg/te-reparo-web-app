'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
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
  Wallet, Plus, FileSpreadsheet, DollarSign, TrendingDown, ShoppingCart,
} from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { formatMXN, formatDate, isToday, exportarExcel } from '@/lib/format'
import { type Gasto, type CompraItem } from '@/lib/types'
import { toast } from 'sonner'

const CATEGORIAS_GASTO = ['Renta', 'Papelería', 'Servicios', 'Salarios', 'Mantenimiento', 'Otros']

export function MovimientosModule() {
  const movimientos = useStore((s) => s.movimientos)
  const gastos = useStore((s) => s.gastos)
  const talleres = useStore((s) => s.talleres)
  const usuarios = useStore((s) => s.usuarios)
  const productos = useStore((s) => s.productos)
  const piezas = useStore((s) => s.piezas)
  const usuarioActual = useStore((s) => s.usuarioActual)
  const tallerActualId = useStore((s) => s.tallerActualId)
  const ventas = useStore((s) => s.ventas)
  // Defensive fallback: `ordenes` was renamed to `servicios` in the new
  // architecture. Reading s.ordenes returns undefined; we fall back to
  // servicios (and then to []) to avoid runtime crashes if the field is
  // later dereferenced with .map/.find/.filter.
  const ordenes = useStore((s) => s.ordenes) || useStore((s) => s.servicios) || []

  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [dialogGasto, setDialogGasto] = useState(false)
  const [dialogCompra, setDialogCompra] = useState(false)

  const [gastoForm, setGastoForm] = useState<Partial<Gasto>>({})
  const [compraForm, setCompraForm] = useState<{ proveedor?: string; items: CompraItem[]; notas?: string }>({ items: [] })

  const esSuperAdmin = usuarioActual?.rol === 'SUPER_ADMIN'
  const esAdmin = usuarioActual?.rol === 'ADMIN'
  const puedeRegistrarGasto = esSuperAdmin || esAdmin

  const talleresIds = esSuperAdmin
    ? talleres.map((t) => t.id)
    : usuarioActual?.tallerIds || []

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (!talleresIds.includes(m.tallerId)) return false
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false
      if (fechaInicio) {
        const fi = new Date(fechaInicio)
        if (new Date(m.fecha) < fi) return false
      }
      if (fechaFin) {
        const ff = new Date(fechaFin)
        ff.setHours(23, 59, 59)
        if (new Date(m.fecha) > ff) return false
      }
      return true
    })
  }, [movimientos, talleresIds, filtroTipo, fechaInicio, fechaFin])

  // Métricas del día
  const movHoy = movimientos.filter((m) => talleresIds.includes(m.tallerId) && isToday(m.fecha))
  const ingresosHoy = movHoy.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0)
  const gastosHoy = movHoy.filter((m) => m.tipo === 'GASTO').reduce((s, m) => s + m.monto, 0)
  const comprasHoy = movHoy.filter((m) => m.tipo === 'COMPRA').reduce((s, m) => s + m.monto, 0)

  const totalIngresos = movimientosFiltrados.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0)
  const totalGastos = movimientosFiltrados.filter((m) => m.tipo === 'GASTO').reduce((s, m) => s + m.monto, 0)
  const totalCompras = movimientosFiltrados.filter((m) => m.tipo === 'COMPRA').reduce((s, m) => s + m.monto, 0)

  const guardarGasto = async () => {
    if (!gastoForm.concepto || !gastoForm.monto) {
      toast.error('Completa concepto y monto')
      return
    }
    try {
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI, y hace fallback al registrarGasto de Zustand en modo web
      // puro. El adapter ya sincroniza Zustand desde SQLite tras la mutación.
      await useDataService().registrarGasto(gastoForm)
      toast.success('Gasto registrado')
      setGastoForm({})
      setDialogGasto(false)
    } catch (err: any) {
      console.error('[Movimientos] Error al registrar gasto:', err)
      toast.error('Error al registrar el gasto', { description: err?.message })
    }
  }

  const addCompraItem = (tipo: 'producto' | 'pieza', itemId: string) => {
    const item = tipo === 'producto'
      ? productos.find((p) => p.id === itemId)
      : piezas.find((p) => p.id === itemId)
    if (!item) return
    const costo = tipo === 'producto'
      ? (item as any).precioCosto
      : (item as any).costoUnitario
    setCompraForm({
      ...compraForm,
      items: [
        ...compraForm.items,
        {
          id: Math.random().toString(36).slice(2),
          [tipo === 'producto' ? 'productoId' : 'piezaId']: itemId,
          cantidad: 1,
          costoUnitario: costo,
          subtotal: costo,
        },
      ],
    })
  }

  const updateCompraItem = (id: string, datos: Partial<CompraItem>) => {
    setCompraForm({
      ...compraForm,
      items: compraForm.items.map((i) => {
        if (i.id !== id) return i
        const actualizado = { ...i, ...datos }
        actualizado.subtotal = actualizado.cantidad * actualizado.costoUnitario
        return actualizado
      }),
    })
  }

  const removeCompraItem = (id: string) => {
    setCompraForm({ ...compraForm, items: compraForm.items.filter((i) => i.id !== id) })
  }

  const totalCompra = compraForm.items.reduce((s, i) => s + i.subtotal, 0)

  const guardarCompra = async () => {
    if (compraForm.items.length === 0) {
      toast.error('Agrega al menos un item a la compra')
      return
    }
    try {
      const dto = {
        proveedor: compraForm.proveedor,
        items: compraForm.items,
        notas: compraForm.notas,
      }
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI; el adapter actualiza stock y re-sincroniza Zustand.
      const id = await useDataService().registrarCompra(dto)
      if (id) {
        toast.success('Compra registrada — stock actualizado')
        setCompraForm({ items: [] })
        setDialogCompra(false)
      } else {
        toast.error('No se pudo registrar la compra')
      }
    } catch (err: any) {
      console.error('[Movimientos] Error al registrar compra:', err)
      toast.error('Error al registrar la compra', { description: err?.message })
    }
  }

  const handleExportExcel = async () => {
    const taller = talleres.find((t) => t.id === tallerActualId)
    const datos = movimientosFiltrados.map((m) => {
      const t = talleres.find((x) => x.id === m.tallerId)
      const u = usuarios.find((x) => x.id === m.usuarioId)
      return {
        'Fecha': formatDate(m.fecha, true),
        'Concepto': m.concepto,
        'Tipo': m.tipo,
        'Categoría': m.categoria || '',
        'Monto': m.monto,
        'Usuario Responsable': u?.nombre || '',
        'Taller': t?.nombre || '',
      }
    })
    const fechaStr = fechaInicio && fechaFin
      ? `_${fechaInicio}_a_${fechaFin}`
      : filtroTipo !== 'todos'
        ? `_${filtroTipo}`
        : ''
    await exportarExcel(datos, `Movimientos_TeReparo${fechaStr}.xlsx`, 'Movimientos')
    toast.success('Excel exportado correctamente')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos y Caja"
        description="Panel de ingresos, gastos y compras"
        icon={<Wallet className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            {puedeRegistrarGasto && (
              <>
                <Button variant="outline" onClick={() => setDialogCompra(true)}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Registrar Compra
                </Button>
                <Button onClick={() => setDialogGasto(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Gasto
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Tarjetas resumen del día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos Hoy"
          value={formatMXN(ingresosHoy)}
          subtitle="Ventas + servicios"
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Gastos Hoy"
          value={formatMXN(gastosHoy)}
          subtitle="Gastos operativos"
          icon={TrendingDown}
          variant="danger"
        />
        <StatCard
          title="Compras Hoy"
          value={formatMXN(comprasHoy)}
          subtitle="Adquisiciones inventario"
          icon={ShoppingCart}
        />
        <StatCard
          title="Balance Hoy"
          value={formatMXN(ingresosHoy - gastosHoy - comprasHoy)}
          subtitle={ingresosHoy - gastosHoy - comprasHoy >= 0 ? 'Positivo' : 'Negativo'}
          icon={Wallet}
          variant={ingresosHoy - gastosHoy - comprasHoy >= 0 ? 'accent' : 'danger'}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="INGRESO">Ingresos</SelectItem>
                  <SelectItem value="GASTO">Gastos</SelectItem>
                  <SelectItem value="COMPRA">Compras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFiltroTipo('todos'); setFechaInicio(''); setFechaFin('') }}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen del filtro */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Ingresos</p>
            <p className="text-xl font-bold text-green-600">{formatMXN(totalIngresos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Gastos</p>
            <p className="text-xl font-bold text-red-600">{formatMXN(totalGastos + totalCompras)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Balance Neto</p>
            <p className={`text-xl font-bold ${totalIngresos - totalGastos - totalCompras >= 0 ? 'text-accent' : 'text-red-600'}`}>
              {formatMXN(totalIngresos - totalGastos - totalCompras)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de movimientos */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Usuario</TableHead>
                {esSuperAdmin && <TableHead>Taller</TableHead>}
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientosFiltrados.slice(0, 100).map((m) => {
                const taller = talleres.find((t) => t.id === m.tallerId)
                const usuario = usuarios.find((u) => u.id === m.usuarioId)
                const esIngreso = m.tipo === 'INGRESO'
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{formatDate(m.fecha, true)}</TableCell>
                    <TableCell className="font-medium text-sm">{m.concepto}</TableCell>
                    <TableCell>
                      <Badge variant={esIngreso ? 'default' : m.tipo === 'GASTO' ? 'destructive' : 'secondary'}>
                        {m.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{m.categoria || '—'}</TableCell>
                    <TableCell className="text-sm">{usuario?.nombre || '—'}</TableCell>
                    {esSuperAdmin && <TableCell className="text-sm">{taller?.nombre}</TableCell>}
                    <TableCell className={`text-right font-bold ${esIngreso ? 'text-green-600' : 'text-red-600'}`}>
                      {esIngreso ? '+' : '-'}{formatMXN(m.monto)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {movimientosFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={esSuperAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    No hay movimientos en el período seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog gasto */}
      <Dialog open={dialogGasto} onOpenChange={setDialogGasto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Concepto *</Label>
              <Input
                value={gastoForm.concepto || ''}
                onChange={(e) => setGastoForm({ ...gastoForm, concepto: e.target.value })}
                placeholder="Ej: Renta del local"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={gastoForm.categoria || 'Otros'}
                onValueChange={(v) => setGastoForm({ ...gastoForm, categoria: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_GASTO.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                value={gastoForm.monto || ''}
                onChange={(e) => setGastoForm({ ...gastoForm, monto: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={gastoForm.notas || ''}
                onChange={(e) => setGastoForm({ ...gastoForm, notas: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogGasto(false)}>Cancelar</Button>
            <Button onClick={guardarGasto}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog compra */}
      <Dialog open={dialogCompra} onOpenChange={setDialogCompra}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Compra (incrementa stock automáticamente)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Input
                  value={compraForm.proveedor || ''}
                  onChange={(e) => setCompraForm({ ...compraForm, proveedor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  value={compraForm.notas || ''}
                  onChange={(e) => setCompraForm({ ...compraForm, notas: e.target.value })}
                />
              </div>
            </div>

            {/* Agregar items */}
            <div className="grid grid-cols-2 gap-2">
              <Select value="" onValueChange={(v) => addCompraItem('producto', v)}>
                <SelectTrigger><SelectValue placeholder="+ Producto" /></SelectTrigger>
                <SelectContent>
                  {productos
                    .filter((p) => p.tallerId === tallerActualId && p.activo)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} — Stock: {p.stock}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value="" onValueChange={(v) => addCompraItem('pieza', v)}>
                <SelectTrigger><SelectValue placeholder="+ Pieza" /></SelectTrigger>
                <SelectContent>
                  {piezas
                    .filter((p) => p.tallerId === tallerActualId && p.activo)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} — Stock: {p.stock}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {compraForm.items.map((i) => {
                const item = i.productoId
                  ? productos.find((p) => p.id === i.productoId)
                  : piezas.find((p) => p.id === i.piezaId)
                return (
                  <div key={i.id} className="flex items-center gap-2 p-2 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item?.nombre}</p>
                    </div>
                    <Input
                      type="number"
                      value={i.cantidad}
                      onChange={(e) => updateCompraItem(i.id, { cantidad: Number(e.target.value) })}
                      className="w-20 h-8"
                      placeholder="Cant."
                    />
                    <Input
                      type="number"
                      value={i.costoUnitario}
                      onChange={(e) => updateCompraItem(i.id, { costoUnitario: Number(e.target.value) })}
                      className="w-28 h-8"
                      placeholder="Costo unit."
                    />
                    <span className="text-sm font-bold w-24 text-right">{formatMXN(i.subtotal)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => removeCompraItem(i.id)}>
                      ×
                    </Button>
                  </div>
                )
              })}
              {compraForm.items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                  No hay items agregados
                </p>
              )}
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-accent">{formatMXN(totalCompra)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCompra(false)}>Cancelar</Button>
            <Button onClick={guardarCompra}>Registrar Compra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
