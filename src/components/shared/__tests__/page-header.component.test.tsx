import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Wrench } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { renderWithStore } from '@/lib/__tests__/test-utils'

describe('PageHeader', () => {
  it('renderiza el título', () => {
    renderWithStore(<PageHeader title="Mi Módulo" />)
    expect(screen.getByText('Mi Módulo')).toBeInTheDocument()
  })

  it('renderiza la descripción', () => {
    renderWithStore(<PageHeader title="Test" description="Descripción del módulo" />)
    expect(screen.getByText('Descripción del módulo')).toBeInTheDocument()
  })

  it('no renderiza descripción si no se proporciona', () => {
    renderWithStore(<PageHeader title="Test" />)
    expect(screen.queryByText('Descripción')).not.toBeInTheDocument()
  })

  it('renderiza el ícono cuando se proporciona', () => {
    const { container } = renderWithStore(
      <PageHeader title="Test" icon={<Wrench data-testid="icon" />} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renderiza las acciones cuando se proporcionan', () => {
    renderWithStore(
      <PageHeader
        title="Test"
        actions={<Button>Acción</Button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument()
  })

  it('no renderiza acciones si no se proporcionan', () => {
    renderWithStore(<PageHeader title="Test" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('aplica clase de icono accent', () => {
    renderWithStore(
      <PageHeader title="Test" icon={<Wrench data-testid="icon" />} />
    )
    const iconContainer = screen.getByTestId('icon').parentElement
    expect(iconContainer?.className).toContain('bg-accent')
  })
})
