'use client'

// ============================================================
// AdminResourceBrowser — generic CRUD browser for any cloud table.
// Used by AdminWorkshopDetail to render any of the 14+ resources
// belonging to a remote workshop via the Cloud Data Service.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Search, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  cloudCreateResource, cloudDeleteResource, cloudListResource, cloudUpdateResource,
} from '@/lib/cloud-data-service'
import { formatDate } from '@/lib/format'

// ============================================================
// Types
// ============================================================

type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'date' | 'boolean'

interface ColumnDef {
  key: string
  label: string
  money?: boolean
  date?: boolean
  bool?: boolean
  truncate?: boolean
}

interface FormFieldDef {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
}

// ============================================================
// Helpers
// ============================================================

function formatMoney(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  return `$${n.toFixed(2)}`
}

function formatCell(value: any, col: ColumnDef): string {
  if (value === null || value === undefined || value === '') return '—'
  if (col.money) return formatMoney(value)
  if (col.date) return formatDate(value, true)
  if (typeof value === 'boolean') return value ? '🟢' : '⚪'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Convert ISO date string to value usable by <input type="datetime-local">
function isoToLocalInput(iso: any): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert local datetime input back to ISO string
function localInputToIso(local: string): string {
  if (!local) return ''
  const d = new Date(local)
  if (isNaN(d.getTime())) return local
  return d.toISOString()
}

// Coerce a form value based on its field type before sending to the API
function coerceValue(field: FormFieldDef, raw: any): any {
  if (raw === null || raw === undefined) return null
  switch (field.type) {
    case 'number':
      if (raw === '') return 0
      const n = Number(raw)
      return isNaN(n) ? 0 : n
    case 'boolean':
      return !!raw
    case 'date':
      return localInputToIso(raw)
    default:
      return raw
  }
}

// ============================================================
// TABLE_COLUMNS — which fields to display per table
// ============================================================

const TABLE_COLUMNS: Record<string, ColumnDef[]> = {
  venta: [
    { key: 'folio', label: 'Folio' },
    { key: 'clienteId', label: 'Cliente', truncate: true },
    { key: 'total', label: 'Total', money: true },
    { key: 'metodoPago', label: 'Pago' },
    { key: 'estado', label: 'Estado' },
    { key: 'createdAt', label: 'Fecha', date: true },
  ],
  servicio: [
    { key: 'folio', label: 'Folio' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'marca', label: 'Marca' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'estado', label: 'Estado' },
    { key: 'total', label: 'Total', money: true },
    { key: 'pagado', label: 'Pagado', bool: true },
    { key: 'createdAt', label: 'Fecha', date: true },
  ],
  producto: [
    { key: 'sku', label: 'SKU' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'precioVenta', label: 'Precio', money: true },
    { key: 'stock', label: 'Stock' },
    { key: 'stockMinimo', label: 'Min' },
    { key: 'activo', label: 'Activo', bool: true },
  ],
  pieza: [
    { key: 'sku', label: 'SKU' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'precioVenta', label: 'Precio', money: true },
    { key: 'stock', label: 'Stock' },
    { key: 'stockMinimo', label: 'Min' },
    { key: 'activo', label: 'Activo', bool: true },
  ],
  cliente: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'email', label: 'Email' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'createdAt', label: 'Registro', date: true },
  ],
  movimiento: [
    { key: 'tipo', label: 'Tipo' },
    { key: 'concepto', label: 'Concepto' },
    { key: 'monto', label: 'Monto', money: true },
    { key: 'categoria', label: 'Categoría' },
    { key: 'fecha', label: 'Fecha', date: true },
  ],
  garantia: [
    { key: 'folio', label: 'Folio' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'fechaInicio', label: 'Inicio', date: true },
    { key: 'fechaVencimiento', label: 'Vence', date: true },
    { key: 'estado', label: 'Estado' },
  ],
  usuario: [
    { key: 'email', label: 'Email' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'rol', label: 'Rol' },
    { key: 'activo', label: 'Activo', bool: true },
    { key: 'createdAt', label: 'Registro', date: true },
  ],
  operario: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'especialidad', label: 'Especialidad' },
    { key: 'activo', label: 'Activo', bool: true },
    { key: 'createdAt', label: 'Registro', date: true },
  ],
  pedidoInterno: [
    { key: 'folio', label: 'Folio' },
    { key: 'descripcion', label: 'Descripción', truncate: true },
    { key: 'cantidad', label: 'Cant' },
    { key: 'urgencia', label: 'Urgencia' },
    { key: 'estado', label: 'Estado' },
    { key: 'createdAt', label: 'Fecha', date: true },
  ],
  devolucion: [
    { key: 'folio', label: 'Folio' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'cantidad', label: 'Cant' },
    { key: 'motivo', label: 'Motivo', truncate: true },
    { key: 'estado', label: 'Estado' },
    { key: 'createdAt', label: 'Fecha', date: true },
  ],
  commissionEntry: [
    { key: 'operarioId', label: 'Operario', truncate: true },
    { key: 'type', label: 'Tipo' },
    { key: 'amount', label: 'Monto', money: true },
    { key: 'description', label: 'Descripción', truncate: true },
    { key: 'estado', label: 'Estado' },
    { key: 'createdAt', label: 'Fecha', date: true },
  ],
  operatorPayment: [
    { key: 'folio', label: 'Folio' },
    { key: 'operarioId', label: 'Operario', truncate: true },
    { key: 'amount', label: 'Monto', money: true },
    { key: 'status', label: 'Estado' },
    { key: 'date', label: 'Fecha', date: true },
  ],
  configuracionGlobal: [
    { key: 'moneda', label: 'Moneda' },
    { key: 'pais', label: 'País' },
    { key: 'tipoCambio', label: 'T. Cambio' },
    { key: 'syncEnabled', label: 'Sync', bool: true },
    { key: 'updatedAt', label: 'Actualizado', date: true },
  ],
}

