'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Building2, Plus, Edit, MapPin, Phone, User, Pencil } from 'lucide-react'
import { Building } from '@/lib/types'
import { toast } from 'sonner'

export function TalleresModule() {
  const talleres = useStore((s) => s.talleres)
  const usuarios = useStore((s) => s.usuarios)
  const ventas = useStore((s) => s.ventas)
  // Nota: `ordenes` fue reemplazado por `servicios` en la nueva arquitectura.
  const ordenes = useStore((s) => s.ordenes) || useStore((s) => s.servicios) || []
  const productos = useStore((s) => s.productos)
  const piezas = useStore((s) => s.piezas)
  const usuarioActual = useStore((s) => s.usuarioActual)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Building | null>(null)
  const [form, setForm] = useState<Partial<Building>>({})

  const esSuperAdmin = usuarioActual?.rol === 'SUPER_ADMIN'
  const talleresVisibles = esSuperAdmin
    ? talleres
    : talleres.filter((t) => usuarioActual?.tallerIds.includes(t.id))

  const abrirNuevo = () => {
    setEditando(null)
    setForm({
      activo: true,
      limiteDescuento: 10,
      garantiaProductoDias: 30,
      garantiaServicioDias: 90,
      metodosPago: 'Efectivo,Tarjeta,Transferencia',
    })
    setDialogOpen(true)
  }

  const abrirEditar = (t: Building) => {
    setEditando(t)
    setForm(t)
    setDialogOpen(true)
  }

  const guardar = async () => {
    if (!form.nombre || !form.direccion || !form.telefono) {
      toast.error('Faltan campos obligatorios', {
        description: 'Nombre, dirección y teléfono son requeridos.',
      })
      return
    }
    try {
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI, y hace fallback al saveTaller de Zustand en modo web puro.
      // El adapter ya decide create vs update segun data.id y re-sincroniza
      // Zustand desde SQLite tras la mutacion.
      await useDataService().saveTaller({ ...form, id: editando?.id })
      toast.success(editando ? 'Taller actualizado' : 'Taller creado')
      setDialogOpen(false)
    } catch (err: any) {
      console.error('[Talleres] Error al guardar:', err)
      toast.error('Error al guardar el taller', { description: err?.message })
    }
  }

  const desactivar = async (id: string) => {
    try {
      await useDataService().deleteTaller(id)
      toast.success('Taller desactivado')
    } catch (err: any) {
      console.error('[Talleres] Error al desactivar:', err)
      toast.error('Error al desactivar el taller', { description: err?.message })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Talleres"
        description="Administra las sucursales del taller Te Reparo"
        icon={<Building2 className="h-5 w-5" />}
        actions={
          esSuperAdmin && (
            <Button onClick={abrirNuevo}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Taller
            </Button>
          )
        }
      />

      {/* Grid de talleres */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {talleresVisibles.map((t) => {
          const numUsuarios = usuarios.filter((u) => u.tallerIds.includes(t.id) && u.activo).length
          const numProductos = productos.filter((p) => p.tallerId === t.id && p.activo).length
          const numPiezas = piezas.filter((p) => p.tallerId === t.id && p.activo).length
          const ventasTaller = ventas.filter((v) => v.tallerId === t.id && v.estado === 'COMPLETADA').length
          return (
            <Card key={t.id} className={!t.activo ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{t.nombre}</CardTitle>
                      <Badge variant={t.activo ? 'default' : 'secondary'} className="text-[10px] mt-0.5">
                        {t.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => abrirEditar(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="text-xs">{t.direccion}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs">{t.telefono}</span>
                </div>
                {t.encargado && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs">{t.encargado}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold text-accent">{numUsuarios}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Usuarios</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-accent">{numProductos + numPiezas}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Inventario</p>
                  </div>
                </div>
                {esSuperAdmin && t.activo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => desactivar(t.id)}
                  >
                    Desactivar taller
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialog de creación/edición */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Taller' : 'Nuevo Taller'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Nombre del taller *</Label>
              <Input value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Te Reparo Centro" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Dirección *</Label>
              <Textarea value={form.direccion || ''} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Calle, número, colonia, ciudad" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono *</Label>
              <Input value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="55 1234 5678" />
            </div>
            <div className="space-y-2">
              <Label>Encargado</Label>
              <Input value={form.encargado || ''} onChange={(e) => setForm({ ...form, encargado: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>RFC</Label>
              <Input value={form.rfc || ''} onChange={(e) => setForm({ ...form, rfc: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Razón Social</Label>
              <Input value={form.razonSocial || ''} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Horario Apertura</Label>
              <Input type="time" value={form.horarioApertura || ''} onChange={(e) => setForm({ ...form, horarioApertura: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Horario Cierre</Label>
              <Input type="time" value={form.horarioCierre || ''} onChange={(e) => setForm({ ...form, horarioCierre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Límite Descuento (%)</Label>
              <Input type="number" value={form.limiteDescuento ?? 10} onChange={(e) => setForm({ ...form, limiteDescuento: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Métodos de Pago</Label>
              <Input value={form.metodosPago || ''} onChange={(e) => setForm({ ...form, metodosPago: e.target.value })} placeholder="Efectivo,Tarjeta,Transferencia" />
            </div>
            <div className="space-y-2">
              <Label>Garantía Productos (días)</Label>
              <Input type="number" value={form.garantiaProductoDias ?? 30} onChange={(e) => setForm({ ...form, garantiaProductoDias: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Garantía Servicios (días)</Label>
              <Input type="number" value={form.garantiaServicioDias ?? 90} onChange={(e) => setForm({ ...form, garantiaServicioDias: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
