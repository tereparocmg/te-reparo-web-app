import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Usuario, Taller, Cliente, Categoria, Producto, Pieza,
  Venta, OrdenServicio, Garantia, ReclamacionGarantia,
  Movimiento, Gasto, Compra, PedidoInterno, ConfiguracionGlobal,
  RolUsuario, VistaApp, EstadoOrden,
  CommissionEntry, OperatorPayment, TipoComision,
  Devolucion, EstadoDevolucion,
  Operario, EspecialidadOperario, Servicio, TipoServicio, EstadoServicio,
} from './types'
import { generateFolio, generateId, addDays, isToday } from './format'

// ============ ESTADO ============

interface AppState {
  // Sesión
  usuarioActual: Usuario | null
  tallerActualId: string | null
  vistaActual: VistaApp
  vistaMode: 'local' | 'admin'  // local = app normal; admin = multi-taller cloud
  setVistaMode: (mode: 'local' | 'admin') => void

  // Datos
  usuarios: Usuario[]
  talleres: Taller[]
  clientes: Cliente[]
  categorias: Categoria[]
  productos: Producto[]
  piezas: Pieza[]
  ventas: Venta[]
  servicios: Servicio[]
  garantias: Garantia[]
  reclamaciones: ReclamacionGarantia[]
  movimientos: Movimiento[]
  gastos: Gasto[]
  compras: Compra[]
  pedidos: PedidoInterno[]
  configuracion: ConfiguracionGlobal
  // Comisiones y pagos a operarios
  commissionEntries: CommissionEntry[]
  operatorPayments: OperatorPayment[]
  operarios: Operario[]
  // Operarios
  saveOperario: (o: Partial<Operario> & { id?: string }) => void
  deleteOperario: (id: string) => void

  // Devoluciones
  devoluciones: Devolucion[]

  // Acciones de sesión
  login: (email: string, password: string) => boolean
  loginAs: (rol: RolUsuario) => void
  logout: () => void
  setTallerActual: (id: string) => void
  setVista: (v: VistaApp) => void

  // Acciones CRUD
  saveTaller: (t: Partial<Taller> & { id?: string }) => void
  deleteTaller: (id: string) => void

  saveUsuario: (u: Partial<Usuario> & { id?: string }) => void
  deleteUsuario: (id: string) => void

  saveCliente: (c: Partial<Cliente> & { id?: string }) => void
  deleteCliente: (id: string) => void
  migrarGarantiasCliente: (deClienteId: string, aClienteId: string) => void

  saveCategoria: (c: Partial<Categoria> & { id?: string }) => void
  toggleCategoria: (id: string) => void
  deleteCategoria: (id: string) => void

  saveProducto: (p: Partial<Producto> & { id?: string }) => string | null
  deleteProducto: (id: string) => void
  ajustarStockProducto: (id: string, delta: number) => void

  savePieza: (p: Partial<Pieza> & { id?: string }) => string | null
  deletePieza: (id: string) => void
  ajustarStockPieza: (id: string, delta: number) => void

  crearVenta: (venta: Partial<Venta>) => string | null
  anularVenta: (id: string) => void

  crearServicio: (servicio: Partial<Servicio>) => string | null
  updateServicio: (id: string, datos: Partial<Servicio>) => void
  entregarServicio: (id: string, garantiaDias: number, cobertura?: string) => void

  crearReclamacion: (r: Partial<ReclamacionGarantia>) => void

  registrarGasto: (g: Partial<Gasto>) => void
  registrarCompra: (c: Partial<Compra>) => string | null

  crearPedido: (p: Partial<PedidoInterno>) => void
  aprobarPedido: (id: string, aprobar: boolean) => void
  eliminarPedido: (id: string) => void
  convertirPedido: (id: string) => void

  reasignarGarantia: (garantiaId: string, nuevoClienteId: string) => void

  updateConfiguracion: (c: Partial<ConfiguracionGlobal>) => void
  updateTallerConfig: (tallerId: string, datos: Partial<Taller>) => void

  // Comisiones y pagos a operarios
  crearPagoOperador: (operarioId: string, tallerId: string, commissionEntryIds: string[], notas?: string) => string | null
  confirmarPagoOperador: (pagoId: string) => void
  cancelarPagoOperador: (pagoId: string) => void
  getComisionesPendientesByOperario: (operarioId: string) => CommissionEntry[]
  getComisionesPagadasByOperario: (operarioId: string) => CommissionEntry[]

  // Operarios
  saveOperario: (o: Partial<Operario> & { id?: string }) => void
  deleteOperario: (id: string) => void

  // Devoluciones
  crearDevolucion: (d: Partial<Devolucion>) => void
  revisarDevolucion: (id: string, estado: EstadoDevolucion, notas?: string) => void

  // Validaciones
  validarCodigoBarras: (codigo: string, excludeId?: string) => boolean

  // Sincronización con servidor
  detectarCambios: () => { entidades: string[]; total: number; detalles: Record<string, number> }
  sincronizarDatos: () => Promise<{ exito: boolean; mensaje: string; cambios: number }>
  exportarDatosLocales: () => string

  // Reset (para desarrollo)
  resetData: () => void

  // Sincronización con backend (Next.js API + Prisma)
  hydrateFromBackend: (data: Partial<AppState>) => void
  bootstrapFromBackend: () => Promise<void>
  bootstrapFromElectron: () => Promise<void> // alias retro-compat
}

// ============ DATOS SEMILLA ============

const TALLER_1: Taller = {
  id: 'taller-1',
  nombre: 'Te Reparo Centro',
  direccion: 'Av. Insurgentes Sur 1234, CDMX',
  telefono: '55 1234 5678',
  encargado: 'Carlos Mendoza',
  activo: true,
  rfc: 'TER190101AB1',
  razonSocial: 'Te Reparo Centro S.A. de C.V.',
  ciudad: 'Ciudad de México',
  codigoPostal: '03100',
  limiteDescuento: 15,
  horarioApertura: '09:00',
  horarioCierre: '19:00',
  metodosPago: 'Efectivo,Tarjeta,Transferencia',
  garantiaProductoDias: 30,
  garantiaServicioDias: 90,
  plantillaGarantia: 'Esta garantía cubre defectos de fabricación e instalación por el período indicado. No cubre daños por mal uso, caídas, líquidos o modificaciones no autorizadas.',
}

const TALLER_2: Taller = {
  id: 'taller-2',
  nombre: 'Te Reparo Norte',
  direccion: 'Av. Universidad 456, Monterrey, NL',
  telefono: '81 8765 4321',
  encargado: 'María Fernández',
  activo: true,
  rfc: 'TER190202CD2',
  razonSocial: 'Te Reparo Norte S.A. de C.V.',
  ciudad: 'Monterrey',
  codigoPostal: '64000',
  limiteDescuento: 10,
  horarioApertura: '10:00',
  horarioCierre: '20:00',
  metodosPago: 'Efectivo,Tarjeta',
  garantiaProductoDias: 30,
  garantiaServicioDias: 60,
}

const CLIENTE_GENERAL: Cliente = {
  id: 'cliente-general',
  nombre: 'Cliente General',
  telefono: '',
  email: '',
  tipo: 'PERSONA_NATURAL',
  esClienteGeneral: true,
  createdAt: new Date().toISOString(),
}