// ============================================================
// TABLE_FORM_FIELDS — which fields to show in create/edit dialogs
// ============================================================

const ESTADO_VENTA_OPTS = [
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'ANULADA', label: 'Anulada' },
]
const ESTADO_SERVICIO_OPTS = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]
const TIPO_SERVICIO_OPTS = [
  { value: 'ELECTRONICA', label: 'Electrónica' },
  { value: 'INFORMATICA', label: 'Informática' },
]
const ESPECIALIDAD_OPTS = [
  { value: 'ELECTRONICA', label: 'Electrónica' },
  { value: 'INFORMATICA', label: 'Informática' },
]
const ROL_OPTS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'VENDEDOR', label: 'Vendedor' },
]
const TIPO_MOVIMIENTO_OPTS = [
  { value: 'INGRESO', label: 'Ingreso' },
  { value: 'GASTO', label: 'Gasto' },
  { value: 'COMPRA', label: 'Compra' },
]
const TIPO_GARANTIA_OPTS = [
  { value: 'PRODUCTO', label: 'Producto' },
  { value: 'SERVICIO', label: 'Servicio' },
]
const ESTADO_GARANTIA_OPTS = [
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'VENCIDA', label: 'Vencida' },
  { value: 'INVALIDADA', label: 'Invalidada' },
]
const TIPO_DEVOLUCION_OPTS = [
  { value: 'PRODUCTO', label: 'Producto' },
  { value: 'PIEZA', label: 'Pieza' },
]
const ESTADO_DEVOLUCION_OPTS = [
  { value: 'PENDIENTE_REVISION', label: 'Pendiente Revisión' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'RECHAZADA', label: 'Rechazada' },
]
const URGENCIA_OPTS = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
]
const ESTADO_PEDIDO_OPTS = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'APROBADO', label: 'Aprobado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
  { value: 'CONVERTIDO', label: 'Convertido' },
]
const TIPO_COMISION_OPTS = [
  { value: 'SALE', label: 'Venta' },
  { value: 'SERVICE', label: 'Servicio' },
]
const ESTADO_COMISION_OPTS = [
  { value: 'ACTIVE', label: 'Activa' },
  { value: 'CANCELLED', label: 'Cancelada' },
]
const ESTADO_PAGO_OPTS = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PAID', label: 'Pagado' },
]
const TIPO_CLIENTE_OPTS = [
  { value: 'PERSONA_NATURAL', label: 'Persona Natural' },
  { value: 'EMPRESA', label: 'Empresa' },
]

