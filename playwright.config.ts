import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración de Playwright para tests E2E de Te Reparo Manager.
 * Inicia automáticamente el dev server de Next.js en el puerto 3000.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Los tests comparten localStorage, mejor secuencial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Cada test empieza con storage limpio
    storageState: undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
})
