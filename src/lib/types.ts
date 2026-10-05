// ============ TIPOS DEL DOMINIO — Te Reparo Manager ============

export type RolUsuario = 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR'

export type EspecialidadOperario = 'ELECTRONICA' | 'INFORMATICA'

export interface Operario {
  id: string
  nombre: string
  telefono?: string
  especialidad: EspecialidadOperario
  activo: boolean
  createdAt: string
}

export interface Usuario {
  id: string
  email: string
  password: string
  nombre: string
  rol: RolUsuario
  activo: boolean
  telefono?: string
  tallerIds: string[]
}

export interface Taller {
  id: string
  nombre: string
  direccion: string
  telefono: string
  encargado?: string
  activo: boolean
  rfc?: string
  razonSocial?: string
  ciudad?: string
  codigoPostal?: string
  limiteDescuento: number
  horarioApertura?: string
  horarioCierre?: string
  metodosPago: string
  garantiaProductoDias: number
  garantiaServicioDias: number
  plantillaGarantia?: string
}

export type TipoCliente = 'PERSONA_NATURAL' | 'EMPRESA'

export interface Cliente {
  id: string
  nombre: string
  telefono?: string
  email?: string
  tipo: TipoCliente
  rfc?: string
  direccion?: string
  esClienteGeneral: boolean
  createdAt: string
}

export type TipoCategoria = 'PRODUCTO' | 'PIEZA'

export interface Categoria {
  id: string
  nombre: string
  tipo: TipoCategoria
  activa: boolean
  tallerId: string
}

export type TipoComision = 'PERCENTAGE' | 'FIXED'

export interface Producto {
  id: string
  sku: string
  codigoBarras: string
  nombre: string
  descripcion?: string
  precioCosto: number
  precioVenta: number
  stock: number
  stockMinimo: number
  garantiaDias: number
  categoriaId?: string
  tallerId: string
  activo: boolean
  // Comisión para operario
  operatorCommissionType?: TipoComision | null
  operatorCommissionValue?: number | null
  // Etiquetas para búsqueda y filtrado
  tags: string[]
}

export interface Pieza {
  id: string
  sku: string
  codigoBarras: string
  nombre: string
  descripcion?: string
  costoUnitario: number
  precioVenta: number  // Precio al que se cobra la pieza en una reparación
  stock: number
  stockMinimo: number
  garantiaFabricaDias?: number
  categoriaId?: string
  tallerId: string
  activo: boolean
  // Pago al operario (técnico que usa la pieza en reparación)
  operatorPaymentType?: TipoComision | null
  operatorPaymentValue?: number | null
  // Etiquetas para búsqueda y filtrado
  tags: string[]
}

