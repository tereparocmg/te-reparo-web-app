'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ShoppingCart, Trash2, Plus, Minus, Receipt, Printer, X,
  UserPlus, ShieldCheck,
} from 'lucide-react'
import { ClientSelector } from '@/components/shared/client-selector'
import { ClientFormDialog } from '@/components/shared/client-form-dialog'
import { ProductSelector } from '@/components/shared/product-selector'
import { InvoiceTemplate } from '@/components/shared/invoice-template'
import { formatMXN } from '@/lib/format'
import { TagFilter } from '@/components/shared/tag-filter'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { type VentaItem } from '@/lib/types'

export function PosModule() {
  const productos = useStore((s) => s.productos)
  const talleres = useStore((s) => s.talleres)
  const tallerActualId = useStore((s) => s.tallerActualId)
  const usuarioActual = useStore((s) => s.usuarioActual)
  const ventas = useStore((s) => s.ventas)

  const [clienteId, setClienteId] = useState('cliente-general')
  const [operarioId, setOperarioId] = useState('')
  const [filtroTags, setFiltroTags] = useState<string[]>([])
  const [carrito, setCarrito] = useState<VentaItem[]>([])
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  const [ventaCompletada, setVentaCompletada] = useState<string | null>(null)
  const [dialogClienteOpen, setDialogClienteOpen] = useState(false)
  const [garantiaHabilitada, setGarantiaHabilitada] = useState(false)
  const [garantiaProductoId, setGarantiaProductoId] = useState<string>('')
  const [garantiaDias, setGarantiaDias] = useState<number>(30)
  const [garantiaCobertura, setGarantiaCobertura] = useState<string>('')

  const taller = talleres.find((t) => t.id === tallerActualId) || talleres[0]
  const tallerFiltro = taller?.id || ''

  const metodosPago = (taller?.metodosPago || 'Efectivo,Tarjeta,Transferencia').split(',')

  const subtotal = useMemo(() => carrito.reduce((s, i) => s + i.subtotal, 0), [carrito])
  const total = subtotal

  const addItem = (productoId: string, cantidad: number) => {
    const prod = productos.find((p) => p.id === productoId)
    if (!prod) return
    if (prod.stock < cantidad) {
      toast.error(`Stock insuficiente. Disponible: ${prod.stock}`)
      return
    }
    const existente = carrito.find((i) => i.productoId === productoId)
    if (existente) {
      if (existente.cantidad + cantidad > prod.stock) {
        toast.error(`Stock insuficiente. Disponible: ${prod.stock}`)
        return
      }
      setCarrito(carrito.map((i) =>
        i.productoId === productoId
          ? { ...i, cantidad: i.cantidad + cantidad, subtotal: (i.cantidad + cantidad) * i.precioUnitario }
          : i
      ))
    } else {
      setCarrito([
        ...carrito,
        {
          id: Math.random().toString(36).slice(2),
          productoId,
          cantidad,
          precioUnitario: prod.precioVenta,
          subtotal: prod.precioVenta * cantidad,
        },
      ])
    }
  }

  const updateCantidad = (id: string, delta: number) => {
    setCarrito(carrito.flatMap((i) => {
      if (i.id !== id) return [i]
      const nuevaCantidad = i.cantidad + delta
      if (nuevaCantidad <= 0) return []
      const prod = productos.find((p) => p.id === i.productoId)
      if (prod && nuevaCantidad > prod.stock) {
        toast.error(`Stock máximo: ${prod.stock}`)
        return [i]
      }
      return [{ ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precioUnitario }]
    }))
  }

  const removeItem = (id: string) => {
    setCarrito(carrito.filter((i) => i.id !== id))
  }

  const limpiar = () => {
    setCarrito([])
    setClienteId('cliente-general')
    setMetodoPago('Efectivo')
    setGarantiaHabilitada(false)
    setGarantiaProductoId('')
    setGarantiaDias(30)
    setGarantiaCobertura('')
  }

  // Productos en el carrito que tienen garantía por defecto (garantiaDias > 0)
  const productosGarantiables = useMemo(() => {
    return carrito
      .map((i) => ({ item: i, prod: productos.find((p) => p.id === i.productoId) }))
      .filter(({ prod }) => prod && prod.garantiaDias > 0)
  }, [carrito, productos])

  // Cuando se habilita la garantía, pre-seleccionar el primer producto garantizable
  const handleToggleGarantia = (enabled: boolean) => {
    setGarantiaHabilitada(enabled)
    if (enabled && !garantiaProductoId && productosGarantiables.length > 0) {
      const first = productosGarantiables[0].prod
      setGarantiaProductoId(first!.id)
      setGarantiaDias(first!.garantiaDias)
    }
  }

  // Cuando cambia el producto seleccionado para garantía, actualizar días default
  const handleSelectProductoGarantia = (productoId: string) => {
    setGarantiaProductoId(productoId)
    const prod = productos.find((p) => p.id === productoId)
    if (prod) {
      setGarantiaDias(prod.garantiaDias)
    }
  }

  const handleClienteCreado = (nuevo: any) => {
    if (nuevo?.id) {
      setClienteId(nuevo.id)
      toast.success('Cliente seleccionado automáticamente', { description: nuevo.nombre })
    }
  }

  const cobrar = async () => {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío')
      return
    }
    // Validar garantía custom si está habilitada
    let garantiaDto: { productoId: string; duracionDias?: number; descripcionCobertura?: string } | undefined
    if (garantiaHabilitada && garantiaProductoId) {
      if (!garantiaDias || garantiaDias <= 0) {
        toast.error('Los días de garantía deben ser mayores a 0')
        return
      }
      garantiaDto = {
        productoId: garantiaProductoId,
        duracionDias: garantiaDias,
        descripcionCobertura: garantiaCobertura.trim() || undefined,
      }
    }
    const dto = {
      clienteId,
      items: carrito,
      total,
      metodoPago,
      tallerId: tallerFiltro,
      garantia: garantiaDto,
    }

    try {
      const result = await useDataService().crearVenta(dto)
      const ventaId = typeof result === 'string' ? result : (result as any)?.id

      if (ventaId) {
        setVentaCompletada(ventaId)
        limpiar()
        toast.success('Venta registrada con éxito', {
          description: garantiaDto ? 'Garantía personalizada aplicada.' : 'Se generó la garantía automáticamente si aplica.',
        })
      } else {
        toast.error('No se pudo registrar la venta')
      }
    } catch (err: any) {
      console.error('[POS] Error al cobrar:', err)
      toast.error('Error al registrar la venta', { description: err?.message })
    }
  }

  const ultimaVenta = ventaCompletada ? ventas.find((v) => v.id === ventaCompletada) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Punto de Venta"
        description={taller?.nombre || ''}
        icon={<ShoppingCart className="h-5 w-5" />}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Productos */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Agregar Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductSelector tallerId={tallerFiltro} onAdd={addItem} />
            </CardContent>
          </Card>

          {/* Grid rápido de productos populares */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Productos Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <TagFilter
                  tallerId={tallerFiltro}
                  selectedTags={filtroTags}
                  onChange={setFiltroTags}
                  placeholder="Filtrar productos por etiquetas"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
                {productos
                  .filter((p) => p.tallerId === tallerFiltro && p.activo && p.stock > 0 && (filtroTags.length === 0 || filtroTags.every(ft => (p.tags || []).includes(ft))))
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addItem(p.id, 1)}
                      className="text-left p-3 rounded-lg border hover:border-accent hover:bg-accent/5 transition-colors group"
                    >
                      <p className="text-sm font-medium truncate group-hover:text-accent">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
                      <p className="text-sm font-bold text-accent mt-1">{formatMXN(p.precioVenta)}</p>
                    </button>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Carrito */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Carrito ({carrito.length})</span>
                {carrito.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={limpiar}>
                    Limpiar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Cliente */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Cliente</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setDialogClienteOpen(true)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Nuevo
                  </Button>
                </div>
                <ClientSelector value={clienteId} onChange={setClienteId} />
              </div>

              {/* Items */}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {carrito.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Agrega productos al carrito
                  </p>
                ) : (
                  carrito.map((item) => {
                    const prod = productos.find((p) => p.id === item.productoId)
                    return (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{prod?.nombre}</p>
                          <p className="text-xs text-muted-foreground">{formatMXN(item.precioUnitario)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCantidad(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">{item.cantidad}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCantidad(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-bold w-20 text-right">{formatMXN(item.subtotal)}</span>
                      </div>
                    )
                  })
                )}
              </div>

              {carrito.length > 0 && (
                <>
                  <Separator />

                  {/* Método de pago */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Método de Pago</Label>
                    <Select value={metodoPago} onValueChange={setMetodoPago}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {metodosPago.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Totales */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatMXN(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-accent">{formatMXN(total)}</span>
                    </div>
                  </div>

                  {/* Garantía de producto */}
                  <div className="space-y-2 rounded-lg border p-2.5 bg-muted/30">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={garantiaHabilitada}
                        onChange={(e) => handleToggleGarantia(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <ShieldCheck className="h-4 w-4 text-accent" />
                      <span className="text-xs font-semibold">Personalizar garantía de producto</span>
                    </label>
                    {garantiaHabilitada && (
                      <div className="space-y-2 pl-6">
                        {productosGarantiables.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Ningún producto en el carrito tiene garantía por defecto. Define los días manualmente abajo.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <Label className="text-xs">Producto a garantizar</Label>
                            <Select
                              value={garantiaProductoId}
                              onValueChange={handleSelectProductoGarantia}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Seleccionar producto" />
                              </SelectTrigger>
                              <SelectContent>
                                {productosGarantiables.map(({ prod }) => (
                                  <SelectItem key={prod!.id} value={prod!.id}>
                                    {prod!.nombre} (default: {prod!.garantiaDias}d)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Días de garantía</Label>
                            <Input
                              type="number"
                              value={garantiaDias}
                              onChange={(e) => setGarantiaDias(Number(e.target.value) || 0)}
                              min={0}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Vence en</Label>
                            <div className="h-8 px-2 flex items-center text-xs text-muted-foreground">
                              {garantiaDias > 0
                                ? new Date(Date.now() + garantiaDias * 86400000).toLocaleDateString('es-ES')
                                : '—'}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cobertura (opcional)</Label>
                          <Textarea
                            value={garantiaCobertura}
                            onChange={(e) => setGarantiaCobertura(e.target.value)}
                            rows={2}
                            placeholder="Ej: Cubre defectos de fabricación. No cubre caídas ni líquidos."
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button className="w-full" size="lg" onClick={cobrar}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Cobrar {formatMXN(total)}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de venta completada */}
      <Dialog open={!!ventaCompletada} onOpenChange={(o) => !o && setVentaCompletada(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600">Venta Completada</Badge>
              {ultimaVenta && <span className="text-sm font-normal text-muted-foreground">Folio: {ultimaVenta.folio}</span>}
            </DialogTitle>
          </DialogHeader>
          {ultimaVenta && <InvoiceTemplate ventaId={ultimaVenta.id} />}
          <DialogFooter className="no-print">
            <Button variant="outline" onClick={() => setVentaCompletada(null)}>
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog crear nuevo cliente (en POS) */}
      <ClientFormDialog
        open={dialogClienteOpen}
        onOpenChange={setDialogClienteOpen}
        onCreated={handleClienteCreado}
      />
    </div>
  )
}
