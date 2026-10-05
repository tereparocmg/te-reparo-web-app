'use client'

import { useState } from 'react'
import { useDataService } from '@/lib/electron-adapter'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Cliente, TipoCliente } from '@/lib/types'

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (cliente: Cliente) => void
  /** Si se pasa, se inicializa el form con estos valores */
  defaults?: Partial<Cliente>
  /** Si es true, omite el selector tipo (siempre PERSONA_NATURAL) */
  hideTipo?: boolean
}

const EMPTY_FORM = {
  nombre: '',
  telefono: '',
  email: '',
  tipo: 'PERSONA_NATURAL' as TipoCliente,
  rfc: '',
  direccion: '',
}

export function ClientFormDialog({
  open,
  onOpenChange,
  onCreated,
  defaults,
  hideTipo,
}: ClientFormDialogProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...defaults })
  const [saving, setSaving] = useState(false)

  const reset = () => setForm({ ...EMPTY_FORM, ...defaults })

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      const result = await useDataService().saveCliente({
        ...form,
        esClienteGeneral: false,
      })
      const nuevoCliente = typeof result === 'string'
        ? { id: result, ...form, esClienteGeneral: false, createdAt: new Date().toISOString() } as Cliente
        : (result as Cliente)

      toast.success('Cliente creado', { description: form.nombre })
      onCreated?.(nuevoCliente)
      reset()
      onOpenChange(false)
    } catch (err: any) {
      console.error('[ClientFormDialog] Error al guardar:', err)
      toast.error('Error al crear el cliente', { description: err?.message })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nuevo Cliente
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-2">
            <Label>Nombre completo *</Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Juan Pérez García"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="+53 5 123 4567"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="correo@ejemplo.cu"
            />
          </div>
          {!hideTipo && (
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as TipoCliente })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONA_NATURAL">Persona Natural</SelectItem>
                  <SelectItem value="EMPRESA">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {form.tipo === 'EMPRESA' && (
            <div className="space-y-2">
              <Label>RFC / Identificador fiscal</Label>
              <Input
                value={form.rfc}
                onChange={(e) => setForm({ ...form, rfc: e.target.value })}
                placeholder="Ej: DTI950101AAA"
              />
            </div>
          )}
          <div className="col-span-2 space-y-2">
            <Label>Dirección</Label>
            <Textarea
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              rows={2}
              placeholder="Calle, número, municipio, provincia"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.nombre.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Cliente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
