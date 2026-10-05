import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { ThemeToggle } from '@/components/theme-toggle'
import { renderWithStore } from '@/lib/__tests__/test-utils'

describe('ThemeToggle', () => {
  it('renderiza un botón con aria-label Cambiar tema', () => {
    renderWithStore(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Cambiar tema' })).toBeInTheDocument()
  })

  it('renderiza los íconos de sol y luna', () => {
    const { container } = renderWithStore(<ThemeToggle />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(2)
  })
})
