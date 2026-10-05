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
  Users, Plus, Pencil, Trash2, Eye, Phone, Mail, MapPin, ShieldCheck, ShoppingCart, Wrench,
} from 'lucide-react'
import { formatDate, formatMXN } from '@/lib/format'
import { type Cliente, type TipoCliente } from '@/lib/types'
import { toast } from 'sonner'

export function ClientesModule() {
  const clientes = useStore((s) => s.clientes)
  const ventas = useStore((s) => s.ventas)
  const servicios = useStore((s) => s.servicios)
  const garantias = useStore((s) => s.garantias)

  const [busqueda, setBusqueda] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [verCliente, setVerCliente] = useState<Cliente | null>(null)
  const [dialogMigrar, setDialogMigrar] = useState<Cliente | null>(null)
  const [form, setForm] = useState<Partial<Cliente>>({})
  const [clienteMigrarDestino, setClienteMigrarDestino] = useState('')

  const clientesFiltrados = clientes.filter((c) =>
    busqueda === '' ||
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.telefono || '').includes(busqueda) ||
    (c.rfc || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ tipo: 'PERSONA_NATURAL' })
    setDialogOpen(true)
  }

  const abrirEditar = (c: Cliente) => {
    setEditando(c)
    setForm(c)
    setDialogOpen(true)
  }

  const guardar = async () => {
    if (!form.nombre || !form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    try {
      await useDataService().saveCliente({ ...form, id: editando?.id })
      toast.success(editando ? 'Cliente actualizado' : 'Cliente creado')
      setDialogOpen(false)
    } catch (err: any) {
      console.error('[Clientes] Error al guardar:', err)
      toast.error('Error al guardar el cliente', { description: err?.message })
    }
  }

  const handleEliminar = async (c: Cliente) => {
    if (c.esClienteGeneral) {
      toast.error('El Cliente General no puede eliminarse')
      return
    }
    try {
      await useDataService().deleteCliente(c.id)
      toast.success('Cliente eliminado')
    } catch (err: any) {
      console.error('[Clientes] Error al eliminar:', err)
      toast.error('Error al eliminar el cliente', { description: err?.message })
    }
  }

  const handleMigrar = async () => {
    if (!dialogMigrar || !clienteMigrarDestino) return
    try {
      await useDataService().migrarGarantiasCliente(dialogMigrar.id, clienteMigrarDestino)
      toast.success('Garantías migradas correctamente')
      setDialogMigrar(null)
      setClienteMigrarDestino('')
    } catch (err: any) {
      console.error('[Clientes] Error al migrar garantías:', err)
      toast.error('Error al migrar garantías', { description: err?.message })
    }
  }

  const getHistorialCliente = (clienteId: string) => {
    const cli = ventas.filter((v) => v.clienteId === clienteId)
    const srv = servicios.filter((s) => s.clienteId === clienteId)
    const gar = garantias.filter((g) => g.clienteId === clienteId)
    return { ventas: cli, servicios: srv, garantias: gar }
  }

  const clienteVisto = verCliente ? { cliente: verCliente, ...getHistorialCliente(verCliente.id) } : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Clientes"
        description="Administra clientes y su historial"
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Input
          placeholder="Buscar por nombre, teléfono o RFC..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre / Razón Social</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead className="text-center">Compras</TableHead>
                <TableHead className="text-center">Servicios</TableHead>
                <TableHead className="text-center">Garantías</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesFiltrados.map((c) => {
                const hist = getHistorialCliente(c.id)
                return (
                  <TableRow key={c.id} className={c.esClienteGeneral ? 'bg-accent/5' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{c.nombre}</p>
                          {c.esClienteGeneral && (
                            <Badge variant="outline" className="text-[10px]">GENERAL</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.tipo === 'PERSONA_NATURAL' ? 'Persona' : 'Empresa'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.telefono && <p>{c.telefono}</p>}
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      {!c.telefono && !c.email && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{c.rfc || '—'}</TableCell>
                    <TableCell className="text-center text-sm">{hist.ventas.length}</TableCell>
                    <TableCell className="text-center text-sm">{hist.servicios.length}</TableCell>
                    <TableCell className="text-center text-sm">{hist.garantias.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVerCliente(c)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {c.esClienteGeneral && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDialogMigrar(c)}
                            title="Migrar garantías a cliente registrado"
                          >
                            <ShieldCheck className="h-4 w-4 text-accent" />
                          </Button>
                        )}
                        {!c.esClienteGeneral && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleEliminar(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog crear/editar cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Nombre o Razón Social *</Label>
              <Input
                value={form.nombre || ''}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                disabled={editando?.esClienteGeneral}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo || 'PERSONA_NATURAL'}
                onValueChange={(v) => setForm({ ...form, tipo: v as TipoCliente })}
                disabled={editando?.esClienteGeneral}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONA_NATURAL">Persona Natural</SelectItem>
                  <SelectItem value="EMPRESA">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>RFC</Label>
              <Input value={form.rfc || ''} onChange={(e) => setForm({ ...form, rfc: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Dirección</Label>
              <Textarea value={form.direccion || ''} onChange={(e) => setForm({ ...form, direccion: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ver cliente */}
      <Dialog open={!!clienteVisto} onOpenChange={(o) => !o && setVerCliente(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {clienteVisto?.cliente.nombre}
              {clienteVisto?.cliente.esClienteGeneral && (
                <Badge variant="outline">CLIENTE GENERAL</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {clienteVisto && (
            <div className="space-y-4">
              {/* Datos */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {clienteVisto.cliente.telefono && (
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{clienteVisto.cliente.telefono}</div>
                )}
                {clienteVisto.cliente.email && (
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{clienteVisto.cliente.email}</div>
                )}
                {clienteVisto.cliente.rfc && (
                  <div className="flex items-center gap-2">RFC: {clienteVisto.cliente.rfc}</div>
                )}
                {clienteVisto.cliente.direccion && (
                  <div className="flex items-center gap-2 col-span-2"><MapPin className="h-4 w-4 text-muted-foreground" />{clienteVisto.cliente.direccion}</div>
                )}
              </div>

              <Separator />

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg border">
                  <ShoppingCart className="h-5 w-5 mx-auto text-accent mb-1" />
                  <p className="text-2xl font-bold">{clienteVisto.ventas.length}</p>
                  <p className="text-xs text-muted-foreground">Compras</p>
                </div>
                <div className="text-center p-3 rounded-lg border">
                  <Wrench className="h-5 w-5 mx-auto text-accent mb-1" />
                  <p className="text-2xl font-bold">{clienteVisto.servicios.length}</p>
                  <p className="text-xs text-muted-foreground">Servicios</p>
                </div>
                <div className="text-center p-3 rounded-lg border">
                  <ShieldCheck className="h-5 w-5 mx-auto text-accent mb-1" />
                  <p className="text-2xl font-bold">{clienteVisto.garantias.length}</p>
                  <p className="text-xs text-muted-foreground">Garantías</p>
                </div>
              </div>

              {/* Garantías */}
              {clienteVisto.garantias.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Garantías</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {clienteVisto.garantias.map((g) => (
                      <div key={g.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div>
                          <p className="font-mono text-xs">{g.folio}</p>
                          <p className="text-xs text-muted-foreground">{g.tipo} · Vence: {formatDate(g.fechaVencimiento)}</p>
                        </div>
                        <Badge variant={g.estado === 'ACTIVA' ? 'default' : 'secondary'}>{g.estado}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compras recientes */}
              {clienteVisto.ventas.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Compras Recientes</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {clienteVisto.ventas.slice(0, 5).map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div>
                          <p className="font-mono text-xs">{v.folio}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(v.createdAt)} · {v.items.length} items</p>
                        </div>
                        <span className="font-bold">{formatMXN(v.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Servicios */}
              {clienteVisto.servicios.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Servicios Recientes</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {clienteVisto.servicios.slice(0, 5).map((s) => (
                      <div key={o.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div>
                          <p className="font-mono text-xs">{s.folio}</p>
                          <p className="text-xs text-muted-foreground">{s.marca} {s.modelo} · {s.problemaReportado}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{s.estado}</Badge>
                          <span className="font-bold">{formatMXN(s.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVerCliente(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog migrar garantías */}
      <Dialog open={!!dialogMigrar} onOpenChange={(o) => !o && setDialogMigrar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Migrar Garantías del Cliente General</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Todas las garantías del Cliente General se transferirán al cliente seleccionado.
          </p>
          <div className="space-y-2 py-2">
            <Label>Cliente destino</Label>
            <Select value={clienteMigrarDestino} onValueChange={setClienteMigrarDestino}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {clientes.filter((c) => !c.esClienteGeneral).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMigrar(null)}>Cancelar</Button>
            <Button onClick={handleMigrar} disabled={!clienteMigrarDestino}>Migrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
