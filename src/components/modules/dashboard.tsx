'use client'

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign, Package, AlertTriangle, ShoppingCart, Wrench,
  TrendingUp, Clock, ShieldCheck, Building2, Users, Wallet, Coins,
} from 'lucide-react'
import { formatMXN, formatDate, isToday } from '@/lib/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts'

export function DashboardModule() {
  const usuario = useStore((s) => s.usuarioActual)
  const tallerActualId = useStore((s) => s.tallerActualId)
  const setVista = useStore((s) => s.setVista)
  const talleres = useStore((s) => s.talleres)
  const ventas = useStore((s) => s.ventas)
  const servicios = useStore((s) => s.servicios)
  const productos = useStore((s) => s.productos)
  const piezas = useStore((s) => s.piezas)
  const movimientos = useStore((s) => s.movimientos)
  const garantias = useStore((s) => s.garantias)
  const pedidos = useStore((s) => s.pedidos)
  const commissionEntries = useStore((s) => s.commissionEntries)
  const operatorPayments = useStore((s) => s.operatorPayments)

  const esSuperAdmin = usuario?.rol === 'SUPER_ADMIN'
  const talleresAccesibles = useMemo(() => {
    if (!usuario) return []
    if (esSuperAdmin) return talleres.filter((t) => t.activo)
    return talleres.filter((t) => usuario.tallerIds.includes(t.id))
  }, [usuario, talleres, esSuperAdmin])

  // Filtrar datos por taller (o todos si super admin)
  const talleresIds = talleresAccesibles.map((t) => t.id)
  const ventasFiltradas = ventas.filter(
    (v) => talleresIds.includes(v.tallerId) && v.estado === 'COMPLETADA'
  )
  const serviciosFiltrados = servicios.filter((s) => talleresIds.includes(s.tallerId))
  const movimientosFiltrados = movimientos.filter((m) => talleresIds.includes(m.tallerId))
  const productosFiltrados = productos.filter((p) => talleresIds.includes(p.tallerId))
  const piezasFiltradas = piezas.filter((p) => talleresIds.includes(p.tallerId))
  const garantiasFiltradas = garantias.filter((g) => talleresIds.includes(g.tallerId))
  const pedidosFiltrados = pedidos.filter((p) => talleresIds.includes(p.tallerId))
  const comisionesFiltradas = commissionEntries.filter((ce) => talleresIds.includes(ce.tallerId))
  const operatorPaymentsFiltrados = operatorPayments.filter((op) => talleresIds.includes(op.tallerId))

  // Métricas del día
  const ventasHoy = ventasFiltradas.filter((v) => isToday(v.createdAt))
  const serviciosHoy = serviciosFiltrados.filter((o) => isToday(o.createdAt))
  const movimientosHoy = movimientosFiltrados.filter((m) => isToday(m.fecha))
  const ingresoHoy = movimientosHoy
    .filter((m) => m.tipo === 'INGRESO')
    .reduce((s, m) => s + m.monto, 0)
  const gastoHoy = movimientosHoy
    .filter((m) => m.tipo === 'GASTO' || m.tipo === 'COMPRA')
    .reduce((s, m) => s + m.monto, 0)
  const balanceHoy = ingresoHoy - gastoHoy

  const stockBajo = [
    ...productosFiltrados.filter((p) => p.activo && p.stock <= p.stockMinimo),
    ...piezasFiltradas.filter((p) => p.activo && p.stock <= p.stockMinimo),
  ]
  const pedidosPendientes = pedidosFiltrados.filter((p) => p.estado === 'PENDIENTE')
  const serviciosPendientes = serviciosFiltrados.filter(
    (o) => s.estado === 'PENDIENTE' || s.estado === 'COMPLETADO'
  )
  const garantiasActivas = garantiasFiltradas.filter((g) => {
    if (g.estado !== 'ACTIVA') return false
    const diasRestantes = (new Date(g.fechaVencimiento).getTime() - Date.now()) / 86400000
    return diasRestantes > 0 && diasRestantes <= 15 // Próximas a vencer
  })

  // Datos para gráficos
  const datosSemana = useMemo(() => {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const hoy = new Date()
    const diaSemana = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1 // Lunes = 0
    return dias.map((d, i) => {
      const fecha = new Date(hoy)
      fecha.setDate(hoy.getDate() - diaSemana + i)
      const inicio = new Date(fecha.setHours(0, 0, 0, 0))
      const fin = new Date(inicio.getTime() + 86400000)
      const ventasDia = ventasFiltradas.filter((v) => {
        const fv = new Date(v.createdAt)
        return fv >= inicio && fv < fin
      })
      const serviciosDia = serviciosFiltrados.filter((o) => {
        const fo = new Date(o.createdAt)
        return fo >= inicio && fo < fin && o.pagado
      })
      return {
        dia: d,
        ventas: ventasDia.reduce((s, v) => s + v.total, 0),
        servicios: serviciosDia.reduce((s, o) => s + o.total, 0),
      }
    })
  }, [ventasFiltradas, serviciosFiltrados])

  // Comparativa por sucursal (solo super admin)
  const datosSucursales = useMemo(() => {
    return talleresAccesibles.map((t) => {
      const ventasT = ventasFiltradas
        .filter((v) => v.tallerId === t.id && isToday(v.createdAt))
        .reduce((s, v) => s + v.total, 0)
      const serviciosT = serviciosFiltrados
        .filter((o) => o.tallerId === t.id && o.pagado && isToday(s.createdAt))
        .reduce((s, o) => s + o.total, 0)
      return {
        nombre: t.nombre.length > 15 ? t.nombre.substring(0, 12) + '...' : t.nombre,
        ingresos: ventasT + serviciosT,
      }
    })
  }, [talleresAccesibles, ventasFiltradas, serviciosFiltrados])

  const datosPieCategorias = useMemo(() => {
    const categorias: Record<string, number> = {}
    for (const v of ventasHoy) {
      for (const item of v.items) {
        const prod = productosFiltrados.find((p) => p.id === item.productoId)
        const cat = prod?.categoriaId
          ? useStore.getState().categorias.find((c) => c.id === prod?.categoriaId)?.nombre
          : 'Sin categoría'
        categorias[cat || 'Sin categoría'] = (categorias[cat || 'Sin categoría'] || 0) + item.subtotal
      }
    }
    return Object.entries(categorias).map(([name, value]) => ({ name, value }))
  }, [ventasHoy, productosFiltrados])

  const COLORS = ['#E63946', '#1A1A1A', '#FF6B6B', '#4A4A4A', '#C1121F', '#888888']

  return (
    <div className="space-y-6">
      <PageHeader
        title={esSuperAdmin ? 'Panel Global — Todas las Sucursales' : `Panel — ${talleres.find((t) => t.id === tallerActualId)?.nombre || ''}`}
        description={`Resumen de actividad al ${formatDate(new Date())}`}
        icon={<TrendingUp className="h-5 w-5" />}
      />

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos Hoy"
          value={formatMXN(ingresoHoy)}
          subtitle={`${ventasHoy.length} ventas · ${serviciosHoy.length} órdenes`}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Gastos Hoy"
          value={formatMXN(gastoHoy)}
          subtitle="Compras + gastos"
          icon={Wallet}
          variant="danger"
        />
        <StatCard
          title="Balance Hoy"
          value={formatMXN(balanceHoy)}
          subtitle={balanceHoy >= 0 ? 'Positivo' : 'Negativo'}
          icon={TrendingUp}
          variant={balanceHoy >= 0 ? 'accent' : 'danger'}
        />
        {esSuperAdmin ? (
          <StatCard
            title="Sucursales Activas"
            value={talleresAccesibles.length}
            subtitle={`${pedidosPendientes.length} pedidos pendientes`}
            icon={Building2}
          />
        ) : (
          <StatCard
            title="Garantías por Vencer"
            value={garantiasActivas.length}
            subtitle="Próximos 15 días"
            icon={ShieldCheck}
            variant="accent"
          />
        )}
      </div>

      {/* Segunda fila: comisiones (Admin/Super Admin) o Mis Comisiones (operarios) */}
      {esSuperAdmin || usuario?.rol === 'ADMIN' ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Comisiones Pendientes"
            value={formatMXN(comisionesFiltradas
              .filter((ce) => ce.estado === 'ACTIVE' && !ce.operatorPaymentId)
              .reduce((s, ce) => s + ce.amount, 0))}
            subtitle={`${comisionesFiltradas.filter((ce) => ce.estado === 'ACTIVE' && !ce.operatorPaymentId).length} comisiones sin liquidar`}
            icon={Coins}
            variant="accent"
          />
          <StatCard
            title="Pagos por Confirmar"
            value={operatorPaymentsFiltrados.filter((op) => op.status === 'PENDING').length}
            subtitle="En estado PENDING"
            icon={Clock}
            variant="danger"
          />
          <Card className="hover:border-accent transition-colors cursor-pointer" onClick={() => setVista('comisiones')}>
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gestionar Pagos</p>
                <p className="text-sm font-semibold mt-1">Ir al módulo de comisiones</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Coins className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : usuario?.rol === 'VENDEDOR' || usuario?.rol === 'INFORMATICO' || usuario?.rol === 'ELECTRONICO' ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Mis Comisiones Pendientes"
            value={formatMXN(comisionesFiltradas
              .filter((ce) => ce.operarioId === usuario?.id && ce.estado === 'ACTIVE' && !ce.operatorPaymentId)
              .reduce((s, ce) => s + ce.amount, 0))}
            subtitle={`${comisionesFiltradas.filter((ce) => ce.operarioId === usuario?.id && ce.estado === 'ACTIVE' && !ce.operatorPaymentId).length} comisiones`}
            icon={Coins}
            variant="accent"
          />
          <StatCard
            title="Mis Comisiones Pagadas"
            value={formatMXN(comisionesFiltradas
              .filter((ce) => ce.operarioId === usuario?.id && ce.estado === 'ACTIVE' && !!ce.operatorPaymentId)
              .reduce((s, ce) => s + ce.amount, 0))}
            subtitle="Histórico"
            icon={Wallet}
            variant="success"
          />
          <Card className="hover:border-accent transition-colors cursor-pointer" onClick={() => setVista('comisiones')}>
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ver Detalle</p>
                <p className="text-sm font-semibold mt-1">Ir a Mis Comisiones</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Coins className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Alertas */}
      {(stockBajo.length > 0 || pedidosPendientes.length > 0 || serviciosPendientes.length > 0) && (
        <div className="grid md:grid-cols-3 gap-4">
          {stockBajo.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Stock Bajo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                {stockBajo.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{item.nombre}</span>
                    <Badge variant="destructive" className="ml-2 shrink-0">
                      {item.stock}/{item.stockMinimo}
                    </Badge>
                  </div>
                ))}
                {stockBajo.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{stockBajo.length - 5} más...</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setVista('inventario-productos')}
                >
                  Ver inventario
                </Button>
              </CardContent>
            </Card>
          )}

          {pedidosPendientes.length > 0 && (usuario?.rol === 'SUPER_ADMIN' || usuario?.rol === 'ADMIN') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-accent" />
                  Pedidos Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                {pedidosPendientes.slice(0, 5).map((p) => (
                  <div key={p.id} className="text-sm">
                    <p className="truncate">{p.descripcion}</p>
                    <Badge variant={p.urgencia === 'ALTA' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {p.urgencia}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setVista('pedidos')}
                >
                  Ver pedidos
                </Button>
              </CardContent>
            </Card>
          )}

          {serviciosPendientes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-accent" />
                  Órdenes en Proceso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                {serviciosPendientes.slice(0, 5).map((o) => (
                  <div key={o.id} className="text-sm">
                    <p className="font-medium truncate">{o.marca} {o.modelo}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.problemaReportado}</p>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setVista('servicios')}
                >
                  Ver órdenes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos de la Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={datosSemana}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(v: number) => formatMXN(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="ventas" stroke="#E63946" strokeWidth={2} name="Ventas" />
                <Line type="monotone" dataKey="servicios" stroke="#1A1A1A" strokeWidth={2} name="Servicios" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {esSuperAdmin && datosSucursales.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ingresos Hoy por Sucursal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={datosSucursales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="nombre" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(v: number) => formatMXN(v)}
                  />
                  <Bar dataKey="ingresos" fill="#E63946" radius={[4, 4, 0, 0]} name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : datosPieCategorias.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventas Hoy por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={datosPieCategorias}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    label={(entry: any) => `${entry.name}`}
                  >
                    {datosPieCategorias.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMXN(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => setVista('pos')}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Nueva Venta
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setVista('servicios')}>
                <Wrench className="h-4 w-4 mr-2" /> Nueva Orden de Servicio
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setVista('garantias')}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Ver Garantías
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setVista('clientes')}>
                <Users className="h-4 w-4 mr-2" /> Gestión de Clientes
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Movimientos recientes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Movimientos Recientes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setVista('movimientos')}>
            Ver todos
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {movimientosFiltrados.slice(0, 10).map((m) => {
              const taller = talleres.find((t) => t.id === m.tallerId)
              const usuarioM = useStore.getState().usuarios.find((u) => u.id === m.usuarioId)
              const esIngreso = m.tipo === 'INGRESO'
              return (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                      esIngreso ? 'bg-green-500/10 text-green-600' :
                      m.tipo === 'GASTO' ? 'bg-red-500/10 text-red-600' :
                      'bg-blue-500/10 text-blue-600'
                    }`}>
                      {esIngreso ? <DollarSign className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.concepto}</p>
                      <p className="text-xs text-muted-foreground">
                        {taller?.nombre} · {usuarioM?.nombre} · {formatDate(m.fecha, true)}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${
                    esIngreso ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {esIngreso ? '+' : '-'}{formatMXN(m.monto)}
                  </span>
                </div>
              )
            })}
            {movimientosFiltrados.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay movimientos registrados.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