const TABLE_FORM_FIELDS: Record<string, FormFieldDef[]> = {
  venta: [
    { key: 'folio', label: 'Folio', type: 'text' },
    { key: 'clienteId', label: 'Cliente ID', type: 'text' },
    { key: 'vendedorId', label: 'Vendedor ID', type: 'text' },
    { key: 'operarioId', label: 'Operario ID', type: 'text' },
    { key: 'subtotal', label: 'Subtotal', type: 'number' },
    { key: 'total', label: 'Total', type: 'number' },
    { key: 'metodoPago', label: 'Método de Pago', type: 'text' },
    { key: 'estado', label: 'Estado', type: 'select', options: ESTADO_VENTA_OPTS },
    { key: 'notas', label: 'Notas', type: 'textarea' },
  ],
  servicio: [
    { key: 'folio', label: 'Folio', type: 'text' },
    { key: 'clienteId', label: 'Cliente ID', type: 'text' },
    { key: 'operarioId', label: 'Operario ID', type: 'text' },
    { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_SERVICIO_OPTS },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'imei', label: 'IMEI', type: 'text' },
    { key: 'problemaReportado', label: 'Problema Reportado', type: 'textarea' },
    { key: 'diagnostico', label: 'Diagnóstico', type: 'textarea' },
    { key: 'descripcionServicio', label: 'Descripción Servicio', type: 'textarea' },
    { key: 'estado', label: 'Estado', type: 'select', options: ESTADO_SERVICIO_OPTS },
    { key: 'precioManoObra', label: 'Mano de Obra', type: 'number' },
    { key: 'subtotalPiezas', label: 'Subtotal Piezas', type: 'number' },
    { key: 'total', label: 'Total', type: 'number' },
    { key: 'metodoPago', label: 'Método de Pago', type: 'text' },
    { key: 'pagado', label: 'Pagado', type: 'boolean' },
    { key: 'fechaEntrega', label: 'Fecha Entrega', type: 'date' },
    { key: 'garantiaDias', label: 'Días Garantía', type: 'number' },
  ],
  producto: [
    { key: 'sku', label: 'SKU', type: 'text' },
    { key: 'codigoBarras', label: 'Código de Barras', type: 'text' },
    { key: 'nombre', label: 'Nombre', type: 'text' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' },
    { key: 'precioCosto', label: 'Precio Costo', type: 'number' },
    { key: 'precioVenta', label: 'Precio Venta', type: 'number' },
    { key: 'stock', label: 'Stock', type: 'number' },
    { key: 'stockMinimo', label: 'Stock Mínimo', type: 'number' },
    { key: 'garantiaDias', label: 'Garantía (días)', type: 'number' },
    { key: 'categoriaId', label: 'Categoría ID', type: 'text' },
    { key: 'activo', label: 'Activo', type: 'boolean' },
  ],
  pieza: [
    { key: 'sku', label: 'SKU', type: 'text' },
    { key: 'codigoBarras', label: 'Código de Barras', type: 'text' },
    { key: 'nombre', label: 'Nombre', type: 'text' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' },
    { key: 'costoUnitario', label: 'Costo Unitario', type: 'number' },
    { key: 'precioVenta', label: 'Precio Venta', type: 'number' },
    { key: 'stock', label: 'Stock', type: 'number' },
    { key: 'stockMinimo', label: 'Stock Mínimo', type: 'number' },
    { key: 'garantiaFabricaDias', label: 'Garantía Fábrica (días)', type: 'number' },
    { key: 'categoriaId', label: 'Categoría ID', type: 'text' },
    { key: 'activo', label: 'Activo', type: 'boolean' },
  ],
  cliente: [
    { key: 'nombre', label: 'Nombre', type: 'text' },
    { key: 'telefono', label: 'Teléfono', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_CLIENTE_OPTS },
    { key: 'rfc', label: 'RFC', type: 'text' },
    { key: 'direccion', label: 'Dirección', type: 'textarea' },
    { key: 'esClienteGeneral', label: 'Cliente General', type: 'boolean' },
  ],
  movimiento: [
    { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_MOVIMIENTO_OPTS },
    { key: 'concepto', label: 'Concepto', type: 'text' },
    { key: 'monto', label: 'Monto', type: 'number' },
    { key: 'categoria', label: 'Categoría', type: 'text' },
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'notas', label: 'Notas', type: 'textarea' },
  ],
  garantia: [
    { key: 'folio', label: 'Folio', type: 'text' },
    { key: 'clienteId', label: 'Cliente ID', type: 'text' },
    { key: 'ventaId', label: 'Venta ID', type: 'text' },
    { key: 'servicioId', label: 'Servicio ID', type: 'text' },
    { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_GARANTIA_OPTS },
    { key: 'fechaInicio', label: 'Fecha Inicio', type: 'date' },
    { key: 'duracionDias', label: 'Duración (días)', type: 'number' },
    { key: 'fechaVencimiento', label: 'Fecha Vencimiento', type: 'date' },
    { key: 'descripcionCobertura', label: 'Cobertura', type: 'textarea' },
    { key: 'estado', label: 'Estado', type: 'select', options: ESTADO_GARANTIA_OPTS },
  ],
  usuario: [
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'password', label: 'Password', type: 'text' },
    { key: 'nombre', label: 'Nombre', type: 'text' },
    { key: 'rol', label: 'Rol', type: 'select', options: ROL_OPTS },
    { key: 'telefono', label: 'Teléfono', type: 'text' },
    { key: 'activo', label: 'Activo', type: 'boolean' },
  ],
  operario: [
    { key: 'nombre', label: 'Nombre', type: 'text' },
    { key: 'telefono', label: 'Teléfono', type: 'text' },
    { key: 'especialidad', label: 'Especialidad', type: 'select', options: ESPECIALIDAD_OPTS },
    { key: 'activo', label: 'Activo', type: 'boolean' },
  ],
  pedidoInterno: [
    { key: 'folio', label: 'Folio', type: 'text' },
    { key: 'solicitanteId', label: 'Solicitante ID', type: 'text' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' },
    { key: 'cantidad', label: 'Cantidad', type: 'number' },
    { key: 'urgencia', label: 'Urgencia', type: 'select', options: URGENCIA_OPTS },
    { key: 'estado', label: 'Estado', type: 'select', options: ESTADO_PEDIDO_OPTS },
    { key: 'notas', label: 'Notas', type: 'textarea' },
  ],
  devolucion: [
    { key: 'folio', label: 'Folio', type: 'text' },
    { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_DEVOLUCION_OPTS },
    { key: 'ventaId', label: 'Venta ID', type: 'text' },
    { key: 'servicioId', label: 'Servicio ID', type: 'text' },
    { key: 'productoId', label: 'Producto ID', type: 'text' },
    { key: 'piezaId', label: 'Pieza ID', type: 'text' },
    { key: 'cantidad', label: 'Cantidad', type: 'number' },
    { key: 'motivo', label: 'Motivo', type: 'textarea' },
    { key: 'estado', label: 'Estado', type: 'select', options: ESTADO_DEVOLUCION_OPTS },
    { key: 'notasRevision', label: 'Notas Revisión', type: 'textarea' },
  ],
  commissionEntry: [
    { key: 'operarioId', label: 'Operario ID', type: 'text' },
    { key: 'ventaId', label: 'Venta ID', type: 'text' },
    { key: 'servicioId', label: 'Servicio ID', type: 'text' },
    { key: 'amount', label: 'Monto', type: 'number' },
    { key: 'type', label: 'Tipo', type: 'select', options: TIPO_COMISION_OPTS },
    { key: 'description', label: 'Descripción', type: 'textarea' },
    { key: 'estado', label: 'Estado', type: 'select', options: ESTADO_COMISION_OPTS },
  ],
  operatorPayment: [
    { key: 'folio', label: 'Folio', type: 'text' },
    { key: 'operarioId', label: 'Operario ID', type: 'text' },
    { key: 'amount', label: 'Monto', type: 'number' },
    { key: 'date', label: 'Fecha', type: 'date' },
    { key: 'paidAt', label: 'Fecha Pago', type: 'date' },
    { key: 'status', label: 'Estado', type: 'select', options: ESTADO_PAGO_OPTS },
    { key: 'notas', label: 'Notas', type: 'textarea' },
  ],
  configuracionGlobal: [
    { key: 'moneda', label: 'Moneda', type: 'text' },
    { key: 'pais', label: 'País', type: 'text' },
    { key: 'tipoCambio', label: 'Tipo de Cambio', type: 'number' },
    { key: 'syncEnabled', label: 'Sync Habilitado', type: 'boolean' },
    { key: 'syncInterval', label: 'Intervalo Sync', type: 'number' },
    { key: 'serverUrl', label: 'URL del Servidor', type: 'text' },
  ],
}

