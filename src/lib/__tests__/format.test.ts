import { describe, it, expect, vi } from 'vitest'
import {
  formatMXN, formatDate, formatDateShort, daysBetween, addDays,
  isToday, isSameWeek, generateFolio, generateId, getInitials, exportarExcel,
} from '../format'

describe('formatMXN', () => {
  it('formatea un número como moneda MXN', () => {
    expect(formatMXN(17999)).toBe('$17,999.00')
  })

  it('formatea decimales correctamente', () => {
    expect(formatMXN(269.99)).toBe('$269.99')
  })

  it('devuelve $0.00 para valores nulos o undefined', () => {
    expect(formatMXN(0)).toBe('$0.00')
    expect(formatMXN(null as any)).toBe('$0.00')
    expect(formatMXN(undefined as any)).toBe('$0.00')
  })

  it('formatea números negativos', () => {
    const resultado = formatMXN(-500)
    expect(resultado).toContain('500')
    expect(resultado).toContain('-')
  })

  it('maneja números grandes', () => {
    const resultado = formatMXN(1000000)
    expect(resultado).toContain('1,000,000')
  })
})

describe('formatDate', () => {
  it('formatea una fecha ISO en formato dd/mm/aaaa', () => {
    const resultado = formatDate('2025-01-15T12:00:00Z')
    expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('acepta objetos Date', () => {
    const fecha = new Date('2025-06-15')
    const resultado = formatDate(fecha)
    expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('incluye hora cuando se solicita', () => {
    const resultado = formatDate('2025-01-15T15:30:00', true)
    expect(resultado).toContain(':')
  })

  it('devuelve "—" para fechas inválidas', () => {
    expect(formatDate('no-es-fecha')).toBe('—')
    expect(formatDate('')).toBe('—')
  })
})

describe('formatDateShort', () => {
  it('formatea con mes abreviado', () => {
    const resultado = formatDateShort('2025-01-15')
    expect(resultado).toMatch(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/i)
  })
})

describe('daysBetween', () => {
  it('calcula días entre dos fechas', () => {
    const inicio = '2025-01-01'
    const fin = '2025-01-31'
    expect(daysBetween(inicio, fin)).toBe(30)
  })

  it('devuelve 0 para la misma fecha', () => {
    const fecha = '2025-06-15'
    expect(daysBetween(fecha, fecha)).toBe(0)
  })

  it('devuelve negativo si el fin es anterior al inicio', () => {
    expect(daysBetween('2025-01-31', '2025-01-01')).toBe(-30)
  })
})

describe('addDays', () => {
  it('suma días a una fecha', () => {
    const resultado = addDays('2025-01-01', 30)
    expect(resultado.getDate()).toBe(31)
  })

  it('maneja cambio de mes', () => {
    const resultado = addDays('2025-01-31', 1)
    expect(resultado.getMonth()).toBe(1) // Febrero (0-indexed)
  })

  it('acecha objeto Date', () => {
    const fecha = new Date('2025-06-15')
    const resultado = addDays(fecha, 10)
    expect(resultado.getDate()).toBe(25)
  })
})

describe('isToday', () => {
  it('devuelve true para la fecha actual', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('devuelve false para una fecha pasada', () => {
    const pasado = new Date()
    pasado.setDate(pasado.getDate() - 10)
    expect(isToday(pasado)).toBe(false)
  })

  it('acepta string ISO', () => {
    expect(isToday(new Date().toISOString())).toBe(true)
  })
})

describe('generateFolio', () => {
  it('genera un folio con el prefijo indicado', () => {
    const folio = generateFolio('V')
    expect(folio.startsWith('V-')).toBe(true)
  })

  it('genera folios únicos', () => {
    const folios = new Set<string>()
    for (let i = 0; i < 50; i++) {
      folios.add(generateFolio('OS'))
    }
    // Al menos 48 de 50 deberían ser únicos (puede haber colisión por milisegundo)
    expect(folios.size).toBeGreaterThanOrEqual(48)
  })
})

describe('generateId', () => {
  it('genera un id no vacío', () => {
    const id = generateId()
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(5)
  })

  it('genera ids únicos', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

describe('getInitials', () => {
  it('devuelve las iniciales de un nombre completo', () => {
    expect(getInitials('Laura Sánchez')).toBe('LS')
  })

  it('toma solo las dos primeras palabras', () => {
    expect(getInitials('Juan Pérez García')).toBe('JP')
  })

  it('maneja nombres de una sola palabra', () => {
    expect(getInitials('Admin')).toBe('A')
  })

  it('maneja cadena vacía', () => {
    expect(getInitials('')).toBe('')
  })
})

describe('isSameWeek', () => {
  it('devuelve true para una fecha dentro de los últimos 7 días', () => {
    const fecha = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // hace 3 días
    expect(isSameWeek(fecha)).toBe(true)
  })

  it('devuelve true para la fecha actual', () => {
    expect(isSameWeek(new Date())).toBe(true)
  })

  it('devuelve false para una fecha de hace más de 7 días', () => {
    const fecha = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // hace 30 días
    expect(isSameWeek(fecha)).toBe(false)
  })

  it('devuelve false para una fecha futura', () => {
    const fecha = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // en 10 días
    expect(isSameWeek(fecha)).toBe(false)
  })

  it('acepta string ISO', () => {
    const fecha = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(isSameWeek(fecha)).toBe(true)
  })
})

describe('exportarExcel', () => {
  it('genera un archivo Excel a partir de datos sin errores', async () => {
    const datos = [
      { Fecha: '2025-01-01', Concepto: 'Test', Monto: 100 },
      { Fecha: '2025-01-02', Concepto: 'Test 2', Monto: 200 },
    ]
    // Ejecutar la función — no debe lanzar error
    await expect(exportarExcel(datos, 'test.xlsx', 'Hoja')).resolves.not.toThrow()
  })

  it('maneja datos vacíos', async () => {
    await expect(exportarExcel([], 'vacio.xlsx')).resolves.not.toThrow()
  })

  it('acepta nombre de hoja personalizado', async () => {
    await expect(exportarExcel([{ a: 1 }], 'test.xlsx', 'MiHoja')).resolves.not.toThrow()
  })
})
