'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useDataService } from '@/lib/electron-adapter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { Wrench, ShieldCheck, UserCog, ShoppingCart, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { ROL_LABELS, type RolUsuario } from '@/lib/types'
import { toast } from 'sonner'

/* const ROLES_DEMO: { rol: RolUsuario; icon: any; email: string; password: string; descripcion: string }[] = [
  {
    rol: 'SUPER_ADMIN',
    icon: ShieldCheck,
    email: 'superadmin@tereparo.mx',
    password: 'admin123',
    descripcion: 'Control total. Visualiza y gestiona todos los talleres.',
  },
  {
    rol: 'ADMIN',
    icon: UserCog,
    email: 'admin.centro@tereparo.mx',
    password: 'admin123',
    descripcion: 'Administra su(s) taller(es) asignado(s).',
  },
  {
    rol: 'VENDEDOR',
    icon: ShoppingCart,
    email: 'vendedor@tereparo.mx',
    password: 'vendedor123',
    descripcion: 'Punto de venta. Registra ventas al cliente general.',
  },
] */

export function LoginScreen() {
  const loginAs = useStore((s) => s.loginAs)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const ok = await useDataService().login(email, password)
      if (!ok) {
        toast.error('Credenciales incorrectas', {
          description: 'Verifica tu correo y contraseña.',
        })
      } else {
        toast.success('Bienvenido a Te Reparo Manager')
      }
    } catch (err: any) {
      toast.error('Error al iniciar sesión', { description: err?.message })
    } finally {
      setLoading(false)
    }
  }

/*   const quickLogin = async (rol: RolUsuario) => {
    if (loading) return
    setLoading(true)
    try {
      const demo = ROLES_DEMO.find((r) => r.rol === rol)
      if (!demo) return
      const ok = await useDataService().login(demo.email, demo.password)
      if (!ok) {
        // Fallback: usar loginAs de Zustand (modo web con datos semilla)
        loginAs(rol)
      }
      toast.success(`Sesión iniciada como ${ROL_LABELS[rol]}`)
    } catch (err: any) {
      toast.error('Error al iniciar sesión', { description: err?.message })
    } finally {
      setLoading(false)
    }
  } */

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex-1 grid lg:grid-cols-2">
        {/* Lado izquierdo — Branding */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden" style={{ backgroundColor: '#1A1A1A' }}>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #E63946 0%, transparent 50%), radial-gradient(circle at 80% 80%, #E63946 0%, transparent 40%)'
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: '#E63946' }}>
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black">Te Reparo</h1>
                <p className="text-xs text-gray-400">Manager · Sistema de Gestión</p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl font-black leading-tight">
                Gestiona tu taller<br />
                <span style={{ color: '#E63946' }}>de reparaciones</span><br />
                como un profesional.
              </h2>
              <p className="text-gray-400 max-w-md">
                Inventario dual, punto de venta, órdenes de servicio con garantía,
                múltiples sucursales y reportes consolidados en una sola plataforma.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {[
                  { label: 'Multi-sucursal', value: '✓' },
                  { label: 'Inventario dual', value: '✓' },
                  { label: 'POS integrado', value: '✓' },
                  { label: 'Garantías', value: '✓' },
                  { label: 'Excel export', value: '✓' },
                  { label: 'Roles y permisos', value: '✓' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm">
                    <span style={{ color: '#E63946' }} className="font-bold">{f.value}</span>
                    <span className="text-gray-300">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 text-xs text-gray-500">
            © 2026 Te Reparo Manager · Desarrollado por Wilber Delfín Hernández Peña
          </div>
        </div>

        {/* Lado derecho — Login */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md space-y-6">
            {/* Mobile branding */}
            <div className="flex lg:hidden items-center justify-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black">Te Reparo</h1>
                <p className="text-xs text-muted-foreground">Manager</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold">Iniciar sesión</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresa tus credenciales para acceder al sistema.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tucorreo@tereparo.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar al sistema'
                )}
              </Button>
            </form>

            {/* Acceso rápido por rol */}
{/*             <div className="pt-4 border-t">
              <p className="text-xs text-center text-muted-foreground mb-3">
                Acceso rápido de demostración (clic para entrar)
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {ROLES_DEMO.map(({ rol, icon: Icon, email, descripcion }) => (
                  <button
                    key={rol}
                    onClick={() => quickLogin(rol)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{ROL_LABELS[rol]}</p>
                      <p className="text-xs text-muted-foreground truncate">{descripcion}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0" />
                  </button>
                ))}
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  )
}
