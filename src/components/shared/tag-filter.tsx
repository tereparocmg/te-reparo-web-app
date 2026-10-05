'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagFilterProps {
  tallerId: string
  selectedTags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagFilter({ tallerId, selectedTags, onChange, placeholder = 'Filtrar por etiquetas' }: TagFilterProps) {
  const [open, setOpen] = useState(false)
  const productos = useStore((s) => s.productos)
  const piezas = useStore((s) => s.piezas)

  // Recoger todas las etiquetas únicas de productos Y piezas del taller
  const todasLasTags = useMemo(() => {
    const tagsProductos = productos
      .filter((p) => p.tallerId === tallerId && p.activo)
      .flatMap((p) => p.tags || [])
    const tagsPiezas = piezas
      .filter((p) => p.tallerId === tallerId && p.activo)
      .flatMap((p) => p.tags || [])
    return [...new Set([...tagsProductos, ...tagsPiezas])].sort()
  }, [productos, piezas, tallerId])

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Tag className="h-3.5 w-3.5" />
            {placeholder}
            {selectedTags.length > 0 && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-[10px]">
                {selectedTags.length}
              </Badge>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <div className="max-h-60 overflow-y-auto p-2">
            {todasLasTags.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No hay etiquetas disponibles</p>
            ) : (
              todasLasTags.map((tag) => (
                <label
                  key={tag}
                  htmlFor={`tag-${tag}`}
                  className="flex items-center space-x-2 p-1.5 rounded hover:bg-accent/5 cursor-pointer"
                >
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                  />
                  <span className="text-sm">{tag}</span>
                </label>
              ))
            )}
          </div>
          {selectedTags.length > 0 && (
            <div className="border-t p-2">
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => onChange([])}>
                Limpiar selección
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Chips de etiquetas seleccionadas */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                'bg-accent text-accent-foreground hover:bg-accent/80 transition-colors'
              )}
            >
              {tag}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-accent"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  )
}
