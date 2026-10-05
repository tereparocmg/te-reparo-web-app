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
import { Users, Plus, Pencil, ShieldCheck, UserCog, ShoppingCart, Cpu, CircuitBoard } from 'lucide-react'
import { ROL_LABELS, type RolUsuario, type Usuario } from '@/lib/types'
import { toast } from 'sonner'

const ROLES: { value: RolUsuario; label: string; icon: any }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador', icon: ShieldCheck },
  { value: 'ADMIN', label: 'Administrador', icon: UserCog },
  { value: 'VENDEDOR', label: 'Vendedor', icon: ShoppingCart },
  { value: 'INFORMATICO', label: 'Informático', icon: Cpu },
  { value: 'ELECTRONICO', label: 'Electrónico', icon: CircuitBoard },
]

export function UsuariosModule() {
  const usuarios = useStore((s) => s.usuarios)
  const talleres = useStore((s) => s.talleres)
  const usuarioActual = useStore((s) => s.usuarioActual)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState<Partial<Usuario>>({})

  const esSuperAdmin = usuarioActual?.rol === 'SUPER_ADMIN'

  const talleresAsignados = esSuperAdmin
    ? talleres.filter((t) => t.activo)
    : talleres.filter((t) => usuarioActual?.tallerIds.includes(t.id))

  const usuariosVisibles = esSuperAdmin
    ? usuarios
    : usuarios.filter((u) => u.tallerIds.some((tid) => usuarioActual?.tallerIds.includes(tid)))

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ rol: 'VENDEDOR', activo: true, tallerIds: talleresAsignados.map((t) => t.id) })
    setDialogOpen(true)
  }

  const abrirEditar = (u: Usuario) => {
    setEditando(u)
    setForm(u)
    setDialogOpen(true)
  }

  const guardar = async () => {
    if (!form.nombre || !form.email || !form.rol) {
      toast.error('Faltan campos obligatorios')
      return
    }
    try {
      // useDataService enruta a Electron IPC (-> Prisma -> SQLite) cuando hay
      // electronAPI, y hace fallback al saveUsuario de Zustand en modo web puro.
      // El adapter ya sincroniza Zustand desde SQLite tras la mutación.
      await useDataService().saveUsuario({ ...form, id: editando?.id })
      toast.success(editando ? 'Usuario actualizado' : 'Usuario creado')
      setDialogOpen(false)
    } catch (err: any) {
      console.error('[usuarios] Error al guardar el usuario:', err)
      toast.error('Error al guardar el usuario', { description: err?.message })
    }
  }

  const toggleTaller = (tallerId: string) => {
    const actuales = form.tallerIds || []
    const nuevas = actuales.includes(tallerId)
      ? actuales.filter((id) => id !== tallerId)
      : [...actuales, tallerId]
    setForm({ ...form, tallerIds: nuevas })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Usuarios"
        description="Administra los usuarios del sistema y sus asignaciones a talleres"
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Talleres Asignados</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuariosVisibles.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{u.nombre}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROL_LABELS[u.rol]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{u.telefono || '—'}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-wrap gap-1">
                      {u.tallerIds.map((tid) => {
                        const t = talleres.find((x) => x.id === tid)
                        return t ? (
                          <Badge key={tid} variant="secondary" className="text-[10px]">
                            {t.nombre}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? 'default' : 'secondary'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico *</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={form.password || ''}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editando ? 'Dejar vacío para mantener' : 'Contraseña por defecto'}
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={form.rol} onValueChange={(v) => setForm({ ...form, rol: v as RolUsuario })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => {
                    const Icon = r.icon
                    return (
                      <SelectItem key={r.value} value={r.value} disabled={!esSuperAdmin && r.value === 'SUPER_ADMIN'}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {r.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Talleres asignados</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {talleresAsignados.map((t) => (
                  <div key={t.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`taller-${t.id}`}
                      checked={form.tallerIds?.includes(t.id) || false}
                      onCheckedChange={() => toggleTaller(t.id)}
                    />
                    <Label htmlFor={`taller-${t.id}`} className="text-sm font-normal cursor-pointer">
                      {t.nombre}
                    </Label>
                  </div>
                ))}
              </div>
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
