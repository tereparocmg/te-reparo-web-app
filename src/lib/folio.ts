// ============================================================
// Folio Helper — genera folios únicos tipo "V-XXXXXXYYY"
// ============================================================
// Mismo algoritmo que los servicios Electron originales:
// timestamp base36 (últimos 6) + random base36 (3 chars).
// ============================================================

export function generateFolio(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-6)
  const rnd = Math.random().toString(36).toUpperCase().slice(2, 5)
  return `${prefix}-${ts}${rnd}`
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
