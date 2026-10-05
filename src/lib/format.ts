// Utilidades de formato — Te Reparo Manager

// Tipo de cambio global (se actualiza desde el store)
let TIPO_CAMBIO = 650

export function setTipoCambio(valor: number) {
  TIPO_CAMBIO = valor || 650
}

export function getTipoCambio(): number {
  return TIPO_CAMBIO
}

/**
 * Formatea un precio en USD y muestra también el equivalente en CUP.
 * Ejemplo: formatMXN(100) → "$100.00 USD ($65,000.00 CUP)"
 */
export function formatMXN(cantidad: number): string {
  const usd = new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cantidad || 0)
  const cup = (cantidad || 0) * TIPO_CAMBIO
  return `${usd} (${formatCUP(cup)})`
}

/**
 * Formatea solo en USD.
 */
export function formatUSD(cantidad: number): string {
  return new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cantidad || 0)
}

/**
 * Formatea solo en CUP.
 */
export function formatCUP(cantidad: number): string {
  return new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'CUP',
    minimumFractionDigits: 2,
  }).format(cantidad || 0)
}

/**
 * Convierte USD a CUP usando el tipo de cambio actual.
 */
export function usdToCUP(usd: number): number {
  return (usd || 0) * TIPO_CAMBIO
}

export function formatDate(fecha: string | Date, conHora = false): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  if (isNaN(d.getTime())) return '—'
  const opts: Intl.DateTimeFormatOptions = conHora
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }
  return d.toLocaleDateString('es-CU', opts)
}

export function formatDateShort(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function daysBetween(inicio: string | Date, fin: string | Date): number {
  const a = typeof inicio === 'string' ? new Date(inicio) : inicio
  const b = typeof fin === 'string' ? new Date(fin) : fin
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function addDays(fecha: string | Date, dias: number): Date {
  const d = typeof fecha === 'string' ? new Date(fecha) : new Date(fecha)
  d.setDate(d.getDate() + dias)
  return d
}

export function isToday(fecha: string | Date): boolean {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  const hoy = new Date()
  return d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear()
}

export function isSameWeek(fecha: string | Date): boolean {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  const ahora = new Date()
  const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
  return d >= hace7dias && d <= ahora
}

export function generateFolio(prefijo: string): string {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6)
  const random = Math.random().toString(36).toUpperCase().slice(2, 5)
  return `${prefijo}-${timestamp}${random}`
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')
}

export async function exportarExcel(
  datos: Record<string, any>[],
  nombreArchivo: string,
  hoja = 'Movimientos'
) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(datos)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, hoja)
  XLSX.writeFile(wb, nombreArchivo)
}
