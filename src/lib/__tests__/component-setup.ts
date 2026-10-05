import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Limpiar el DOM después de cada test
afterEach(() => {
  cleanup()
})

// Polyfill para matchMedia (necesario para next-themes)
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Polyfill para ResizeObserver (necesario para Recharts y cmdk)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof global !== 'undefined' && !global.ResizeObserver) {
  global.ResizeObserver = ResizeObserverMock as any
}

if (typeof window !== 'undefined' && !(window as any).ResizeObserver) {
  ;(window as any).ResizeObserver = ResizeObserverMock
}
