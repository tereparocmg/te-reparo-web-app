'use client'

import { useStore } from '@/lib/store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserRound } from 'lucide-react'

interface ClientSelectorProps {
  value: string
  onChange: (id: string) => void
  tallerId?: string
  className?: string
}

export function ClientSelector({ value, onChange, className }: ClientSelectorProps) {
  const clientes = useStore((s) => s.clientes)

  const ordenados = [...clientes].sort((a, b) => {
    if (a.esClienteGeneral && !b.esClienteGeneral) return -1
    if (!a.esClienteGeneral && b.esClienteGeneral) return 1
    return a.nombre.localeCompare(b.nombre)
  })

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <UserRound className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Seleccionar cliente" />
      </SelectTrigger>
      <SelectContent>
        {ordenados.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="flex items-center gap-2">
              {c.esClienteGeneral && (
                <span className="inline-flex items-center rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  GENERAL
                </span>
              )}
              {c.nombre}
              {c.telefono && (
                <span className="text-xs text-muted-foreground">· {c.telefono}</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
