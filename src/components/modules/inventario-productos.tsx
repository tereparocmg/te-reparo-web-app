'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { TruncatedCell } from '@/components/ui/truncated-cell'
import { Package, Plus, Pencil, Search, Check, X, AlertTriangle, Barcode, Percent, DollarSign, Eye } from 'lucide-react'
import { formatMXN } from '@/lib/format'
import { type Producto, type TipoComision } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { TagFilter } from '@/components/shared/tag-filter'

export function InventarioProductosModule() {
  const productos = useStore((s) => s.productos)
  const categorias = useStore((s) => s.categorias)
  const talleres = useStore((s) => s.talleres)
  const tallerActualId = useStore((s) => s.tallerActualId)
  const usuarioActual = useStore((s) => s.usuarioActual)
  const saveCategoria = useStore((s) => s.saveCategoria)
  const toggleCategoria = useStore((s) => s.toggleCategoria)

  const [busqueda, setBusqueda] = useState('')
  const [filtroTags, setFiltroTags] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState<Partial<Producto>>({})
  const [codigoDisponible, setCodigoDisponible] = useState<boolean | null>(null)
  const [dialogCategoria, setDialogCategoria] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [tagsText, setTagsText] = useState('')

  const esSuperAdmin = usuarioActual?.rol === 'SUPER_ADMIN'
  const esAdmin = usuarioActual?.rol === 'SUPER_ADMIN' || usuarioActual?.rol === 'ADMIN'
  const puedeEditar = esAdmin
  const tallerFiltro = tallerActualId || talleres[0]?.id
  const productosFiltrados = productos.filter(
    (p) =>
      p.tallerId === tallerFiltro &&
      p.activo &&
      (filtroTags.length === 0 || filtroTags.every(ft => (p.tags || []).includes(ft))) &&
      (busqueda === '' ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigoBarras.includes(busqueda))
  )
  const categoriasTaller = categorias.filter((c) => c.tallerId === tallerFiltro && c.tipo === 'PRODUCTO')

  // Validación asíncrona de código de barras (via Electron IPC cuando hay electronAPI)
  useEffect(() => {
    const delay = !form.codigoBarras || form.codigoBarras.length < 4 ? 0 : 300
    let cancelled = false
    const timer = setTimeout(async () => {
      if (!form.codigoBarras || form.codigoBarras.length < 4) {
        setCodigoDisponible(null)
        return
      }
      try {
        const disponible = await useDataService().validarCodigoBarras(form.codigoBarras!, editando?.id)
        if (!cancelled) setCodigoDisponible(disponible)
      } catch (err: any) {
        console.error('[productos] Error validando código de barras:', err)
        if (!cancelled) setCodigoDisponible(null)
      }
    }, delay)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [form.codigoBarras, editando?.id])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({
      activo: true,
      stock: 0,
      stockMinimo: 5,
      garantiaDias: 30,
      precioCosto: 0,
      precioVenta: 0,
      tallerId: tallerFiltro,
      operatorCommissionType: null,
      operatorCommissionValue: null,
      tags: [],
    })
    setTagsText('')
    setCodigoDisponible(null)
    setDialogOpen(true)
  }

  const abrirEditar = (p: Producto) => {
    setEditando(p)
    setForm(p)
    setTagsText((p.tags || []).join(', '))
    setTagsText('')
    setCodigoDisponible(null)
    setDialogOpen(true)
  }

  const guardar = async () => {
    if (!form.nombre || !form.sku || !form.codigoBarras) {
      toast.error('Faltan campos obligatorios')
      return
    }
    if (codigoDisponible === false) {
      toast.error('El código de barras ya existe', {
        description: 'Debe ser único entre productos y piezas.',
      })
      return
    }
    const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean)
    try {
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI, y hace fallback al saveProducto de Zustand en modo web puro.
      // El adapter ya sincroniza Zustand desde SQLite tras la mutación.
      await useDataService().saveProducto({ ...form, tags, id: editando?.id })
      toast.success(editando ? 'Producto actualizado' : 'Producto creado')
      setDialogOpen(false)
    } catch (err: any) {
      console.error('[productos] Error al guardar el producto:', err)
      toast.error('Error al guardar el producto', { description: err?.message })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario de Productos"
        description="Productos para venta al público"
        icon={<Package className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogCategoria(true)}>
              Categorías
            </Button>
            <Button onClick={abrirNuevo}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
        }
      />

      {/* Barra de búsqueda */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, SKU o código de barras..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <TagFilter
          tallerId={tallerFiltro}
          selectedTags={filtroTags}
          onChange={setFiltroTags}
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable<Producto>
            data={productosFiltrados}
            pageSize={25}
            searchable
            searchKeys={['nombre', 'sku', 'codigoBarras']}
            searchPlaceholder="Buscar producto..."
            emptyMessage="No se encontraron productos."
            columns={[
              {
                key: 'nombre', label: 'Producto',
                format: (_, p) => (
                  <div>
                    <div className="font-medium">{p.nombre}</div>
                    {p.descripcion && (
                      <div className="text-xs text-muted-foreground">
                        <TruncatedCell text={p.descripcion} maxLength={50} />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'sku', label: 'SKU / Código',
                format: (_, p) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-mono">{p.sku}</span>
                    <span className="text-xs text-muted-foreground font-mono">{p.codigoBarras}</span>
                  </div>
                ),
              },
              {
                key: 'categoriaId', label: 'Categoría',
                format: (catId) => {
                  const cat = categorias.find((c) => c.id === catId)
                  return cat ? <Badge variant="secondary">{cat.nombre}</Badge> : <span className="text-xs text-muted-foreground">—</span>
                },
              },
              {
                key: 'precioVenta', label: 'Precio', align: 'right',
                format: (val) => <span className="text-sm">{formatMXN(val)}</span>,
              },
              {
                key: 'stock', label: 'Stock', align: 'center',
                format: (stock, p) => {
                  const stockBajo = stock <= p.stockMinimo
                  return (
                    <Badge variant={stockBajo ? 'destructive' : 'secondary'}>
                      {stock}{stockBajo && <AlertTriangle className="h-3 w-3 ml-1" />}
                    </Badge>
                  )
                },
              },
              {
                key: 'garantiaDias', label: 'Garantía', align: 'center',
                format: (val) => <span className="text-sm">{val > 0 ? `${val} días` : '—'}</span>,
              },
              {
                key: 'id', label: 'Acciones', align: 'right',
                format: (_, p) => (
                  <div className="flex gap-1 justify-end">
                    {puedeEditar ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); abrirEditar(p) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40" disabled>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Dialog producto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Código de Barras *</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.codigoBarras || ''}
                  onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                  className={cn(
                    'pl-9',
                    codigoDisponible === false && 'border-red-500',
                    codigoDisponible === true && 'border-green-500'
                  )}
                />
                {codigoDisponible !== null && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {codigoDisponible ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {codigoDisponible === false && (
                <p className="text-xs text-red-600">Este código ya está registrado en productos o piezas.</p>
              )}
              {codigoDisponible === true && (
                <p className="text-xs text-green-600">Código disponible.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.categoriaId || ''} onValueChange={(v) => setForm({ ...form, categoriaId: v })}>
                <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                <SelectContent>
                  {categoriasTaller.filter((c) => c.activa).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Garantía (días)</Label>
              <Input type="number" value={form.garantiaDias ?? 30} onChange={(e) => setForm({ ...form, garantiaDias: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Precio Costo</Label>
              <Input type="number" value={form.precioCosto ?? 0} onChange={(e) => setForm({ ...form, precioCosto: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Precio Venta</Label>
              <Input type="number" value={form.precioVenta ?? 0} onChange={(e) => setForm({ ...form, precioVenta: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Stock Inicial</Label>
              <Input type="number" value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} disabled={!!editando} />
            </div>
            <div className="space-y-2">
              <Label>Stock Mínimo</Label>
              <Input type="number" value={form.stockMinimo ?? 5} onChange={(e) => setForm({ ...form, stockMinimo: Number(e.target.value) })} />
            </div>

            {/* Sección: Comisión para operario */}
            <div className="col-span-2 mt-2">
              <Separator className="mb-3" />
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4 text-accent" />
                <h4 className="text-sm font-semibold">Comisión para operario</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Configura una comisión que se pagará al vendedor cuando venda este producto. Se calcula sobre el precio final después de descuentos.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo de comisión</Label>
                  <Select
                    value={form.operatorCommissionType || 'NONE'}
                    onValueChange={(v) => setForm({
                      ...form,
                      operatorCommissionType: v === 'NONE' ? null : (v as TipoComision),
                      operatorCommissionValue: v === 'NONE' ? null : (form.operatorCommissionValue ?? 0),
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sin comisión</SelectItem>
                      <SelectItem value="PERCENTAGE">Porcentaje (%)</SelectItem>
                      <SelectItem value="FIXED">Monto fijo (CUP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {form.operatorCommissionType === 'PERCENTAGE' ? 'Porcentaje (%)' :
                     form.operatorCommissionType === 'FIXED' ? 'Monto (CUP)' : 'Valor'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.operatorCommissionValue ?? 0}
                    onChange={(e) => setForm({ ...form, operatorCommissionValue: Number(e.target.value) })}
                    disabled={!form.operatorCommissionType}
                    placeholder={form.operatorCommissionType === 'PERCENTAGE' ? 'Ej: 1.5' : 'Ej: 20'}
                  />
                </div>
              </div>
              {form.operatorCommissionType && form.operatorCommissionValue != null && form.precioVenta > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-accent/5 text-xs">
                  {form.operatorCommissionType === 'PERCENTAGE' ? (
                    <span>Comisión por unidad: <strong className="text-accent">{formatMXN(form.precioVenta * form.operatorCommissionValue / 100)}</strong> ({form.operatorCommissionValue}% de {formatMXN(form.precioVenta)})</span>
                  ) : (
                    <span>Comisión por unidad: <strong className="text-accent">{formatMXN(form.operatorCommissionValue)}</strong> (monto fijo)</span>
                  )}
                </div>
              )}
            </div>

            {/* Etiquetas */}
            <div className="col-span-2 mt-2">
              <Separator className="mb-3" />
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">Etiquetas</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Separa las etiquetas con comas. Ej: Samsung, Pantalla, iPhone
              </p>
              <Input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="Samsung, Pantalla, iPhone"
              />
              {tagsText && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tagsText.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                    <span key={i} className="inline-block px-2 py-0.5 rounded bg-accent/10 text-accent text-xs font-medium">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={codigoDisponible === false}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog categorías */}
      <Dialog open={dialogCategoria} onOpenChange={setDialogCategoria}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Categorías de Productos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nueva categoría..."
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nuevaCategoria.trim()) {
                    saveCategoria({ nombre: nuevaCategoria, tipo: 'PRODUCTO', tallerId: tallerFiltro })
                    setNuevaCategoria('')
                    toast.success('Categoría creada')
                  }
                }}
              />
              <Button onClick={() => {
                if (nuevaCategoria.trim()) {
                  saveCategoria({ nombre: nuevaCategoria, tipo: 'PRODUCTO', tallerId: tallerFiltro })
                  setNuevaCategoria('')
                  toast.success('Categoría creada')
                }
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {categoriasTaller.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">{c.nombre}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategoria(c.id)}
                  >
                    <Badge variant={c.activa ? 'default' : 'secondary'}>
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
