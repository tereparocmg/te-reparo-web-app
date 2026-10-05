'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown, Package } from 'lucide-react'
import { formatMXN } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ProductSelectorProps {
  tallerId: string
  onAdd: (productoId: string, cantidad: number) => void
}

export function ProductSelector({ tallerId, onAdd }: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>('')
  const productos = useStore((s) => s.productos)

  const disponibles = useMemo(
    () => productos.filter((p) => p.tallerId === tallerId && p.activo && p.stock > 0),
    [productos, tallerId]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <Package className="h-4 w-4 mr-2 shrink-0" />
          {selected
            ? disponibles.find((p) => p.id === selected)?.nombre
            : 'Buscar producto por nombre, SKU o código...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>No se encontraron productos.</CommandEmpty>
            <CommandGroup>
              {disponibles.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.nombre} ${p.sku} ${p.codigoBarras}`}
                  onSelect={() => {
                    onAdd(p.id, 1)
                    setSelected('')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selected === p.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {p.sku} · Stock: {p.stock}
                    </p>
                  </div>
                  <span className="font-semibold text-accent">{formatMXN(p.precioVenta)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
