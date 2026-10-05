import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { DollarSign, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { renderWithStore } from '@/lib/__tests__/test-utils'

describe('StatCard', () => {
  it('renderiza el título y el valor', () => {
    renderWithStore(
      <StatCard title="Ingresos" value="$1,500.00" icon={DollarSign} />
    )
    expect(screen.getByText('Ingresos')).toBeInTheDocument()
    expect(screen.getByText('$1,500.00')).toBeInTheDocument()
  })

  it('renderiza el subtítulo cuando se proporciona', () => {
    renderWithStore(
      <StatCard title="Ventas" value={10} subtitle="Hoy" icon={DollarSign} />
    )
    expect(screen.getByText('Hoy')).toBeInTheDocument()
  })

  it('no renderiza subtítulo si no se proporciona', () => {
    renderWithStore(
      <StatCard title="Total" value={5} icon={DollarSign} />
    )
    expect(screen.queryByText('Hoy')).not.toBeInTheDocument()
  })

  it('acepta números como valor', () => {
    renderWithStore(
      <StatCard title="Count" value={42} icon={TrendingUp} />
    )
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('aplica la variante accent', () => {
    renderWithStore(
      <StatCard title="Accent" value="100" icon={DollarSign} variant="accent" />
    )
    expect(screen.getByText('100').className).toContain('text-accent')
  })

  it('aplica la variante danger', () => {
    renderWithStore(
      <StatCard title="Danger" value="-50" icon={DollarSign} variant="danger" />
    )
    expect(screen.getByText('-50').className).toContain('text-red')
  })

  it('aplica la variante success', () => {
    renderWithStore(
      <StatCard title="Success" value="+100" icon={DollarSign} variant="success" />
    )
    expect(screen.getByText('+100').className).toContain('text-green')
  })

  it('aplica la variante default cuando no se especifica', () => {
    renderWithStore(
      <StatCard title="Default" value="x" icon={DollarSign} />
    )
    expect(screen.getByText('x').className).toContain('text-foreground')
  })

  it('renderiza el ícono', () => {
    const { container } = renderWithStore(
      <StatCard title="Con icono" value="1" icon={DollarSign} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('trunca títulos largos', () => {
    renderWithStore(
      <StatCard title="Un título muy largo que debería truncarse" value="1" icon={DollarSign} />
    )
    expect(screen.getByText('Un título muy largo que debería truncarse').className).toContain('truncate')
  })
})
