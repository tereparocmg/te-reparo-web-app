'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { UserCog, Plus, Pencil, Cpu, CircuitBoard } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { ESPECIALIDAD_LABELS, type EspecialidadOperario } from '@/lib/types'
import { toast } from 'sonner'

export function OperariosModule() {
  const operarios = useStore((s) => s.operarios)
  const usuarioActual = useStore((s) => s.usuarioActual)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState<{ nombre: string; telefono?: string; especialidad: EspecialidadOperario }>({
    nombre: '', telefono: '', especialidad: 'ELECTRONICA',
  })

  const puedeEditar = usuarioActual?.rol === 'SUPER_ADMIN' || usuarioActual?.rol === 'ADMIN'

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: '', telefono: '', especialidad: 'ELECTRONICA' })
    setDialogOpen(true)
  }

  const abrirEditar = (id: string) => {
    const op = operarios.find((o) => o.id === id)
    if (!op) return
    setEditando(id)
    setForm({ nombre: op.nombre, telefono: op.telefono, especialidad: op.especialidad })
    setDialogOpen(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    try {
      await useDataService().saveOperario({
        id: editando || undefined,
        nombre: form.nombre,
        telefono: form.telefono,
        especialidad: form.especialidad,
      })
      toast.success(editando ? 'Operario actualizado' : 'Operario creado')
      setDialogOpen(false)
    } catch (err: any) {
      console.error('[Operarios] Error al guardar:', err)
      toast.error('Error al guardar el operario', { description: err?.message })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Operarios"
        description="Registro de operarios de electrónica e informática (sin acceso al sistema)"
        icon={<UserCog className="h-5 w-5" />}
        actions={puedeEditar && (
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Operario
          </Button>
        )}
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha registro</TableHead>
                {puedeEditar && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {operarios.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium">{op.nombre}</TableCell>
                  <TableCell className="text-sm">{op.telefono || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={op.especialidad === 'ELECTRONICA' ? 'default' : 'secondary'}>
                      {op.especialidad === 'ELECTRONICA' ? (
                        <span className="flex items-center gap-1"><CircuitBoard className="h-3 w-3" /> {ESPECIALIDAD_LABELS[op.especialidad]}</span>
                      ) : (
                        <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {ESPECIALIDAD_LABELS[op.especialidad]}</span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={op.activo ? 'default' : 'secondary'}>
                      {op.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(op.createdAt)}</TableCell>
                  {puedeEditar && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(op.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {operarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={puedeEditar ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    No hay operarios registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Operario' : 'Nuevo Operario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Diego Ramírez" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Ej: 55 1234 5678" />
            </div>
            <div className="space-y-2">
              <Label>Especialidad *</Label>
              <Select
                value={form.especialidad}
                onValueChange={(v) => setForm({ ...form, especialidad: v as EspecialidadOperario })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ELECTRONICA">Electrónica</SelectItem>
                  <SelectItem value="INFORMATICA">Informática</SelectItem>
                </SelectContent>
              </Select>
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
