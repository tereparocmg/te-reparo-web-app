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
  PackageOpen, Plus, Check, X, Trash2, ShoppingCart,
} from 'lucide-react'
import { formatDate } from '@/lib/format'
import { type UrgenciaPedido } from '@/lib/types'
import { toast } from 'sonner'

const URGENCIAS: { value: UrgenciaPedido; label: string; variant: any }[] = [
  { value: 'BAJA', label: 'Baja', variant: 'secondary' },
  { value: 'MEDIA', label: 'Media', variant: 'default' },
  { value: 'ALTA', label: 'Alta', variant: 'destructive' },
]

export function PedidosModule() {
  const pedidos = useStore((s) => s.pedidos)
  const talleres = useStore((s) => s.talleres)
  const usuarios = useStore((s) => s.usuarios)
  const usuarioActual = useStore((s) => s.usuarioActual)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<{ descripcion: string; cantidad: number; urgencia: UrgenciaPedido }>({
    descripcion: '', cantidad: 1, urgencia: 'MEDIA',
  })

  const esSuperAdmin = usuarioActual?.rol === 'SUPER_ADMIN'
  const esAdmin = usuarioActual?.rol === 'ADMIN'
  const puedeAprobar = esSuperAdmin || esAdmin

  const talleresIds = esSuperAdmin
    ? talleres.map((t) => t.id)
    : usuarioActual?.tallerIds || []

  const pedidosVisibles = pedidos.filter((p) => talleresIds.includes(p.tallerId))

  const guardar = async () => {
    if (!form.descripcion.trim()) {
      toast.error('La descripción es obligatoria')
      return
    }
    try {
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI, y hace fallback al crearPedido de Zustand en modo web puro.
      // El adapter ya sincroniza Zustand desde SQLite tras la mutación.
      await useDataService().crearPedido(form)
      toast.success('Pedido creado')
      setForm({ descripcion: '', cantidad: 1, urgencia: 'MEDIA' })
      setDialogOpen(false)
    } catch (err: any) {
      console.error('[Pedidos] Error al crear el pedido:', err)
      toast.error('Error al crear el pedido', { description: err?.message })
    }
  }

  const handleAprobar = async (id: string, aprobar: boolean) => {
    try {
      await useDataService().aprobarPedido(id, aprobar)
      toast.success(aprobar ? 'Pedido aprobado' : 'Pedido rechazado')
    } catch (err: any) {
      console.error('[Pedidos] Error al aprobar el pedido:', err)
      toast.error('Error al aprobar el pedido', { description: err?.message })
    }
  }

  const handleConvertir = async (id: string) => {
    try {
      await useDataService().convertirPedido(id)
      toast.success('Pedido convertido a orden de compra')
    } catch (err: any) {
      console.error('[Pedidos] Error al convertir el pedido:', err)
      toast.error('Error al convertir el pedido', { description: err?.message })
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await useDataService().eliminarPedido(id)
      toast.success('Pedido eliminado')
    } catch (err: any) {
      console.error('[Pedidos] Error al eliminar el pedido:', err)
      toast.error('Error al eliminar el pedido', { description: err?.message })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos Internos"
        description="Solicitudes de material de los técnicos"
        icon={<PackageOpen className="h-5 w-5" />}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pedido
          </Button>
        }
      />

      {/* Bandeja de pedidos pendientes (Admin/Super Admin) */}
      {puedeAprobar && (
        <Card className="border-accent/30">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-accent" />
              Bandeja de Aprobación ({pedidosVisibles.filter((p) => p.estado === 'PENDIENTE').length} pendientes)
            </h3>
            <div className="space-y-2">
              {pedidosVisibles.filter((p) => p.estado === 'PENDIENTE').map((p) => {
                const taller = talleres.find((t) => t.id === p.tallerId)
                const solicitante = usuarios.find((u) => u.id === p.solicitanteId)
                const urgencia = URGENCIAS.find((u) => u.value === p.urgencia)
                return (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-bold">{p.folio}</span>
                        <Badge variant={urgencia?.variant}>{urgencia?.label}</Badge>
                        {esSuperAdmin && <Badge variant="outline">{taller?.nombre}</Badge>}
                      </div>
                      <p className="text-sm font-medium">{p.descripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        Solicitante: {solicitante?.nombre} · Cantidad: {p.cantidad} · {formatDate(p.createdAt, true)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="default" onClick={() => handleAprobar(p.id, true)}>
                        <Check className="h-4 w-4 mr-1" /> Aprobar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAprobar(p.id, false)}>
                        <X className="h-4 w-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  </div>
                )
              })}
              {pedidosVisibles.filter((p) => p.estado === 'PENDIENTE').length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay pedidos pendientes de aprobación.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de todos los pedidos */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Urgencia</TableHead>
                <TableHead>Solicitante</TableHead>
                {esSuperAdmin && <TableHead>Taller</TableHead>}
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosVisibles.map((p) => {
                const taller = talleres.find((t) => t.id === p.tallerId)
                const solicitante = usuarios.find((u) => u.id === p.solicitanteId)
                const urgencia = URGENCIAS.find((u) => u.value === p.urgencia)
                const puedeEliminar = p.estado === 'PENDIENTE' && (p.solicitanteId === usuarioActual?.id || esSuperAdmin)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.folio}</TableCell>
                    <TableCell className="text-sm">{p.descripcion}</TableCell>
                    <TableCell className="text-sm text-center">{p.cantidad}</TableCell>
                    <TableCell><Badge variant={urgencia?.variant}>{urgencia?.label}</Badge></TableCell>
                    <TableCell className="text-sm">{solicitante?.nombre}</TableCell>
                    {esSuperAdmin && <TableCell className="text-sm">{taller?.nombre}</TableCell>}
                    <TableCell>
                      <Badge variant={
                        p.estado === 'PENDIENTE' ? 'secondary' :
                        p.estado === 'APROBADO' ? 'default' :
                        p.estado === 'RECHAZADO' ? 'destructive' : 'outline'
                      }>
                        {p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt, true)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {puedeAprobar && p.estado === 'APROBADO' && (
                          <Button size="sm" variant="outline" onClick={() => handleConvertir(p.id)}>
                            <ShoppingCart className="h-3 w-3 mr-1" /> Convertir
                          </Button>
                        )}
                        {puedeEliminar && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleEliminar(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {pedidosVisibles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={esSuperAdmin ? 9 : 8} className="text-center py-8 text-muted-foreground">
                    No hay pedidos registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog nuevo pedido */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Pedido Interno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={3}
                placeholder="Ej: 5x Pantalla Samsung A54 (sin stock)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Urgencia</Label>
                <Select
                  value={form.urgencia}
                  onValueChange={(v) => setForm({ ...form, urgencia: v as UrgenciaPedido })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCIAS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>Crear Pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
