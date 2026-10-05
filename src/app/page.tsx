'use client'

import { useStore } from '@/lib/store'
import { LoginScreen } from '@/components/login-screen'
import { AppShell } from '@/components/app-shell'
import { AdminShell } from '@/components/admin-shell'

export default function Home() {
  const usuario = useStore((s) => s.usuarioActual)
  const vistaMode = useStore((s) => s.vistaMode)

  if (!usuario) return <LoginScreen />
  // Si el usuario activó el modo admin (multi-taller cloud), mostrar el AdminShell.
  // Solo disponible para SUPER_ADMIN (validado en el sidebar).
  if (vistaMode === 'admin' && usuario.rol === 'SUPER_ADMIN') {
    return <AdminShell />
  }
  return <AppShell />
}
