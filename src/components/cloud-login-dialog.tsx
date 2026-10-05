'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Cloud, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import {
  cloudLogin, isLoggedInCloud, getCloudServerUrl, initCloudServerUrl,
} from '@/lib/cloud-data-service'

interface CloudLoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (user: any) => void
}

export function CloudLoginDialog({ open, onOpenChange, onSuccess }: CloudLoginDialogProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [loading, setLoading] = useState(false)

  // Al montar, inicializar serverUrl desde SyncState o localStorage
  useEffect(() => {
    if (!open) return
    initCloudServerUrl().then(() => {
      const url = getCloudServerUrl()
      if (url) setServerUrl(url)
    })
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !serverUrl) {
      toast.error('Completa todos los campos')
      return
    }
    setLoading(true)
    try {
      const result = await cloudLogin(email, password, serverUrl)
      toast.success('Conectado al Cloud', { description: result.user?.email })
      onSuccess?.(result.user)
      onOpenChange(false)
      // Limpiar password por seguridad
      setPassword('')
    } catch (err: any) {
      console.error('[cloud-login] error:', err)
      toast.error('No se pudo conectar al cloud', { description: err?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Conectar al Cloud (Super-Admin)
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>URL del Cloud API</Label>
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://te-reparo-cloud-api.up.railway.app"
              required
            />
            <p className="text-xs text-muted-foreground">
              Es la URL que Railway te asigna al hacer deploy del cloud-api.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Email (super-admin del cloud)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadmin@tereparo.cu"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              La que configuraste en <code>SUPER_ADMIN_PASSWORD</code> del cloud.
            </p>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Conectar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook de utilidad: ¿está el super-admin logueado al cloud?
export function useCloudAuth() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Inicializar serverUrl desde SyncState
    initCloudServerUrl().finally(() => {
      setLoggedIn(isLoggedInCloud())
      setLoading(false)
    })
  }, [])

  return { loggedIn, loading }
}