export interface VentaItem {
  id: string
  productoId: string
  producto?: Producto
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface Venta {
  id: string
  folio: string
  tallerId: string
  clienteId: string
  vendedorId: string
  operarioId?: string  // Operario al que se le asigna la venta
  items: VentaItem[]
  subtotal: number
  total: number
  metodoPago: string
  estado: 'COMPLETADA' | 'ANULADA'
  notas?: string
  createdAt: string
}

export interface ServicioItemPieza {
  id: string
  piezaId: string
  pieza?: Pieza
  cantidad: number
  costoUnitario: number
  precioVenta: number
  subtotal: number
}

export type TipoServicio = 'ELECTRONICA' | 'INFORMATICA'
export type EstadoServicio = 'PENDIENTE' | 'COMPLETADO' | 'ENTREGADO' | 'CANCELADO'

export interface Servicio {
  id: string
  folio: string
  tallerId: string
  clienteId: string
  operarioId: string  // Operario que realiza el servicio
  tipo: TipoServicio   // Electrónica o Informática
  marca: string
  modelo: string
  imei?: string
  problemaReportado: string
  diagnostico?: string
  descripcionServicio: string  // Descripción del servicio realizado
  estado: EstadoServicio
  piezasUtilizadas: ServicioItemPieza[]
  precioManoObra: number
  subtotalPiezas: number
  total: number
  metodoPago: string
  pagado: boolean
  notas?: string
  fechaEntrega?: string
  garantiaDias: number  // Días de garantía del servicio
  createdAt: string
}

export type TipoGarantia = 'PRODUCTO' | 'SERVICIO'
export type EstadoGarantia = 'ACTIVA' | 'VENCIDA' | 'INVALIDADA'

export interface Garantia {
  id: string
  folio: string
  tallerId: string
  clienteId: string
  ventaId?: string
  servicioId?: string
  tipo: TipoGarantia
  fechaInicio: string
  duracionDias: number
  fechaVencimiento: string
  descripcionCobertura?: string
  estado: EstadoGarantia
  emitidaPorId: string
  createdAt: string
}

export type ResolucionReclamacion = 'REPARACION_SIN_COSTO' | 'REEMPLAZO' | 'RECHAZO'

export interface ReclamacionGarantia {
  id: string
  garantiaId: string
  fecha: string
  descripcion: string
  resolucion: ResolucionReclamacion
  motivoResolucion?: string
  atendidaPorId: string
}

export type TipoMovimiento = 'INGRESO' | 'GASTO' | 'COMPRA'

// ============ DEVOLUCIONES ============

export type EstadoDevolucion = 'PENDIENTE_REVISION' | 'APROBADA' | 'RECHAZADA'
export type TipoDevolucion = 'PRODUCTO' | 'PIEZA'

export interface Devolucion {
  id: string
  folio: string
  tallerId: string
  tipo: TipoDevolucion
  ventaId?: string
  servicioId?: string
  productoId?: string
  piezaId?: string
  cantidad: number
  motivo: string
  estado: EstadoDevolucion
  revisadaPorId?: string
  fechaRevision?: string
  notasRevision?: string
  createdAt: string
}

export interface Movimiento {
  id: string
  tallerId: string
  tipo: TipoMovimiento
  concepto: string
  monto: number
  categoria?: string
  usuarioId: string
  ventaId?: string
  servicioId?: string
  compraId?: string
  fecha: string
  notas?: string
}

export interface Gasto {
  id: string
  tallerId: string
  concepto: string
  monto: number
  categoria: string
  fecha: string
  notas?: string
}

export interface CompraItem {
  id: string
  productoId?: string
  piezaId?: string
  cantidad: number
  costoUnitario: number
  subtotal: number
}

export interface Compra {
  id: string
  folio: string
  tallerId: string
  proveedor?: string
  items: CompraItem[]
  total: number
  fecha: string
  notas?: string
}

export type UrgenciaPedido = 'BAJA' | 'MEDIA' | 'ALTA'
export type EstadoPedido = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CONVERTIDO'

export interface PedidoInterno {
  id: string
  folio: string
  tallerId: string
  solicitanteId: string
  descripcion: string
  cantidad: number
  urgencia: UrgenciaPedido
  estado: EstadoPedido
  aprobadoPorId?: string
  fechaAprobacion?: string
  notas?: string
  createdAt: string
}

export type TipoComisionEntry = 'SALE' | 'SERVICE'
export type EstadoCommissionEntry = 'ACTIVE' | 'CANCELLED'

export interface CommissionEntry {
  id: string
  operarioId: string
  tallerId: string
  ventaId?: string
  servicioId?: string
  ventaItemProductoId?: string
  servicioItemPiezaId?: string
  amount: number
  type: TipoComisionEntry
  description: string
  estado: EstadoCommissionEntry
  operatorPaymentId?: string | null
  createdAt: string
}

export type EstadoOperatorPayment = 'PENDING' | 'PAID'

export interface OperatorPayment {
  id: string
  folio: string
  operarioId: string
  tallerId: string
  amount: number
  date: string
  paidAt?: string
  paidById?: string
  status: EstadoOperatorPayment
  commissionEntryIds: string[]
  createdAt: string
}

export interface ConfiguracionGlobal {
  moneda: string
  formatoTicket?: string
  datosFiscalesEmpresa?: string
  pais: string
  tipoCambio: number  // 1 USD = X CUP
  // Sincronización con servidor
  serverUrl?: string
  ultimoSync?: string  // ISO timestamp del último sync
  syncEnabled?: boolean
  syncInterval?: number  // minutos
  // Pago al administrador
  adminPaymentType?: 'PERCENTAGE' | 'FIXED' | null
  adminPaymentValue?: number | null
}

// ============ NIVELES DE ACCESO ============

export const NIVEL_ACCESO: Record<RolUsuario, number> = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  VENDEDOR: 4,
}

export const ROL_LABELS: Record<RolUsuario, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
}

export const ESPECIALIDAD_LABELS: Record<EspecialidadOperario, string> = {
  ELECTRONICA: 'Electrónica',
  INFORMATICA: 'Informática',
}

// ============ VISTAS DE NAVEGACIÓN ============

export type VistaApp =
  | 'dashboard'
  | 'talleres'
  | 'inventario-productos'
  | 'inventario-piezas'
  | 'servicios'
  | 'pos'
  | 'movimientos'
  | 'pedidos'
  | 'garantias'
  | 'clientes'
  | 'configuracion'
  | 'usuarios'
  | 'operarios'
  | 'comisiones'
  | 'devoluciones'
