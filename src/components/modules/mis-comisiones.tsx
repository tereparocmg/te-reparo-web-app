'use client'

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DollarSign, Clock, CheckCircle2, Wallet, TrendingUp, ShoppingCart, Wrench,
} from 'lucide-react'
import { formatMXN, formatDate } from '@/lib/format'

export function MisComisionesModule() {
  const usuarioActual = useStore((s) => s.usuarioActual)
  const commissionEntries = useStore((s) => s.commissionEntries)
  const operatorPayments = useStore((s) => s.operatorPayments)
  const usuarios = useStore((s) => s.usuarios)

  const operarioId = usuarioActual?.id || ''

  const misComisiones = useMemo(
    () => commissionEntries.filter((ce) => ce.operarioId === operarioId),
    [commissionEntries, operarioId]
  )

  const misPagos = useMemo(
    () => operatorPayments.filter((op) => op.operarioId === operarioId),
    [operatorPayments, operarioId]
  )

  if (!usuarioActual) return null

  const pendientes = misComisiones.filter((ce) => ce.estado === 'ACTIVE' && !ce.operatorPaymentId)
  const pagadas = misComisiones.filter((ce) => ce.estado === 'ACTIVE' && !!ce.operatorPaymentId)
  const canceladas = misComisiones.filter((ce) => ce.estado === 'CANCELLED')

  const totalPendiente = pendientes.reduce((s, ce) => s + ce.amount, 0)
  const totalPagado = pagadas.reduce((s, ce) => s + ce.amount, 0)
  const totalHistorico = misComisiones.filter((ce) => ce.estado === 'ACTIVE').reduce((s, ce) => s + ce.amount, 0)

  const ventasCount = misComisiones.filter((ce) => ce.type === 'SALE' && ce.estado === 'ACTIVE').length
  const serviciosCount = misComisiones.filter((ce) => ce.type === 'SERVICE' && ce.estado === 'ACTIVE').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Comisiones"
        description={`Historial de comisiones y pagos recibidos — ${usuarioActual.nombre}`}
        icon={<DollarSign className="h-5 w-5" />}
      />

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pendiente de Pago"
          value={formatMXN(totalPendiente)}
          subtitle={`${pendientes.length} comisiones`}
          icon={Clock}
          variant="accent"
        />
        <StatCard
          title="Total Pagado"
          value={formatMXN(totalPagado)}
          subtitle={`${misPagos.filter((p) => p.status === 'PAID').length} pagos`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Histórico Total"
          value={formatMXN(totalHistorico)}
          subtitle={`${ventasCount + serviciosCount} comisiones generadas`}
          icon={TrendingUp}
        />
        <StatCard
          title="Pagos Recibidos"
          value={misPagos.filter((p) => p.status === 'PAID').length}
          subtitle={`${misPagos.filter((p) => p.status === 'PENDING').length} pendientes de confirmar`}
          icon={Wallet}
        />
      </div>

      {/* Desglose por tipo */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Comisiones por Ventas</p>
              <p className="text-lg font-bold">{ventasCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Comisiones por Servicios</p>
              <p className="text-lg font-bold">{serviciosCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de comisiones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle de Comisiones Generadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {misComisiones.slice(0, 100).map((ce) => (
                <TableRow key={ce.id}>
                  <TableCell className="text-xs">{formatDate(ce.createdAt, true)}</TableCell>
                  <TableCell className="text-sm">{ce.description}</TableCell>
                  <TableCell>
                    <Badge variant={ce.type === 'SALE' ? 'default' : 'outline'}>
                      {ce.type === 'SALE' ? 'Venta' : 'Servicio'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ce.estado === 'CANCELLED' ? (
                      <Badge variant="destructive">Cancelada</Badge>
                    ) : ce.operatorPaymentId ? (
                      <Badge variant="default" className="bg-green-600">Pagada</Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${
                    ce.estado === 'CANCELLED' ? 'text-muted-foreground line-through' : 'text-accent'
                  }`}>
                    {formatMXN(ce.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {misComisiones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No tienes comisiones registradas aún. Las comisiones se generan automáticamente al realizar ventas o completar servicios.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Historial de pagos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historial de Pagos Recibidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Generado</TableHead>
                <TableHead className="text-center">Comisiones</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Pago</TableHead>
                <TableHead>Confirmado Por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {misPagos.map((op) => {
                const pagadoPor = usuarios.find((u) => u.id === op.paidById)
                return (
                  <TableRow key={op.id}>
                    <TableCell className="font-mono text-xs font-bold">{op.folio}</TableCell>
                    <TableCell className="text-xs">{formatDate(op.date, true)}</TableCell>
                    <TableCell className="text-center">{op.commissionEntryIds.length}</TableCell>
                    <TableCell className="text-right font-bold text-accent">{formatMXN(op.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={op.status === 'PAID' ? 'default' : 'secondary'} className={op.status === 'PAID' ? 'bg-green-600' : ''}>
                        {op.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{op.paidAt ? formatDate(op.paidAt, true) : '—'}</TableCell>
                    <TableCell className="text-sm">{pagadoPor?.nombre || '—'}</TableCell>
                  </TableRow>
                )
              })}
              {misPagos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No has recibido pagos todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canceladas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">Comisiones Canceladas ({canceladas.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {canceladas.map((ce) => (
                  <TableRow key={ce.id} className="opacity-60">
                    <TableCell className="text-xs">{formatDate(ce.createdAt, true)}</TableCell>
                    <TableCell className="text-sm">{ce.description}</TableCell>
                    <TableCell className="text-right text-muted-foreground line-through">{formatMXN(ce.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