const CLIENTES_SEMILLA: Cliente[] = [
  CLIENTE_GENERAL,
  {
    id: 'cli-1',
    nombre: 'Juan Pérez García',
    telefono: '55 1111 2222',
    email: 'juan.perez@gmail.com',
    tipo: 'PERSONA_NATURAL',
    esClienteGeneral: false,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'cli-2',
    nombre: 'Ana Martínez López',
    telefono: '55 3333 4444',
    email: 'ana.martinez@outlook.com',
    tipo: 'PERSONA_NATURAL',
    esClienteGeneral: false,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'cli-3',
    nombre: 'Distribuidora Tecnológica S.A.',
    telefono: '55 5555 6666',
    email: 'compras@distribuidoratec.mx',
    tipo: 'EMPRESA',
    rfc: 'DTI950101AAA',
    direccion: 'Av. Reforma 100, CDMX',
    esClienteGeneral: false,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'cli-4',
    nombre: 'Roberto Hernández',
    telefono: '55 7777 8888',
    tipo: 'PERSONA_NATURAL',
    esClienteGeneral: false,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
]

const USUARIOS_SEMILLA: Usuario[] = [
  {
    id: 'u-super',
    email: 'superadmin@tereparo.mx',
    password: 'admin123',
    nombre: 'Super Administrador',
    rol: 'SUPER_ADMIN',
    activo: true,
    telefono: '55 0000 0001',
    tallerIds: ['taller-1', 'taller-2'],
  },
  {
    id: 'u-admin-1',
    email: 'admin.centro@tereparo.mx',
    password: 'admin123',
    nombre: 'Carlos Mendoza',
    rol: 'ADMIN',
    activo: true,
    telefono: '55 0000 0002',
    tallerIds: ['taller-1'],
  },
  {
    id: 'u-admin-2',
    email: 'admin.norte@tereparo.mx',
    password: 'admin123',
    nombre: 'María Fernández',
    rol: 'ADMIN',
    activo: true,
    telefono: '81 0000 0003',
    tallerIds: ['taller-2'],
  },
  {
    id: 'u-vend-1',
    email: 'vendedor@tereparo.mx',
    password: 'vendedor123',
    nombre: 'Laura Sánchez',
    rol: 'VENDEDOR',
    activo: true,
    telefono: '55 0000 0004',
    tallerIds: ['taller-1'],
  },
]

const CATEGORIAS_SEMILLA: Categoria[] = [
  { id: 'cat-p-1', nombre: 'Teléfonos', tipo: 'PRODUCTO', activa: true, tallerId: 'taller-1' },
  { id: 'cat-p-2', nombre: 'Accesorios', tipo: 'PRODUCTO', activa: true, tallerId: 'taller-1' },
  { id: 'cat-p-3', nombre: 'Cargadores', tipo: 'PRODUCTO', activa: true, tallerId: 'taller-1' },
  { id: 'cat-r-1', nombre: 'Pantallas', tipo: 'PIEZA', activa: true, tallerId: 'taller-1' },
  { id: 'cat-r-2', nombre: 'Baterías', tipo: 'PIEZA', activa: true, tallerId: 'taller-1' },
  { id: 'cat-r-3', nombre: 'Puertos de carga', tipo: 'PIEZA', activa: true, tallerId: 'taller-1' },
  { id: 'cat-r-4', nombre: 'Conectores', tipo: 'PIEZA', activa: true, tallerId: 'taller-1' },
  { id: 'cat2-p-1', nombre: 'Teléfonos', tipo: 'PRODUCTO', activa: true, tallerId: 'taller-2' },
  { id: 'cat2-r-1', nombre: 'Pantallas', tipo: 'PIEZA', activa: true, tallerId: 'taller-2' },
]

const PRODUCTOS_SEMILLA: Producto[] = [
  {
    id: 'prod-1', sku: 'TEL-IP13-128', codigoBarras: '7501234560011',
    nombre: 'iPhone 13 128GB', descripcion: 'Apple iPhone 13 128GB Negro',
    precioCosto: 14000, precioVenta: 17999, stock: 8, stockMinimo: 3,
    garantiaDias: 30, categoriaId: 'cat-p-1', tallerId: 'taller-1', activo: true,
    operatorCommissionType: 'PERCENTAGE', operatorCommissionValue: 1.5,
    tags: ['Apple', 'iPhone', 'Teléfono'],
  },
  {
    id: 'prod-2', sku: 'TEL-SAM-A54', codigoBarras: '7501234560028',
    nombre: 'Samsung Galaxy A54', descripcion: 'Samsung Galaxy A54 5G 128GB',
    precioCosto: 6500, precioVenta: 8999, stock: 12, stockMinimo: 4,
    garantiaDias: 30, categoriaId: 'cat-p-1', tallerId: 'taller-1', activo: true,
    operatorCommissionType: 'PERCENTAGE', operatorCommissionValue: 2,
    tags: ['Samsung', 'Galaxy', 'Teléfono'],
  },
  {
    id: 'prod-3', sku: 'ACC-FUND-IP13', codigoBarras: '7501234560035',
    nombre: 'Funda iPhone 13', descripcion: 'Funda silicona iPhone 13',
    precioCosto: 80, precioVenta: 249, stock: 45, stockMinimo: 10,
    garantiaDias: 0, categoriaId: 'cat-p-2', tallerId: 'taller-1', activo: true,
    operatorCommissionType: 'FIXED', operatorCommissionValue: 15,
    tags: ['Apple', 'iPhone', 'Accesorio', 'Funda'],
  },
  {
    id: 'prod-4', sku: 'ACC-VID-TMPL', codigoBarras: '7501234560042',
    nombre: 'Vidrio Templado Universal', descripcion: 'Protector de pantalla',
    precioCosto: 25, precioVenta: 99, stock: 80, stockMinimo: 20,
    garantiaDias: 0, categoriaId: 'cat-p-2', tallerId: 'taller-1', activo: true,
    operatorCommissionType: 'FIXED', operatorCommissionValue: 10,
    tags: ['Accesorio', 'Vidrio'],
  },
  {
    id: 'prod-5', sku: 'CARG-USB-C-20W', codigoBarras: '7501234560059',
    nombre: 'Cargador USB-C 20W', descripcion: 'Cargador rápido USB-C 20W',
    precioCosto: 120, precioVenta: 349, stock: 25, stockMinimo: 8,
    garantiaDias: 30, categoriaId: 'cat-p-3', tallerId: 'taller-1', activo: true,
    operatorCommissionType: 'FIXED', operatorCommissionValue: 20,
    tags: ['Accesorio', 'Cargador', 'USB-C'],
  },
  {
    id: 'prod-6', sku: 'ACC-AUD-BT', codigoBarras: '7501234560066',
    nombre: 'Audífonos Bluetooth', descripcion: 'Audífonos inalámbricos',
    precioCosto: 280, precioVenta: 599, stock: 2, stockMinimo: 5,
    garantiaDias: 30, categoriaId: 'cat-p-2', tallerId: 'taller-1', activo: true,
    operatorCommissionType: null, operatorCommissionValue: null,
    tags: ['Accesorio', 'Audífonos'],
  },
]

const PIEZAS_SEMILLA: Pieza[] = [
  {
    id: 'pz-1', sku: 'PNT-IP13-OLED', codigoBarras: '7509876540011',
    nombre: 'Pantalla OLED iPhone 13', descripcion: 'Pantalla OLED original',
    costoUnitario: 3500, precioVenta: 4500, stock: 5, stockMinimo: 2,
    garantiaFabricaDias: 90, categoriaId: 'cat-r-1', tallerId: 'taller-1', activo: true,
    operatorPaymentType: 'FIXED', operatorPaymentValue: 500,
    tags: ['Apple', 'iPhone', 'Pantalla'],
  },
  {
    id: 'pz-2', sku: 'PNT-SAM-A54', codigoBarras: '7509876540028',
    nombre: 'Pantalla Samsung A54', descripcion: 'Pantalla LCD Samsung A54',
    costoUnitario: 1200, precioVenta: 1800, stock: 3, stockMinimo: 2,
    garantiaFabricaDias: 90, categoriaId: 'cat-r-1', tallerId: 'taller-1', activo: true,
    operatorPaymentType: 'FIXED', operatorPaymentValue: 200,
    tags: ['Samsung', 'Galaxy', 'Pantalla'],
  },
  {
    id: 'pz-3', sku: 'BAT-IP13', codigoBarras: '7509876540035',
    nombre: 'Batería iPhone 13', descripcion: 'Batería original 3240mAh',
    costoUnitario: 450, precioVenta: 800, stock: 8, stockMinimo: 3,
    garantiaFabricaDias: 60, categoriaId: 'cat-r-2', tallerId: 'taller-1', activo: true,
    operatorPaymentType: 'PERCENTAGE', operatorPaymentValue: 15,
    tags: ['Apple', 'iPhone', 'Batería'],
  },
  {
    id: 'pz-4', sku: 'PRT-IP13-CG', codigoBarras: '7509876540042',
    nombre: 'Puerto de Carga iPhone 13', descripcion: 'Flex puerto de carga',
    costoUnitario: 320, precioVenta: 600, stock: 1, stockMinimo: 3,
    garantiaFabricaDias: 30, categoriaId: 'cat-r-3', tallerId: 'taller-1', activo: true,
    operatorPaymentType: 'FIXED', operatorPaymentValue: 100,
    tags: ['Apple', 'iPhone', 'Puerto'],
  },
  {
    id: 'pz-5', sku: 'BAT-SAM-A54', codigoBarras: '7509876540059',
    nombre: 'Batería Samsung A54', descripcion: 'Batería 5000mAh',
    costoUnitario: 380, precioVenta: 700, stock: 0, stockMinimo: 2,
    garantiaFabricaDias: 60, categoriaId: 'cat-r-2', tallerId: 'taller-1', activo: true,
    operatorPaymentType: 'PERCENTAGE', operatorPaymentValue: 15,
    tags: ['Samsung', 'Galaxy', 'Batería'],
  },
]

const fechaHoy = (offsetHoras = 0) => {
  const d = new Date()
  d.setHours(d.getHours() - offsetHoras)
  return d.toISOString()
}

const VENTAS_SEMILLA: Venta[] = [
  {
    id: 'ven-1', folio: 'V-001A2B', tallerId: 'taller-1', clienteId: 'cli-1', vendedorId: 'u-vend-1',
    items: [
      { id: 'vi-1', productoId: 'prod-1', cantidad: 1, precioUnitario: 17999, subtotal: 17999 },
      { id: 'vi-2', productoId: 'prod-3', cantidad: 1, precioUnitario: 249, subtotal: 249 },
    ],
    subtotal: 18248, total: 18248,
    metodoPago: 'Tarjeta', estado: 'COMPLETADA',
    createdAt: fechaHoy(2),
  },
  {
    id: 'ven-2', folio: 'V-002B3C', tallerId: 'taller-1', clienteId: 'cliente-general', vendedorId: 'u-vend-1',
    items: [
      { id: 'vi-3', productoId: 'prod-5', cantidad: 2, precioUnitario: 349, subtotal: 698 },
    ],
    subtotal: 698, total: 698,
    metodoPago: 'Efectivo', estado: 'COMPLETADA',
    createdAt: fechaHoy(4),
  },
  {
    id: 'ven-3', folio: 'V-003C4D', tallerId: 'taller-1', clienteId: 'cli-2', vendedorId: 'u-vend-1',
    items: [
      { id: 'vi-4', productoId: 'prod-2', cantidad: 1, precioUnitario: 8999, subtotal: 8999 },
      { id: 'vi-5', productoId: 'prod-4', cantidad: 1, precioUnitario: 99, subtotal: 99 },
    ],
    subtotal: 9098, total: 9098,
    metodoPago: 'Transferencia', estado: 'COMPLETADA',
    createdAt: fechaHoy(6),
  },
]

const _OLD_ORDENES_SEMILLA: any[] = [
  {
    id: 'ord-1', folio: 'OS-001X1', tallerId: 'taller-1', clienteId: 'cli-1', tecnicoId: 'u-elec-1',
    marca: 'Apple', modelo: 'iPhone 13', imei: '353256789012345',
    problemaReportado: 'Pantalla rota tras caída',
    diagnostico: 'Cambio de pantalla OLED requerido',
    estado: 'EN_PROCESO',
    lineas: [
      { id: 'ol-1', descripcion: 'Cambio de pantalla OLED', precioManoObra: 800, personalizada: false },
    ],
    piezasUtilizadas: [
      { id: 'op-1', piezaId: 'pz-1', cantidad: 1, costoUnitario: 3500, subtotal: 3500 },
    ],
    subtotalManoObra: 800, subtotalPiezas: 3500, total: 4300,
    metodoPago: 'Efectivo', pagado: false,
    createdAt: fechaHoy(5),
  },
  {
    id: 'ord-2', folio: 'OS-002Y2', tallerId: 'taller-1', clienteId: 'cli-2', tecnicoId: 'u-info-1',
    marca: 'Samsung', modelo: 'Galaxy A54', imei: '353987654321098',
    problemaReportado: 'Olvido de cuenta Google (FRP)',
    diagnostico: 'Desbloqueo FRP requerido',
    estado: 'ENTREGADO',
    lineas: [
      { id: 'ol-2', descripcion: 'Desbloqueo FRP', precioManoObra: 600, personalizada: true },
    ],
    piezasUtilizadas: [],
    subtotalManoObra: 600, subtotalPiezas: 0, total: 600,
    metodoPago: 'Tarjeta', pagado: true,
    fechaEntrega: fechaHoy(1),
    createdAt: fechaHoy(26),
  },
  {
    id: 'ord-3', folio: 'OS-003Z3', tallerId: 'taller-1', clienteId: 'cli-4', tecnicoId: 'u-elec-1',
    marca: 'Apple', modelo: 'iPhone 12', imei: '353111222333444',
    problemaReportado: 'No carga el equipo',
    diagnostico: 'Reemplazo de puerto de carga',
    estado: 'PENDIENTE',
    lineas: [],
    piezasUtilizadas: [],
    subtotalManoObra: 0, subtotalPiezas: 0, total: 0,
    metodoPago: 'Efectivo', pagado: false,
    createdAt: fechaHoy(1),
  },
]

const GARANTIAS_SEMILLA: Garantia[] = [
  {
    id: 'gar-1', folio: 'G-001P1', tallerId: 'taller-1', clienteId: 'cli-2',
    ordenId: 'ord-2', tipo: 'SERVICIO',
    fechaInicio: fechaHoy(1), duracionDias: 90,
    fechaVencimiento: addDays(fechaHoy(1), 90).toISOString(),
    descripcionCobertura: 'Garantía por servicio de desbloqueo FRP. Cubre reaparición del bloqueo dentro del período.',
    estado: 'ACTIVA', emitidaPorId: 'u-info-1',
    createdAt: fechaHoy(1),
  },
  {
    id: 'gar-2', folio: 'G-002P2', tallerId: 'taller-1', clienteId: 'cli-1',
    ventaId: 'ven-1', tipo: 'PRODUCTO',
    fechaInicio: fechaHoy(2), duracionDias: 30,
    fechaVencimiento: addDays(fechaHoy(2), 30).toISOString(),
    descripcionCobertura: 'Garantía de producto por defectos de fabricación.',
    estado: 'ACTIVA', emitidaPorId: 'u-vend-1',
    createdAt: fechaHoy(2),
  },
]

const MOVIMIENTOS_SEMILLA: Movimiento[] = [
  { id: 'mov-1', tallerId: 'taller-1', tipo: 'INGRESO', concepto: 'Venta V-001A2B', monto: 18248, categoria: 'Venta de productos', usuarioId: 'u-vend-1', ventaId: 'ven-1', fecha: fechaHoy(2) },
  { id: 'mov-2', tallerId: 'taller-1', tipo: 'INGRESO', concepto: 'Venta V-002B3C', monto: 698, categoria: 'Venta de productos', usuarioId: 'u-vend-1', ventaId: 'ven-2', fecha: fechaHoy(4) },
  { id: 'mov-3', tallerId: 'taller-1', tipo: 'INGRESO', concepto: 'Venta V-003C4D', monto: 8598, categoria: 'Venta de productos', usuarioId: 'u-vend-1', ventaId: 'ven-3', fecha: fechaHoy(6) },
  { id: 'mov-4', tallerId: 'taller-1', tipo: 'GASTO', concepto: 'Renta del local', monto: 8000, categoria: 'Renta', usuarioId: 'u-admin-1', fecha: fechaHoy(8) },
  { id: 'mov-5', tallerId: 'taller-1', tipo: 'GASTO', concepto: 'Papelería', monto: 350, categoria: 'Papelería', usuarioId: 'u-admin-1', fecha: fechaHoy(3) },
  { id: 'mov-6', tallerId: 'taller-1', tipo: 'COMPRA', concepto: 'Compra de inventario C-001', monto: 5000, categoria: 'Inventario', usuarioId: 'u-admin-1', fecha: fechaHoy(24) },
]

const GASTOS_SEMILLA: Gasto[] = [
  { id: 'gst-1', tallerId: 'taller-1', concepto: 'Renta del local', monto: 8000, categoria: 'Renta', fecha: fechaHoy(8) },
  { id: 'gst-2', tallerId: 'taller-1', concepto: 'Papelería', monto: 350, categoria: 'Papelería', fecha: fechaHoy(3) },
]

const COMPRAS_SEMILLA: Compra[] = [
  {
    id: 'cmp-1', folio: 'C-001', tallerId: 'taller-1', proveedor: 'Mayorista Tech SA',
    items: [
      { id: 'ci-1', productoId: 'prod-3', cantidad: 20, costoUnitario: 80, subtotal: 1600 },
      { id: 'ci-2', productoId: 'prod-4', cantidad: 50, costoUnitario: 25, subtotal: 1250 },
    ],
    total: 2850, fecha: fechaHoy(24),
  },
]

const PEDIDOS_SEMILLA: PedidoInterno[] = [
  {
    id: 'ped-1', folio: 'P-001', tallerId: 'taller-1', solicitanteId: 'u-elec-1',
    descripcion: '5x Pantalla Samsung A54 (urgente, sin stock)',
    cantidad: 5, urgencia: 'ALTA', estado: 'PENDIENTE',
    createdAt: fechaHoy(2),
  },
  {
    id: 'ped-2', folio: 'P-002', tallerId: 'taller-1', solicitanteId: 'u-info-1',
    descripcion: 'Licencias Windows 11 Pro x10',
    cantidad: 10, urgencia: 'MEDIA', estado: 'PENDIENTE',
    createdAt: fechaHoy(1),
  },
]


const OPERARIOS_SEMILLA: Operario[] = [
  { id: 'op-1', nombre: 'Diego Ramírez', telefono: '55 0000 0005', especialidad: 'INFORMATICA', activo: true, createdAt: new Date().toISOString() },
  { id: 'op-2', nombre: 'Sofía Castro', telefono: '55 0000 0006', especialidad: 'ELECTRONICA', activo: true, createdAt: new Date().toISOString() },
  { id: 'op-3', nombre: 'Miguel Torres', telefono: '55 0000 0007', especialidad: 'ELECTRONICA', activo: true, createdAt: new Date().toISOString() },
  { id: 'op-4', nombre: 'Ana Vargas', telefono: '55 0000 0008', especialidad: 'INFORMATICA', activo: true, createdAt: new Date().toISOString() },
]

const CONFIG_SEMILLA: ConfiguracionGlobal = {
  moneda: 'USD',
  formatoTicket: 'A4',
  datosFiscalesEmpresa: 'Te Reparo Manager — Cuba',
  pais: 'Cuba',
  tipoCambio: 650,
  serverUrl: '',
  ultimoSync: null,
  syncEnabled: false,
  syncInterval: 5,
  adminPaymentType: null,
  adminPaymentValue: null,
}

// Comisiones semilla: calculadas a partir de las ventas y órdenes existentes
// Venta ven-1 (vendedor u-vend-1): iPhone 13 (1.5% de 17999 = 269.99) + Funda (FIXED 15)
// Venta ven-2 (vendedor u-vend-1): 2x Cargador (FIXED 20 * 2 = 40)
// Venta ven-3 (vendedor u-vend-1): Samsung A54 (2% de 8999 = 179.98) + Vidrio (FIXED 10)
// Orden ord-2 (info u-info-1): Desbloqueo FRP (FIXED 100) — entregada, genera comisión
const COMMISSION_ENTRIES_SEMILLA: CommissionEntry[] = [
  {
    id: 'ce-1', operarioId: 'u-vend-1', tallerId: 'taller-1',
    ventaId: 'ven-1', ventaItemProductoId: 'prod-1',
    amount: 269.99, type: 'SALE', description: 'Comisión 1.5% — iPhone 13 128GB (V-001A2B)',
    estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(2),
  },
  {
    id: 'ce-2', operarioId: 'u-vend-1', tallerId: 'taller-1',
    ventaId: 'ven-1', ventaItemProductoId: 'prod-3',
    amount: 15, type: 'SALE', description: 'Comisión fija — Funda iPhone 13 (V-001A2B)',
    estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(2),
  },
  {
    id: 'ce-3', operarioId: 'u-vend-1', tallerId: 'taller-1',
    ventaId: 'ven-2', ventaItemProductoId: 'prod-5',
    amount: 40, type: 'SALE', description: 'Comisión fija x2 — Cargador USB-C 20W (V-002B3C)',
    estado: 'ACTIVE', operatorPaymentId: 'op-1', createdAt: fechaHoy(4),
  },
  {
    id: 'ce-4', operarioId: 'u-vend-1', tallerId: 'taller-1',
    ventaId: 'ven-3', ventaItemProductoId: 'prod-2',
    amount: 169.85, type: 'SALE', description: 'Comisión 2% (proporcional) — Samsung Galaxy A54 (V-003C4D)',
    estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(6),
  },
  {
    id: 'ce-5', operarioId: 'u-vend-1', tallerId: 'taller-1',
    ventaId: 'ven-3', ventaItemProductoId: 'prod-4',
    amount: 9.45, type: 'SALE', description: 'Comisión fija (proporcional) — Vidrio Templado (V-003C4D)',
    estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(6),
  },
  {
    id: 'ce-6', operarioId: 'u-info-1', tallerId: 'taller-1',
    ordenId: 'ord-2', ordenLineaId: 'ol-2',
    amount: 100, type: 'SERVICE', description: 'Comisión fija — Desbloqueo FRP (OS-002Y2)',
    estado: 'ACTIVE', operatorPaymentId: null, createdAt: fechaHoy(1),
  },
]

const OPERATOR_PAYMENTS_SEMILLA: OperatorPayment[] = [
  {
    id: 'op-1', folio: 'OP-001', operarioId: 'u-vend-1', tallerId: 'taller-1',
    amount: 40, date: fechaHoy(4), paidAt: fechaHoy(3), paidById: 'u-admin-1',
    status: 'PAID', commissionEntryIds: ['ce-3'], notas: 'Pago diario — venta en mostrador',
    createdAt: fechaHoy(4),
  },
]

// ============ STORE ============

export const initialState = {
  usuarioActual: null as Usuario | null,
  tallerActualId: null as string | null,
  vistaActual: 'dashboard' as VistaApp,
  vistaMode: 'local' as 'local' | 'admin',
  usuarios: USUARIOS_SEMILLA,
  talleres: [TALLER_1, TALLER_2],
  clientes: CLIENTES_SEMILLA,
  categorias: CATEGORIAS_SEMILLA,
  productos: PRODUCTOS_SEMILLA,
  piezas: PIEZAS_SEMILLA,
  ventas: VENTAS_SEMILLA,
  servicios: [] as Servicio[],
  garantias: GARANTIAS_SEMILLA,
  reclamaciones: [] as ReclamacionGarantia[],
  movimientos: MOVIMIENTOS_SEMILLA,
  gastos: GASTOS_SEMILLA,
  compras: COMPRAS_SEMILLA,
  pedidos: PEDIDOS_SEMILLA,
  configuracion: CONFIG_SEMILLA,
  commissionEntries: COMMISSION_ENTRIES_SEMILLA,
  operatorPayments: OPERATOR_PAYMENTS_SEMILLA,
  operarios: OPERARIOS_SEMILLA,
  devoluciones: [] as Devolucion[],
}

// Función auxiliar para aplicar cambios recibidos del servidor
function aplicarCambiosServidor(get: any, set: any, cambios: any[]) {
  const state = get()
  for (const cambio of cambios) {
    const { tabla, registro_id, accion, datos } = cambio
    if (accion === 'DELETE') continue // Por seguridad, no eliminamos automáticamente
    const entidadMap: Record<string, string> = {
      products: 'productos',
      pieces: 'piezas',
      sales: 'ventas',
      services: 'servicios',
      clients: 'clientes',
      operarios: 'operarios',
      categories: 'categorias',
      warranties: 'garantias',
      movements: 'movimientos',
      orders: 'pedidos',
      devoluciones: 'devoluciones',
      config: 'configuracion',
    }
    const entidadLocal = entidadMap[tabla] || tabla
    const arr = (state as any)[entidadLocal] as any[] | undefined
    if (arr && Array.isArray(arr)) {
      const idx = arr.findIndex((item: any) => item.id === registro_id)
      if (idx >= 0 && accion === 'UPDATE') {
        const actualizado = [...arr]
        actualizado[idx] = { ...actualizado[idx], ...datos }
        set({ [entidadLocal]: actualizado })
      } else if (idx < 0 && (accion === 'INSERT' || accion === 'UPDATE')) {
        set({ [entidadLocal]: [datos, ...arr] })
      }
    }
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ===== Sesión =====
      login: (email, password) => {
        const usuario = get().usuarios.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.activo
        )
        if (usuario) {
          set({
            usuarioActual: usuario,
            tallerActualId: usuario.tallerIds[0] || null,
            vistaActual: 'dashboard',
          })
          return true
        }
        return false
      },

      loginAs: (rol) => {
        const usuario = get().usuarios.find((u) => u.rol === rol && u.activo)
        if (usuario) {
          set({
            usuarioActual: usuario,
            tallerActualId: usuario.tallerIds[0] || null,
            vistaActual: 'dashboard',
          })
        }
      },

      logout: () => set({ usuarioActual: null, vistaActual: 'dashboard' }),

      setTallerActual: (id) => set({ tallerActualId: id }),
      setVista: (v) => set({ vistaActual: v }),
      setVistaMode: (mode) => set({ vistaMode: mode }),

      // ===== Talleres =====
      saveTaller: (t) => {
        const talleres = [...get().talleres]
        if (t.id) {
          const idx = talleres.findIndex((x) => x.id === t.id)
          if (idx >= 0) talleres[idx] = { ...talleres[idx], ...t } as Taller
        } else {
          talleres.push({
            id: generateId(),
            nombre: t.nombre || 'Nuevo Taller',
            direccion: t.direccion || '',
            telefono: t.telefono || '',
            encargado: t.encargado,
            activo: true,
            limiteDescuento: t.limiteDescuento ?? 10,
            metodosPago: t.metodosPago || 'Efectivo,Tarjeta',
            garantiaProductoDias: t.garantiaProductoDias ?? 30,
            garantiaServicioDias: t.garantiaServicioDias ?? 90,
          } as Taller)
        }
        set({ talleres })
      },

      deleteTaller: (id) => {
        set({
          talleres: get().talleres.map((t) => (t.id === id ? { ...t, activo: false } : t)),
        })
      },

      // ===== Usuarios =====
      saveUsuario: (u) => {
        const usuarios = [...get().usuarios]
        if (u.id) {
          const idx = usuarios.findIndex((x) => x.id === u.id)
          if (idx >= 0) usuarios[idx] = { ...usuarios[idx], ...u } as Usuario
        } else {
          usuarios.push({
            id: generateId(),
            email: u.email || '',
            password: u.password || 'admin123',
            nombre: u.nombre || '',
            rol: u.rol || 'VENDEDOR',
            activo: true,
            telefono: u.telefono,
            tallerIds: u.tallerIds || [],
          } as Usuario)
        }
        set({ usuarios })
      },

      deleteUsuario: (id) => {
        set({
          usuarios: get().usuarios.map((u) => (u.id === id ? { ...u, activo: false } : u)),
        })
      },

      // ===== Clientes =====
      saveCliente: (c) => {
        const clientes = [...get().clientes]
        if (c.id) {
          const idx = clientes.findIndex((x) => x.id === c.id)
          if (idx >= 0) {
            // No permitir cambiar esClienteGeneral
            clientes[idx] = { ...clientes[idx], ...c, esClienteGeneral: clientes[idx].esClienteGeneral } as Cliente
          }
        } else {
          clientes.push({
            id: generateId(),
            nombre: c.nombre || '',
            telefono: c.telefono,
            email: c.email,
            tipo: c.tipo || 'PERSONA_NATURAL',
            rfc: c.rfc,
            direccion: c.direccion,
            esClienteGeneral: false,
            createdAt: new Date().toISOString(),
          } as Cliente)
        }
        set({ clientes })
      },

      deleteCliente: (id) => {
        const cli = get().clientes.find((x) => x.id === id)
        if (!cli || cli.esClienteGeneral) return
        set({
          clientes: get().clientes.filter((x) => x.id !== id),
        })
      },

      migrarGarantiasCliente: (deClienteId, aClienteId) => {
        set({
          garantias: get().garantias.map((g) =>
            g.clienteId === deClienteId ? { ...g, clienteId: aClienteId } : g
          ),
        })
      },

      // ===== Categorías =====
      saveCategoria: (c) => {
        const categorias = [...get().categorias]
        if (c.id) {
          const idx = categorias.findIndex((x) => x.id === c.id)
          if (idx >= 0) categorias[idx] = { ...categorias[idx], ...c } as Categoria
        } else {
          categorias.push({
            id: generateId(),
            nombre: c.nombre || '',
            tipo: c.tipo || 'PRODUCTO',
            activa: true,
            tallerId: c.tallerId || get().tallerActualId || '',
          } as Categoria)
        }
        set({ categorias })
      },

      toggleCategoria: (id) => {
        set({
          categorias: get().categorias.map((c) =>
            c.id === id ? { ...c, activa: !c.activa } : c
          ),
        })
      },

      deleteCategoria: (id) => {
        set({
          categorias: get().categorias.filter((c) => c.id !== id),
        })
      },

      // ===== Productos =====
      saveProducto: (p) => {
        // Validar unicidad de código de barras
        if (p.codigoBarras) {
          const existe = get().validarCodigoBarras(p.codigoBarras, p.id)
          if (!existe) return null
        }
        const productos = [...get().productos]
        if (p.id) {
          const idx = productos.findIndex((x) => x.id === p.id)
          if (idx >= 0) productos[idx] = { ...productos[idx], ...p } as Producto
        } else {
          const nuevo: Producto = {
            id: generateId(),
            sku: p.sku || '',
            codigoBarras: p.codigoBarras || '',
            nombre: p.nombre || '',
            descripcion: p.descripcion,
            precioCosto: p.precioCosto || 0,
            precioVenta: p.precioVenta || 0,
            stock: p.stock || 0,
            stockMinimo: p.stockMinimo ?? 5,
            garantiaDias: p.garantiaDias ?? 30,
            categoriaId: p.categoriaId,
            tallerId: p.tallerId || get().tallerActualId || '',
            activo: true,
            operatorCommissionType: p.operatorCommissionType ?? null,
            operatorCommissionValue: p.operatorCommissionValue ?? null,
            tags: p.tags ?? [],
          }
          productos.push(nuevo)
        }
        set({ productos })
        return p.id || productos[productos.length - 1].id
      },

      deleteProducto: (id) => {
        set({
          productos: get().productos.map((p) => (p.id === id ? { ...p, activo: false } : p)),
        })
      },

      ajustarStockProducto: (id, delta) => {
        set({
          productos: get().productos.map((p) =>
            p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
          ),
        })
      },

      // ===== Piezas =====
      savePieza: (p) => {
        if (p.codigoBarras) {
          const existe = get().validarCodigoBarras(p.codigoBarras, p.id)
          if (!existe) return null
        }
        const piezas = [...get().piezas]
        if (p.id) {
          const idx = piezas.findIndex((x) => x.id === p.id)
          if (idx >= 0) piezas[idx] = { ...piezas[idx], ...p } as Pieza
        } else {
          const nueva: Pieza = {
            id: generateId(),
            sku: p.sku || '',
            codigoBarras: p.codigoBarras || '',
            nombre: p.nombre || '',
            descripcion: p.descripcion,
            costoUnitario: p.costoUnitario || 0,
            stock: p.stock || 0,
            stockMinimo: p.stockMinimo ?? 5,
            garantiaFabricaDias: p.garantiaFabricaDias,
            categoriaId: p.categoriaId,
            tallerId: p.tallerId || get().tallerActualId || '',
            activo: true,
            precioVenta: p.precioVenta ?? 0,
            operatorPaymentType: p.operatorPaymentType ?? null,
            operatorPaymentValue: p.operatorPaymentValue ?? null,
            tags: p.tags ?? [],
          }
          piezas.push(nueva)
        }
        set({ piezas })
        return p.id || piezas[piezas.length - 1].id
      },

      deletePieza: (id) => {
        set({
          piezas: get().piezas.map((p) => (p.id === id ? { ...p, activo: false } : p)),
        })
      },

      ajustarStockPieza: (id, delta) => {
        set({
          piezas: get().piezas.map((p) =>
            p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
          ),
        })
      },

      // ===== Ventas =====
      crearVenta: (venta) => {
        const state = get()
        const taller = state.talleres.find((t) => t.id === (venta.tallerId || state.tallerActualId))
        if (!taller || !state.usuarioActual) return null

        const tallerId = taller.id
        const items = venta.items || []
        const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
        const total = subtotal

        // Descontar stock
        const productos = state.productos.map((p) => {
          const item = items.find((i) => i.productoId === p.id)
          if (item) return { ...p, stock: p.stock - item.cantidad }
          return p
        })

        const ventaId = generateId()
        const folio = generateFolio('V')

        const nuevaVenta: Venta = {
          id: ventaId,
          folio,
          tallerId,
          clienteId: venta.clienteId || 'cliente-general',
          vendedorId: state.usuarioActual.id,
          items,
          subtotal,
          total,
          metodoPago: venta.metodoPago || 'Efectivo',
          estado: 'COMPLETADA',
          notas: venta.notas,
          createdAt: new Date().toISOString(),
        }

        // Crear garantía automática si el producto tiene garantía
        const nuevasGarantias: Garantia[] = []
        for (const item of items) {
          const prod = state.productos.find((p) => p.id === item.productoId)
          if (prod && prod.garantiaDias > 0) {
            nuevasGarantias.push({
              id: generateId(),
              folio: generateFolio('G'),
              tallerId,
              clienteId: nuevaVenta.clienteId,
              ventaId,
              tipo: 'PRODUCTO',
              fechaInicio: nuevaVenta.createdAt,
              duracionDias: prod.garantiaDias,
              fechaVencimiento: addDays(nuevaVenta.createdAt, prod.garantiaDias).toISOString(),
              descripcionCobertura: `Garantía de producto: ${prod.nombre}`,
              estado: 'ACTIVA',
              emitidaPorId: state.usuarioActual.id,
              createdAt: nuevaVenta.createdAt,
            })
          }
        }

        // Crear comisiones para el operario (vendedor) por cada producto con comisión configurada
        const nuevasComisiones: CommissionEntry[] = []
        const operarioId = state.usuarioActual.id
        for (const item of items) {
          const prod = state.productos.find((p) => p.id === item.productoId)
          if (!prod || !prod.operatorCommissionType || prod.operatorCommissionValue == null) continue
          let montoComision = 0
          if (prod.operatorCommissionType === 'PERCENTAGE') {
            montoComision = item.subtotal * (prod.operatorCommissionValue / 100)
          } else if (prod.operatorCommissionType === 'FIXED') {
            montoComision = prod.operatorCommissionValue * item.cantidad
          }
          montoComision = Math.round(montoComision * 100) / 100
          if (montoComision > 0) {
            nuevasComisiones.push({
              id: generateId(),
              operarioId,
              tallerId,
              ventaId,
              ventaItemProductoId: prod.id,
              amount: montoComision,
              type: 'SALE',
              description: `Comisión ${prod.operatorCommissionType === 'PERCENTAGE' ? `${prod.operatorCommissionValue}%` : `fija $${prod.operatorCommissionValue}`} — ${prod.nombre} (${folio})`,
              estado: 'ACTIVE',
              operatorPaymentId: null,
              createdAt: nuevaVenta.createdAt,
            })
          }
        }

        // Crear movimiento de ingreso
        const nuevoMovimiento: Movimiento = {
          id: generateId(),
          tallerId,
          tipo: 'INGRESO',
          concepto: `Venta ${folio}`,
          monto: total,
          categoria: 'Venta de productos',
          usuarioId: state.usuarioActual.id,
          ventaId,
          fecha: nuevaVenta.createdAt,
        }

        set({
          productos,
          ventas: [nuevaVenta, ...state.ventas],
          garantias: [...nuevasGarantias, ...state.garantias],
          movimientos: [nuevoMovimiento, ...state.movimientos],
          commissionEntries: [...nuevasComisiones, ...state.commissionEntries],
        })

        return ventaId
      },

      anularVenta: (id) => {
        const state = get()
        const venta = state.ventas.find((v) => v.id === id)
        if (!venta || venta.estado === 'ANULADA') return

        // Revertir stock
        const productos = state.productos.map((p) => {
          const item = venta.items.find((i) => i.productoId === p.id)
          if (item) return { ...p, stock: p.stock + item.cantidad }
          return p
        })

        // Invalidar garantías
        const garantias = state.garantias.map((g) =>
          g.ventaId === id ? { ...g, estado: 'INVALIDADA' as const } : g
        )

        // Cancelar comisiones asociadas a la venta (si no han sido pagadas)
        const commissionEntries = state.commissionEntries.map((ce) =>
          ce.ventaId === id && ce.estado === 'ACTIVE' && !ce.operatorPaymentId
            ? { ...ce, estado: 'CANCELLED' as const, description: `[ANULADA] ${ce.description}` }
            : ce
        )

        set({
          ventas: state.ventas.map((v) => (v.id === id ? { ...v, estado: 'ANULADA' as const } : v)),
          productos,
          garantias,
          movimientos: state.movimientos.filter((m) => m.ventaId !== id),
          commissionEntries,
        })
      },

      // ===== Servicios =====
      crearServicio: (servicio) => {
        const state = get()
        const taller = state.talleres.find((t) => t.id === (servicio.tallerId || state.tallerActualId))
        if (!taller || !state.usuarioActual) return null

        const tallerId = taller.id
        const piezasUtilizadas = servicio.piezasUtilizadas || []
        const precioManoObra = servicio.precioManoObra || 0
        const subtotalPiezas = piezasUtilizadas.reduce((s, p) => s + p.subtotal, 0)
        const total = precioManoObra + subtotalPiezas

        const servicioId = generateId()
        const folio = generateFolio('SRV')

        const nuevoServicio: Servicio = {
          id: servicioId,
          folio,
          tallerId,
          clienteId: servicio.clienteId || 'cliente-general',
          operarioId: servicio.operarioId || '',
          tipo: servicio.tipo || 'ELECTRONICA',
          marca: servicio.marca || '',
          modelo: servicio.modelo || '',
          imei: servicio.imei,
          problemaReportado: servicio.problemaReportado || '',
          diagnostico: servicio.diagnostico,
          descripcionServicio: servicio.descripcionServicio || '',
          estado: servicio.estado || 'PENDIENTE',
          piezasUtilizadas,
          precioManoObra,
          subtotalPiezas,
          total,
          metodoPago: servicio.metodoPago || 'Efectivo',
          pagado: servicio.pagado || false,
          notas: servicio.notas,
          garantiaDias: servicio.garantiaDias ?? 90,
          createdAt: new Date().toISOString(),
        }

        // Descontar stock de piezas utilizadas
        const piezas = state.piezas.map((p) => {
          const item = piezasUtilizadas.find((i) => i.piezaId === p.id)
          if (item) return { ...p, stock: Math.max(0, p.stock - item.cantidad) }
          return p
        })

        set({
          servicios: [nuevoServicio, ...state.servicios],
          piezas,
        })

        return servicioId
      },

      updateServicio: (id, datos) => {
        const state = get()
        const servicios = state.servicios.map((s) => {
          if (s.id !== id) return s
          const actualizado = { ...s, ...datos }
          actualizado.subtotalPiezas = actualizado.piezasUtilizadas.reduce((acc, p) => acc + p.subtotal, 0)
          actualizado.total = actualizado.precioManoObra + actualizado.subtotalPiezas
          return actualizado
        })
        set({ servicios })
      },

      entregarServicio: (id, garantiaDias, cobertura) => {
        const state = get()
        const servicio = state.servicios.find((s) => s.id === id)
        if (!servicio || !state.usuarioActual) return

        const fechaEntrega = new Date().toISOString()
        const servicioActualizado = {
          ...servicio,
          estado: 'ENTREGADO' as EstadoServicio,
          fechaEntrega,
          pagado: true,
        }

        // Crear garantía de servicio
        const nuevaGarantia: Garantia = {
          id: generateId(),
          folio: generateFolio('G'),
          tallerId: servicio.tallerId,
          clienteId: servicio.clienteId,
          servicioId: id,
          tipo: 'SERVICIO',
          fechaInicio: fechaEntrega,
          duracionDias: garantiaDias,
          fechaVencimiento: addDays(fechaEntrega, garantiaDias).toISOString(),
          descripcionCobertura: cobertura || 'Garantía por servicio de reparación.',
          estado: 'ACTIVA',
          emitidaPorId: state.usuarioActual.id,
          createdAt: fechaEntrega,
        }

        // Crear comisiones (pago al operario) por cada pieza con pago configurado
        const nuevasComisiones: CommissionEntry[] = []
        for (const itemPieza of servicio.piezasUtilizadas) {
          const pieza = state.piezas.find((p) => p.id === itemPieza.piezaId)
          if (!pieza || !pieza.operatorPaymentType || pieza.operatorPaymentValue == null) continue
          let montoPago = 0
          if (pieza.operatorPaymentType === 'PERCENTAGE') {
            montoPago = itemPieza.subtotal * (pieza.operatorPaymentValue / 100)
          } else if (pieza.operatorPaymentType === 'FIXED') {
            montoPago = pieza.operatorPaymentValue * itemPieza.cantidad
          }
          montoPago = Math.round(montoPago * 100) / 100
          if (montoPago > 0) {
            nuevasComisiones.push({
              id: generateId(),
              operarioId: servicio.operarioId,
              tallerId: servicio.tallerId,
              servicioId: id,
              amount: montoPago,
              type: 'SERVICE',
              description: `Pago operario ${pieza.operatorPaymentType === 'PERCENTAGE' ? `${pieza.operatorPaymentValue}%` : `fija $${pieza.operatorPaymentValue}`} — ${pieza.nombre} (${servicio.folio})`,
              estado: 'ACTIVE',
              operatorPaymentId: null,
              createdAt: fechaEntrega,
            })
          }
        }

        // Crear movimiento de ingreso
        const nuevoMovimiento: Movimiento = {
          id: generateId(),
          tallerId: servicio.tallerId,
          tipo: 'INGRESO',
          concepto: `Servicio ${servicio.folio}`,
          monto: servicio.total,
          categoria: 'Servicio de reparación',
          usuarioId: state.usuarioActual.id,
          servicioId: id,
          fecha: fechaEntrega,
        }

        set({
          servicios: state.servicios.map((s) => (s.id === id ? servicioActualizado : s)),
          garantias: [nuevaGarantia, ...state.garantias],
          movimientos: [nuevoMovimiento, ...state.movimientos],
          commissionEntries: [...nuevasComisiones, ...state.commissionEntries],
        })
      },

            // ===== Gastos =====
      registrarGasto: (g) => {
        const state = get()
        if (!state.usuarioActual || !state.tallerActualId) return
        const fecha = g.fecha || new Date().toISOString()
        const nuevoGasto: Gasto = {
          id: generateId(),
          tallerId: state.tallerActualId,
          concepto: g.concepto || '',
          monto: g.monto || 0,
          categoria: g.categoria || 'Otros',
          fecha,
          notas: g.notas,
        }
        const nuevoMovimiento: Movimiento = {
          id: generateId(),
          tallerId: state.tallerActualId,
          tipo: 'GASTO',
          concepto: nuevoGasto.concepto,
          monto: nuevoGasto.monto,
          categoria: nuevoGasto.categoria,
          usuarioId: state.usuarioActual.id,
          fecha,
        }
        set({
          gastos: [nuevoGasto, ...state.gastos],
          movimientos: [nuevoMovimiento, ...state.movimientos],
        })
      },

      // ===== Compras =====
      registrarCompra: (c) => {
        const state = get()
        if (!state.usuarioActual || !state.tallerActualId) return null

        const tallerId = state.tallerActualId
        const items = c.items || []
        const total = items.reduce((s, i) => s + i.subtotal, 0)
        const fecha = c.fecha || new Date().toISOString()
        const compraId = generateId()
        const folio = generateFolio('C')

        const nuevaCompra: Compra = {
          id: compraId,
          folio,
          tallerId,
          proveedor: c.proveedor,
          items,
          total,
          fecha,
          notas: c.notas,
        }

        // Incrementar stock
        const productos = state.productos.map((p) => {
          const item = items.find((i) => i.productoId === p.id)
          if (item) {
            return { ...p, stock: p.stock + item.cantidad, precioCosto: item.costoUnitario }
          }
          return p
        })
        const piezas = state.piezas.map((p) => {
          const item = items.find((i) => i.piezaId === p.id)
          if (item) {
            return { ...p, stock: p.stock + item.cantidad, costoUnitario: item.costoUnitario }
          }
          return p
        })

        const nuevoMovimiento: Movimiento = {
          id: generateId(),
          tallerId,
          tipo: 'COMPRA',
          concepto: `Compra ${folio}`,
          monto: total,
          categoria: 'Inventario',
          usuarioId: state.usuarioActual.id,
          compraId,
          fecha,
        }

        set({
          compras: [nuevaCompra, ...state.compras],
          productos,
          piezas,
          movimientos: [nuevoMovimiento, ...state.movimientos],
        })

        return compraId
      },

      // ===== Pedidos =====
      crearPedido: (p) => {
        const state = get()
        if (!state.usuarioActual || !state.tallerActualId) return
        const nuevo: PedidoInterno = {
          id: generateId(),
          folio: generateFolio('P'),
          tallerId: state.tallerActualId,
          solicitanteId: state.usuarioActual.id,
          descripcion: p.descripcion || '',
          cantidad: p.cantidad || 1,
          urgencia: p.urgencia || 'MEDIA',
          estado: 'PENDIENTE',
          createdAt: new Date().toISOString(),
        }
        set({ pedidos: [nuevo, ...state.pedidos] })
      },

      aprobarPedido: (id, aprobar) => {
        const state = get()
        if (!state.usuarioActual) return
        set({
          pedidos: state.pedidos.map((p) =>
            p.id === id
              ? {
                  ...p,
                  estado: aprobar ? 'APROBADO' : 'RECHAZADO',
                  aprobadoPorId: state.usuarioActual!.id,
                  fechaAprobacion: new Date().toISOString(),
                }
              : p
          ),
        })
      },

      eliminarPedido: (id) => {
        const state = get()
        if (!state.usuarioActual) return
        const pedido = state.pedidos.find((p) => p.id === id)
        if (!pedido || pedido.estado !== 'PENDIENTE') return
        if (pedido.solicitanteId !== state.usuarioActual.id && state.usuarioActual.rol !== 'SUPER_ADMIN') return
        set({ pedidos: state.pedidos.filter((p) => p.id !== id) })
      },

      convertirPedido: (id) => {
        set({
          pedidos: get().pedidos.map((p) =>
            p.id === id ? { ...p, estado: 'CONVERTIDO' as const } : p
          ),
        })
      },

      reasignarGarantia: (garantiaId, nuevoClienteId) => {
        set({
          garantias: get().garantias.map((g) =>
            g.id === garantiaId ? { ...g, clienteId: nuevoClienteId } : g
          ),
        })
      },

      updateConfiguracion: (c) => {
        set({ configuracion: { ...get().configuracion, ...c } })
      },

      updateTallerConfig: (tallerId, datos) => {
        set({
          talleres: get().talleres.map((t) =>
            t.id === tallerId ? { ...t, ...datos } : t
          ),
        })
      },

      // ===== Comisiones y pagos a operarios =====
      crearPagoOperador: (operarioId, tallerId, commissionEntryIds, notas) => {
        const state = get()
        if (!state.usuarioActual) return null
        // Validar que las entradas estén activas y no pagadas
        const entradas = state.commissionEntries.filter(
          (ce) => commissionEntryIds.includes(ce.id) && ce.estado === 'ACTIVE' && !ce.operatorPaymentId
        )
        if (entradas.length === 0) return null

        const amount = entradas.reduce((s, ce) => s + ce.amount, 0)
        const pagoId = generateId()
        const folio = generateFolio('OP')
        const ahora = new Date().toISOString()

        const nuevoPago: OperatorPayment = {
          id: pagoId,
          folio,
          operarioId,
          tallerId,
          amount: Math.round(amount * 100) / 100,
          date: ahora,
          paidAt: null,
          paidById: null,
          status: 'PENDING',
          commissionEntryIds: entradas.map((e) => e.id),
          notas,
          createdAt: ahora,
        }

        // Vincular las entradas al pago
        const commissionEntries = state.commissionEntries.map((ce) =>
          entradas.some((e) => e.id === ce.id) ? { ...ce, operatorPaymentId: pagoId } : ce
        )

        set({
          operatorPayments: [nuevoPago, ...state.operatorPayments],
          commissionEntries,
        })

        return pagoId
      },

      confirmarPagoOperador: (pagoId) => {
        const state = get()
        if (!state.usuarioActual) return
        const ahora = new Date().toISOString()
        set({
          operatorPayments: state.operatorPayments.map((op) =>
            op.id === pagoId
              ? { ...op, status: 'PAID' as const, paidAt: ahora, paidById: state.usuarioActual!.id }
              : op
          ),
        })
      },

      cancelarPagoOperador: (pagoId) => {
        const state = get()
        const pago = state.operatorPayments.find((op) => op.id === pagoId)
        if (!pago) return
        // Solo se puede cancelar si está pendiente
        if (pago.status === 'PAID') return
        // Desvincular las comisiones del pago (vuelven a estar disponibles)
        const commissionEntries = state.commissionEntries.map((ce) =>
          ce.operatorPaymentId === pagoId ? { ...ce, operatorPaymentId: null } : ce
        )
        set({
          operatorPayments: state.operatorPayments.filter((op) => op.id !== pagoId),
          commissionEntries,
        })
      },

      getComisionesPendientesByOperario: (operarioId) => {
        return get().commissionEntries.filter(
          (ce) => ce.operarioId === operarioId && ce.estado === 'ACTIVE' && !ce.operatorPaymentId
        )
      },

      getComisionesPagadasByOperario: (operarioId) => {
        return get().commissionEntries.filter(
          (ce) => ce.operarioId === operarioId && ce.estado === 'ACTIVE' && !!ce.operatorPaymentId
        )
      },

      // ===== Operarios =====
      saveOperario: (o) => {
        const operarios = [...get().operarios]
        if (o.id) {
          const idx = operarios.findIndex((x) => x.id === o.id)
          if (idx >= 0) operarios[idx] = { ...operarios[idx], ...o } as Operario
        } else {
          operarios.push({
            id: generateId(),
            nombre: o.nombre || '',
            telefono: o.telefono,
            especialidad: o.especialidad || 'ELECTRONICA',
            activo: true,
            createdAt: new Date().toISOString(),
          } as Operario)
        }
        set({ operarios })
      },

      deleteOperario: (id) => {
        set({ operarios: get().operarios.map((o) => (o.id === id ? { ...o, activo: false } : o)) })
      },

      // ===== Devoluciones =====
      crearDevolucion: (d) => {
        const state = get()
        if (!state.usuarioActual) return
        const nueva: Devolucion = {
          id: generateId(),
          folio: generateFolio('DEV'),
          tallerId: d.tallerId || state.tallerActualId || '',
          tipo: d.tipo || 'PRODUCTO',
          ventaId: d.ventaId,
          ordenId: d.ordenId,
          productoId: d.productoId,
          piezaId: d.piezaId,
          cantidad: d.cantidad || 1,
          motivo: d.motivo || '',
          estado: 'PENDIENTE_REVISION',
          createdAt: new Date().toISOString(),
        }
        set({ devoluciones: [nueva, ...state.devoluciones] })
      },

      revisarDevolucion: (id, estado, notas) => {
        const state = get()
        if (!state.usuarioActual) return
        const devolucion = state.devoluciones.find((d) => d.id === id)
        if (!devolucion || devolucion.estado !== 'PENDIENTE_REVISION') return

        // Si se aprueba, devolver al inventario
        if (estado === 'APROBADA') {
          if (devolucion.tipo === 'PRODUCTO' && devolucion.productoId) {
            const productos = state.productos.map((p) =>
              p.id === devolucion.productoId ? { ...p, stock: p.stock + devolucion.cantidad } : p
            )
            set({ productos })
          } else if (devolucion.tipo === 'PIEZA' && devolucion.piezaId) {
            const piezas = state.piezas.map((p) =>
              p.id === devolucion.piezaId ? { ...p, stock: p.stock + devolucion.cantidad } : p
            )
            set({ piezas })
          }
        }

        set({
          devoluciones: state.devoluciones.map((d) =>
            d.id === id
              ? {
                  ...d,
                  estado,
                  revisadaPorId: state.usuarioActual!.id,
                  fechaRevision: new Date().toISOString(),
                  notasRevision: notas,
                }
              : d
          ),
        })
      },

      validarCodigoBarras: (codigo, excludeId) => {
        const state = get()
        const enProductos = state.productos.some(
          (p) => p.codigoBarras === codigo && p.id !== excludeId
        )
        const enPiezas = state.piezas.some(
          (p) => p.codigoBarras === codigo && p.id !== excludeId
        )
        // true = disponible (no existe), false = ya existe
        return !enProductos && !enPiezas
      },

      // ===== Sincronización con servidor =====
      detectarCambios: () => {
        const state = get()
        const entidades = ['productos', 'piezas', 'ventas', 'servicios', 'clientes', 'operarios', 'talleres', 'usuarios', 'categorias', 'garantias', 'movimientos', 'pedidos', 'devoluciones', 'commissionEntries', 'operatorPayments', 'compras', 'gastos']
        const detalles: Record<string, number> = {}
        let total = 0

        for (const entidad of entidades) {
          const datos = (state as any)[entidad] as any[] | undefined
          if (datos && Array.isArray(datos)) {
            detalles[entidad] = datos.length
            total += datos.length
          } else {
            detalles[entidad] = 0
          }
        }

        return { entidades, total, detalles }
      },

      sincronizarDatos: async () => {
        const state = get()
        const serverUrl = state.configuracion.serverUrl

        if (!serverUrl) {
          return {
            exito: false,
            mensaje: 'No se ha configurado la URL del servidor. Vaya a Configuración e ingrese la URL de la API.',
            cambios: 0,
          }
        }

        try {
          // Recopilar todos los datos locales
          const datosLocales = state.exportarDatosLocales()
          const datos = JSON.parse(datosLocales)

          // Enviar datos al servidor
          const response = await fetch(`${serverUrl}/sync/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(localStorage.getItem('token') && {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              }),
            },
            body: datosLocales,
          })

          if (!response.ok) {
            throw new Error(`Servidor respondió ${response.status}`)
          }

          const resultado = await response.json()

          // Solicitar cambios del servidor
          const syncResponse = await fetch(
            `${serverUrl}/sync/changes?since=${state.configuracion.ultimoSync || '1970-01-01T00:00:00Z'}`,
            {
              headers: {
                ...(localStorage.getItem('token') && {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }),
              },
            }
          )

          if (syncResponse.ok) {
            const cambiosServidor = await syncResponse.json()
            // Aplicar cambios recibidos del servidor
            if (cambiosServidor.changes && cambiosServidor.changes.length > 0) {
              aplicarCambiosServidor(get, set, cambiosServidor.changes)
            }
          }

          // Actualizar fecha de último sync
          get().updateConfiguracion({
            ultimoSync: new Date().toISOString(),
          })

          return {
            exito: true,
            mensaje: `Sincronización exitosa. ${resultado.confirmados || 0} cambios confirmados.`,
            cambios: resultado.confirmados || 0,
          }
        } catch (error: any) {
          return {
            exito: false,
            mensaje: `Error de sincronización: ${error.message || 'No se pudo conectar al servidor'}`,
            cambios: 0,
          }
        }
      },

      exportarDatosLocales: () => {
        const state = get()
        const datos = {
          timestamp: new Date().toISOString(),
          taller: state.talleres,
          productos: state.productos,
          piezas: state.piezas,
          ventas: state.ventas,
          servicios: state.servicios,
          clientes: state.clientes,
          operarios: state.operarios,
          categorias: state.categorias,
          garantias: state.garantias,
          movimientos: state.movimientos,
          pedidos: state.pedidos,
          devoluciones: state.devoluciones,
          commissionEntries: state.commissionEntries,
          operatorPayments: state.operatorPayments,
          compras: state.compras,
          gastos: state.gastos,
          configuracion: state.configuracion,
        }
        return JSON.stringify(datos)
      },

      resetData: () => set({ ...initialState, usuarioActual: null }),

      // ===== Sincronización con backend (Next.js API routes + Prisma) =====
      hydrateFromBackend: (data) => set(data),

      bootstrapFromBackend: async () => {
        if (typeof window === 'undefined') return

        try {
          const state = get()
          const usuario = state.usuarioActual
          const esSuperAdmin = usuario?.rol === 'SUPER_ADMIN'
          // SUPER_ADMIN ve todo; otros roles solo su taller
          const tallerId = esSuperAdmin ? undefined : (state.tallerActualId || undefined)

          // Helper: fetch JSON con manejo de errores (falla silencioso individual)
          const safeGet = async (url: string) => {
            try {
              const res = await fetch(url)
              if (!res.ok) return []
              return await res.json()
            } catch { return [] }
          }
          const safeGetObj = async (url: string) => {
            try {
              const res = await fetch(url)
              if (!res.ok) return null
              return await res.json()
            } catch { return null }
          }

          const talleresQ = safeGet('/api/talleres')
          const usuariosQ = safeGet('/api/usuarios')
          const operariosQ = safeGet('/api/operarios')
          const clientesQ = safeGet('/api/clientes')
          const productosQ = safeGet(`/api/productos${tallerId ? '?tallerId=' + tallerId : ''}`)
          const piezasQ = safeGet(`/api/piezas${tallerId ? '?tallerId=' + tallerId : ''}`)
          const ventasQ = safeGet(`/api/ventas${tallerId ? '?tallerId=' + tallerId : ''}`)
          const serviciosQ = safeGet(`/api/servicios${tallerId ? '?tallerId=' + tallerId : ''}`)
          const garantiasQ = safeGet(`/api/garantias${tallerId ? '?tallerId=' + tallerId : ''}`)
          const movimientosQ = safeGet(`/api/movimientos${tallerId ? '?tallerId=' + tallerId : ''}`)
          const pedidosQ = safeGet(`/api/pedidos${tallerId ? '?tallerId=' + tallerId : ''}`)
          const devolucionesQ = safeGet(`/api/devoluciones${tallerId ? '?tallerId=' + tallerId : ''}`)
          const categoriasProdQ = safeGet(`/api/categorias${tallerId ? '?tallerId=' + tallerId + '&tipo=PRODUCTO' : '?tipo=PRODUCTO'}`)
          const categoriasPiezQ = safeGet(`/api/categorias${tallerId ? '?tallerId=' + tallerId + '&tipo=PIEZA' : '?tipo=PIEZA'}`)
          const configQ = safeGetObj('/api/configuracion')

          const [
            talleres, usuarios, operarios, clientes,
            productos, piezas, ventas, servicios, garantias,
            movimientos, pedidos, devoluciones,
            categoriasProd, categoriasPiez, config,
          ] = await Promise.all([
            talleresQ, usuariosQ, operariosQ, clientesQ,
            productosQ, piezasQ, ventasQ, serviciosQ, garantiasQ,
            movimientosQ, pedidosQ, devolucionesQ,
            categoriasProdQ, categoriasPiezQ, configQ,
          ])

          // Prisma devuelve DateTime como Date; el frontend espera ISO strings.
          const normalizeDates = (obj: any): any => {
            if (obj === null || obj === undefined) return obj
            if (obj instanceof Date) return obj.toISOString()
            if (Array.isArray(obj)) return obj.map(normalizeDates)
            if (typeof obj === 'object') {
              const out: any = {}
              for (const k in obj) out[k] = normalizeDates(obj[k])
              return out
            }
            return obj
          }

          set({
            talleres: normalizeDates(talleres || []),
            usuarios: normalizeDates(usuarios || []),
            operarios: normalizeDates(operarios || []),
            clientes: normalizeDates(clientes || []),
            productos: normalizeDates(productos || []),
            piezas: normalizeDates(piezas || []),
            ventas: normalizeDates(ventas || []),
            servicios: normalizeDates(servicios || []),
            garantias: normalizeDates(garantias || []),
            movimientos: normalizeDates(movimientos || []),
            pedidos: normalizeDates(pedidos || []),
            devoluciones: normalizeDates(devoluciones || []),
            categorias: normalizeDates([
              ...(categoriasProd || []),
              ...(categoriasPiez || []),
            ]),
            configuracion: config
              ? { ...state.configuracion, ...normalizeDates(config) }
              : state.configuracion,
          })

          console.log('[Store] Datos cargados desde backend (Next.js API + SQLite)')
        } catch (e) {
          console.error('[Store] Error en bootstrapFromBackend:', e)
        }
      },

      // Alias para retro-compatibilidad con código que use el nombre antiguo
      bootstrapFromElectron: async function() {
        return await (this as any).bootstrapFromBackend()
      },
    }),
    {
      name: 'te-reparo-manager-storage',
      partialize: (state) => ({
        usuarioActual: state.usuarioActual,
        tallerActualId: state.tallerActualId,
        vistaActual: state.vistaActual,
      }),
    }
  )
)
