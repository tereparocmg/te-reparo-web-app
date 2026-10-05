import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.component.test.tsx',
    ],
    setupFiles: [
      './src/lib/__tests__/setup.ts',
      './src/lib/__tests__/component-setup.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/lib/**', 'src/components/shared/**', 'src/components/modules/**', 'src/components/*.tsx'],
      exclude: [
        'src/**/*.test.*',
        'src/**/__tests__/**',
        'src/components/ui/**', // Componentes shadcn/ui, no código de negocio
        'src/components/theme-provider.tsx',
        'src/lib/db.ts', // Configuración de Prisma, no se usa en runtime (Zustand en memoria)
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