// ============================================================
// Auto-detect columns from data keys (fallback)
// ============================================================

function detectColumns(sample: any): ColumnDef[] {
  if (!sample || typeof sample !== 'object') return []
  const SKIP = new Set(['syncedAt', 'syncVersion', 'deletedAt'])
  return Object.keys(sample)
    .filter((k) => !SKIP.has(k))
    .map((k) => {
      const v = sample[k]
      const col: ColumnDef = { key: k, label: k }
      if (typeof v === 'number') {
        if (/precio|costo|monto|total|amount|subtotal|value/i.test(k)) col.money = true
      }
      if (v !== null && v !== undefined && (typeof v === 'string' || typeof v === 'object') && !Array.isArray(v)) {
        const s = typeof v === 'string' ? v : ''
        if (/date|fecha|At|paidAt/i.test(k) || /^\d{4}-\d{2}-\d{2}/.test(s)) col.date = true
      }
      if (typeof v === 'boolean') col.bool = true
      return col
    })
}

// ============================================================
// Component
// ============================================================

interface AdminResourceBrowserProps {
  workshopId: string
  tableName: string
}

const PAGE_SIZE = 20

export function AdminResourceBrowser({ workshopId, tableName }: AdminResourceBrowserProps) {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<any | null>(null)
  const [deleteRecord, setDeleteRecord] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Stable ref to latest data for column auto-detection
  const columns = useMemo<ColumnDef[]>(() => {
    const explicit = TABLE_COLUMNS[tableName]
    if (explicit) return explicit
    if (data.length > 0) return detectColumns(data[0])
    return []
  }, [tableName, data])

  const formFields = useMemo<FormFieldDef[]>(() => {
    const explicit = TABLE_FORM_FIELDS[tableName]
    if (explicit) return explicit
    if (data.length > 0) {
      // Auto-detect form fields from data keys
      const SKIP = new Set(['id', 'createdAt', 'updatedAt', 'syncedAt', 'syncVersion', 'deletedAt'])
      return Object.keys(data[0])
        .filter((k) => !SKIP.has(k))
        .map((k) => {
          const v = (data[0] as any)[k]
          let type: FieldType = 'text'
          if (typeof v === 'number') type = 'number'
          else if (typeof v === 'boolean') type = 'boolean'
          else if (v && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) type = 'date'
          return { key: k, label: k, type }
        })
    }
    return []
  }, [tableName, data])

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await cloudListResource(workshopId, tableName, page, PAGE_SIZE)
      setData(res?.data || [])
      setTotal(res?.total || 0)
    } catch (err: any) {
      console.error('[admin-browser] list error', err)
      setError(err?.message || 'Error al cargar registros')
      toast.error(`Error al listar ${tableName}`, { description: err?.message })
    } finally {
      setLoading(false)
    }
  }, [workshopId, tableName, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // Filter current page client-side by search term
  const filteredData = useMemo(() => {
    if (!search.trim()) return data
    const q = search.trim().toLowerCase()
    return data.filter((row) => {
      const fields = ['nombre', 'descripcion', 'folio', 'concepto', 'email', 'sku', 'marca', 'modelo']
      return fields.some((f) => row?.[f] && String(row[f]).toLowerCase().includes(q))
    })
  }, [data, search])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  // ---- Create / Edit handlers ----

  const handleSave = async (record: any, isNew: boolean) => {
    setSaving(true)
    try {
      // Build payload from form fields (coerce values)
      const payload: Record<string, any> = {}
      for (const f of formFields) {
        payload[f.key] = coerceValue(f, record[f.key])
      }
      if (isNew) {
        await cloudCreateResource(workshopId, tableName, payload)
        toast.success('Registro creado correctamente')
      } else {
        const id = record.id || record._id
        if (!id) throw new Error('Registro sin ID')
        await cloudUpdateResource(workshopId, tableName, id, payload)
        toast.success('Registro actualizado correctamente')
      }
      setCreateOpen(false)
      setEditRecord(null)
      await fetchList()
    } catch (err: any) {
      console.error('[admin-browser] save error', err)
      toast.error(isNew ? 'Error al crear registro' : 'Error al actualizar registro', {
        description: err?.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteRecord) return
    const id = deleteRecord.id || deleteRecord._id
    if (!id) {
      toast.error('Registro sin ID')
      setDeleteRecord(null)
      return
    }
    setDeleting(true)
    try {
      await cloudDeleteResource(workshopId, tableName, id)
      toast.success('Registro eliminado')
      setDeleteRecord(null)
      await fetchList()
    } catch (err: any) {
      console.error('[admin-browser] delete error', err)
      toast.error('Error al eliminar registro', { description: err?.message })
    } finally {
      setDeleting(false)
    }
  }

  // ============================================================
  // Render helpers
  // ============================================================

  const renderCell = (row: any, col: ColumnDef) => {
    const v = row?.[col.key]
    if (col.bool && typeof v === 'boolean') {
      return <span title={v ? 'Sí' : 'No'}>{v ? '🟢' : '⚪'}</span>
    }
    const txt = formatCell(v, col)
    if (col.truncate) {
      return <span className="block max-w-[180px] truncate" title={txt}>{txt}</span>
    }
    return <span>{txt}</span>
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, folio, descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Button size="sm" variant="outline" onClick={fetchList} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
          <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!hasNext || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-xs">
              {total} registro{total === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Cargando registros...
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
            <span>No hay registros en <strong>{tableName}</strong>.</span>
          </div>
        ) : (
          <div className="rounded-md border max-h-[480px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur z-10">
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, idx) => (
                  <TableRow key={row.id || row._id || idx}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>{renderCell(row, col)}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditRecord(row)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteRecord(row)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      <RecordFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={`Nuevo · ${tableName}`}
        description={`Crear un nuevo registro en la tabla ${tableName} del taller remoto.`}
        fields={formFields}
        initial={{}}
        saving={saving}
        onSave={(payload) => handleSave(payload, true)}
      />

      {/* Edit dialog */}
      <RecordFormDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title={`Editar · ${tableName}`}
        description="Modifica los campos del registro seleccionado."
        fields={formFields}
        initial={editRecord || {}}
        saving={saving}
        onSave={(payload) => handleSave({ ...editRecord, ...payload }, false)}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro
              {deleteRecord?.folio ? ` ${deleteRecord.folio}` : deleteRecord?.id ? ` ${deleteRecord.id}` : ''}
              {' '}será marcado como eliminado (soft-delete) en el cloud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ============================================================
// RecordFormDialog — generic form generator
// ============================================================

interface RecordFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  fields: FormFieldDef[]
  initial: Record<string, any>
  saving: boolean
  onSave: (payload: Record<string, any>) => void
}

function RecordFormDialog({
  open, onOpenChange, title, description, fields, initial, saving, onSave,
}: RecordFormDialogProps) {
  // The inner form is conditionally mounted only while `open` is true,
  // and keyed by `initial` so switching between records (without closing)
  // forces a fresh mount with lazy-initialized state — no effect needed.
  const formKey = `${fields.map((f) => f.key).join(',')}::${JSON.stringify(initial)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {open && (
          <RecordForm
            key={formKey}
            fields={fields}
            initial={initial}
            saving={saving}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface RecordFormProps {
  fields: FormFieldDef[]
  initial: Record<string, any>
  saving: boolean
  onSave: (payload: Record<string, any>) => void
  onCancel: () => void
}

function RecordForm({ fields, initial, saving, onSave, onCancel }: RecordFormProps) {
  // Lazy state initialization — runs once per mount (per open / per record switch)
  const [values, setValues] = useState<Record<string, any>>(() => {
    const next: Record<string, any> = {}
    for (const f of fields) {
      const raw = initial?.[f.key]
      if (f.type === 'date') next[f.key] = isoToLocalInput(raw)
      else if (f.type === 'boolean') next[f.key] = !!raw
      else if (f.type === 'number') next[f.key] = raw !== null && raw !== undefined ? raw : ''
      else next[f.key] = raw ?? ''
    }
    return next
  })

  const setValue = (key: string, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
            <Label htmlFor={f.key} className="text-xs">{f.label}</Label>
            {f.type === 'textarea' ? (
              <Textarea
                id={f.key}
                value={values[f.key] ?? ''}
                onChange={(e) => setValue(f.key, e.target.value)}
                rows={2}
                className="text-sm"
              />
            ) : f.type === 'select' ? (
              <Select value={values[f.key] ?? ''} onValueChange={(v) => setValue(f.key, v)}>
                <SelectTrigger id={f.key} className="h-9 text-sm">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  {(f.options || []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : f.type === 'boolean' ? (
              <div className="flex items-center gap-2 h-9">
                <Switch
                  id={f.key}
                  checked={!!values[f.key]}
                  onCheckedChange={(v) => setValue(f.key, v)}
                />
                <span className="text-xs text-muted-foreground">
                  {values[f.key] ? 'Sí' : 'No'}
                </span>
              </div>
            ) : f.type === 'number' ? (
              <Input
                id={f.key}
                type="number"
                step="any"
                value={values[f.key] ?? ''}
                onChange={(e) => setValue(f.key, e.target.value)}
                className="h-9 text-sm"
              />
            ) : f.type === 'date' ? (
              <Input
                id={f.key}
                type="datetime-local"
                value={values[f.key] ?? ''}
                onChange={(e) => setValue(f.key, e.target.value)}
                className="h-9 text-sm"
              />
            ) : (
              <Input
                id={f.key}
                type="text"
                value={values[f.key] ?? ''}
                onChange={(e) => setValue(f.key, e.target.value)}
                className="h-9 text-sm"
              />
            )}
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
