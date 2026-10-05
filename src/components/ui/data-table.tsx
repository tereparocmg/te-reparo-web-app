'use client'

import { useState, useMemo, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export interface Column<T> {
  key: string
  label: string
  truncate?: boolean
  align?: 'left' | 'right' | 'center'
  format?: (value: any, row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  loading?: boolean
  searchable?: boolean
  searchKeys?: string[]
  searchPlaceholder?: string
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  pageSize = 25,
  loading = false,
  searchable = false,
  searchKeys = [],
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay datos para mostrar',
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    setCurrentPage(0)
  }, [debouncedSearch])

  const filteredData = useMemo(() => {
    if (!debouncedSearch || searchKeys.length === 0) return data
    const lower = debouncedSearch.toLowerCase()
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = (row as any)[key]
        return val != null && String(val).toLowerCase().includes(lower)
      })
    )
  }, [data, debouncedSearch, searchKeys])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const safePage = Math.min(currentPage, totalPages - 1)
  const startIndex = safePage * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredData.length)
  const pageData = filteredData.slice(startIndex, endIndex)

  const alignClass = (align?: string) => {
    if (align === 'right') return 'text-right'
    if (align === 'center') return 'text-center'
    return 'text-left'
  }

  return (
    <div className="space-y-3">
      {/* {searchable && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8 h-9"
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}
          </span>
        </div>
      )} */}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={`${alignClass(col.align)} ${col.className || ''} whitespace-nowrap`}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col, j) => (
                    <TableCell key={`skeleton-${i}-${j}`} className={alignClass(col.align)}>
                      <Skeleton className="h-4 w-full max-w-[150px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((row, i) => (
                <TableRow
                  key={(row as any).id || `row-${i}`}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => {
                    const value = (row as any)[col.key]
                    const content = col.format ? col.format(value, row) : value
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass(col.align)} ${col.truncate ? 'max-w-[200px] truncate' : ''} ${col.className || ''}`}
                      >
                        {col.truncate && typeof content === 'string' && content.length > 50
                          ? <span className="block truncate" title={content}>{content.substring(0, 50)}…</span>
                          : content as React.ReactNode}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && filteredData.length > pageSize && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}–{endIndex} de {filteredData.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
