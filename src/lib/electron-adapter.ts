// ============================================================
// Data Service — Adaptador fetch para Next.js API Routes
// ============================================================
// Reemplaza al antiguo useDataService (que llamaba a
// window.electronAPI). Ahora usa fetch('/api/...') contra las
// Next.js Route Handlers que persisten en SQLite via Prisma.
//
// Tras cada mutación exitosa, re-sincroniza Zustand desde la
// API via bootstrapFromBackend() para que la UI refleje el
// estado real de la base de datos.
// ============================================================

import { useStore } from './store';

// Helper: fetch con manejo de errores consistente
async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error || `Error ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data as T;
}

// Helper: POST simple
async function apiPost<T = any>(url: string, body?: any): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Helper: PUT simple
async function apiPut<T = any>(url: string, body?: any): Promise<T> {
  return apiFetch<T>(url, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Helper: DELETE simple
async function apiDelete<T = any>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' });
}

// Helper: ejecuta una mutación y luego re-sincroniza Zustand.
async function mutateAndSync<T>(mutator: () => Promise<T>): Promise<T> {
  const result = await mutator();
  await useStore.getState().bootstrapFromBackend();
  return result;
}

// Hook de compatibilidad (mantenemos el nombre por si quedan imports).
// Ahora simplemente devuelve el objeto con todos los métodos.
function useDataService() {
  return {
    // ============================================================
    // AUTH
    // ============================================================
    login: async (email: string, password: string) => {
      try {
        const user = await apiPost('/api/auth/login', { email, password });
        if (user) {
          useStore.getState().hydrateFromBackend({
            usuarioActual: user as any,
            tallerActualId: (user as any)?.tallerIds?.[0] || null,
            vistaActual: 'dashboard' as any,
          });
          await useStore.getState().bootstrapFromBackend();
        }
        return !!user;
      } catch (e) {
        console.error('[dataService] login error:', e);
        return false;
      }
    },
    logout: async () => {
      try { await apiPost('/api/auth/logout'); } catch {}
      useStore.getState().logout();
    },
    getUsuarioActual: () => useStore.getState().usuarioActual,
    setTallerActual: async (id: string) => {
      useStore.getState().setTallerActual(id);
      await useStore.getState().bootstrapFromBackend();
    },

    // ============================================================
    // TALLERES
    // ============================================================
    findAllTalleres: async () => apiFetch('/api/talleres'),
    findTallerById: async (id: string) => apiFetch(`/api/talleres/${id}`),
    saveTaller: async (data: any) =>
      mutateAndSync(() =>
        data.id ? apiPut(`/api/talleres/${data.id}`, data) : apiPost('/api/talleres', data)
      ),
    deleteTaller: async (id: string) =>
      mutateAndSync(() => apiDelete(`/api/talleres/${id}`)),
    updateTallerConfig: async (tallerId: string, data: any) =>
      mutateAndSync(() => apiPut(`/api/configuracion/taller/${tallerId}`, data)),

    // ============================================================
    // USUARIOS
    // ============================================================
    findAllUsuarios: async () => apiFetch('/api/usuarios'),
    findUsuarioById: async (id: string) => apiFetch(`/api/usuarios/${id}`),
    saveUsuario: async (data: any) =>
      mutateAndSync(() =>
        data.id ? apiPut(`/api/usuarios/${data.id}`, data) : apiPost('/api/usuarios', data)
      ),
    deleteUsuario: async (id: string) =>
      mutateAndSync(() => apiDelete(`/api/usuarios/${id}`)),

    // ============================================================
    // OPERARIOS
    // ============================================================
    findAllOperarios: async () => apiFetch('/api/operarios'),
    saveOperario: async (data: any) =>
      mutateAndSync(() =>
        data.id ? apiPut(`/api/operarios/${data.id}`, data) : apiPost('/api/operarios', data)
      ),
    deleteOperario: async (id: string) =>
      mutateAndSync(() => apiDelete(`/api/operarios/${id}`)),

    // ============================================================
    // CLIENTES
    // ============================================================
    findAllClientes: async () => apiFetch('/api/clientes'),
    findClienteById: async (id: string) => apiFetch(`/api/clientes/${id}`),
    findClienteGeneral: async () => apiFetch('/api/clientes/cliente-general'),
    saveCliente: async (data: any) =>
      mutateAndSync(() =>
        data.id ? apiPut(`/api/clientes/${data.id}`, data) : apiPost('/api/clientes', data)
      ),
    deleteCliente: async (id: string) =>
      mutateAndSync(() => apiDelete(`/api/clientes/${id}`)),
    migrarGarantiasCliente: async (deId: string, aId: string) =>
      mutateAndSync(() => apiPost('/api/clientes/migrar', { deId, aId })),

    // ============================================================
    // CATEGORÍAS
    // ============================================================
    findAllCategorias: async (tallerId?: string, tipo?: string) => {
      const params = new URLSearchParams();
      if (tallerId) params.set('tallerId', tallerId);
      if (tipo) params.set('tipo', tipo);
      const q = params.toString();
      return apiFetch(`/api/categorias${q ? '?' + q : ''}`);
    },
    saveCategoria: async (data: any) =>
      mutateAndSync(() =>
        data.id ? apiPut(`/api/categorias/${data.id}`, data) : apiPost('/api/categorias', data)
      ),
    toggleCategoria: async (id: string) =>
      mutateAndSync(() => apiPost(`/api/categorias/${id}/toggle`)),
    deleteCategoria: async (id: string) =>
      mutateAndSync(() => apiDelete(`/api/categorias/${id}`)),

    // ============================================================
    // PRODUCTOS
    // ============================================================
    findAllProductos: async (tallerId?: string) => {
      const q = tallerId ? `?tallerId=${tallerId}` : '';
      return apiFetch(`/api/productos${q}`);
    },
    findProductoById: async (id: string) => apiFetch(`/api/productos/${id}`),
    saveProducto: async (data: any) =>
      mutateAndSync(() =>
        data.id ? apiPut(`/api/productos/${data.id}`, data) : apiPost('/api/productos', data)
      ),
    deleteProducto: async (id: string) =>
      mutateAndSync(() => apiDelete(`/api/productos/${id}`)),
    ajustarStockProducto: async (id: string, delta: number) =>
      mutateAndSync(() => apiPost(`/api/productos/${id}/ajustar-stock`, { delta })),

    // ============================================================
    // PIEZAS
    // ============================================================
    findAllPiezas: async (tallerId?: string) => {
      const q = tallerId ? `?tallerId=${tallerId}` : '';
      return apiFetch(`/api/piezas${q}`);
    },
    findPiezaById: async (id: string) => apiFetch(`/api/piezas/${id}`),
    savePieza: async (data: any) =>
      mutateAndSync(() =>
        data.id ? apiPut(`/api/piezas/${data.id}`, data) : apiPost('/api/piezas', data)
      ),
    deletePieza: async (id: string) =>
      mutateAndSync(() => apiDelete(`/api/piezas/${id}`)),
    ajustarStockPieza: async (id: string, delta: number) =>
      mutateAndSync(() => apiPost(`/api/piezas/${id}/ajustar-stock`, { delta })),

    // ============================================================
    // VENTAS
    // ============================================================
    findAllVentas: async (tallerId?: string, fechaInicio?: string, fechaFin?: string) => {
      const params = new URLSearchParams();
      if (tallerId) params.set('tallerId', tallerId);
      if (fechaInicio) params.set('fechaInicio', fechaInicio);
      if (fechaFin) params.set('fechaFin', fechaFin);
      const q = params.toString();
      return apiFetch(`/api/ventas${q ? '?' + q : ''}`);
    },
    findVentaById: async (id: string) => apiFetch(`/api/ventas/${id}`),
    crearVenta: async (dto: any) =>
      mutateAndSync(() => apiPost('/api/ventas', dto)),
    anularVenta: async (id: string) =>
      mutateAndSync(() => apiPost(`/api/ventas/${id}/anular`)),

    // ============================================================
    // SERVICIOS
    // ============================================================
    findAllServicios: async (tallerId?: string) => {
      const q = tallerId ? `?tallerId=${tallerId}` : '';
      return apiFetch(`/api/servicios${q}`);
    },
    findServicioById: async (id: string) => apiFetch(`/api/servicios/${id}`),
    crearServicio: async (dto: any) =>
      mutateAndSync(() => apiPost('/api/servicios', dto)),
    updateServicio: async (id: string, data: any) =>
      mutateAndSync(() => apiPut(`/api/servicios/${id}`, data)),
    entregarServicio: async (id: string, garantiaDias: number, cobertura?: string) =>
      mutateAndSync(() => apiPost(`/api/servicios/${id}/entregar`, { garantiaDias, cobertura })),

    // ============================================================
    // MOVIMIENTOS
    // ============================================================
    findAllMovimientos: async (tallerId?: string, fechaInicio?: string, fechaFin?: string, tipo?: string) => {
      const params = new URLSearchParams();
      if (tallerId) params.set('tallerId', tallerId);
      if (fechaInicio) params.set('fechaInicio', fechaInicio);
      if (fechaFin) params.set('fechaFin', fechaFin);
      if (tipo) params.set('tipo', tipo);
      const q = params.toString();
      return apiFetch(`/api/movimientos${q ? '?' + q : ''}`);
    },
    getResumenDia: async (tallerId?: string) => {
      const q = tallerId ? `?tallerId=${tallerId}` : '';
      return apiFetch(`/api/movimientos/resumen-dia${q}`);
    },
    registrarGasto: async (dto: any) =>
      mutateAndSync(() => apiPost('/api/movimientos/gasto', dto)),
    registrarCompra: async (dto: any) =>
      mutateAndSync(() => apiPost('/api/movimientos/compra', dto)),

    // ============================================================
    // PEDIDOS
    // ============================================================
    findAllPedidos: async (tallerId?: string) => {
      const q = tallerId ? `?tallerId=${tallerId}` : '';
      return apiFetch(`/api/pedidos${q}`);
    },
    crearPedido: async (dto: any) =>
      mutateAndSync(() => apiPost('/api/pedidos', dto)),
    aprobarPedido: async (id: string, aprobar: boolean) =>
      mutateAndSync(() => apiPost(`/api/pedidos/${id}/aprobar`, { aprobar })),
    eliminarPedido: async (id: string) =>
      mutateAndSync(() => apiDelete(`/api/pedidos/${id}`)),
    convertirPedido: async (id: string) =>
      mutateAndSync(() => apiPost(`/api/pedidos/${id}/convertir`)),

    // ============================================================
    // DEVOLUCIONES
    // ============================================================
    findAllDevoluciones: async (tallerId?: string) => {
      const q = tallerId ? `?tallerId=${tallerId}` : '';
      return apiFetch(`/api/devoluciones${q}`);
    },
    crearDevolucion: async (dto: any) =>
      mutateAndSync(() => apiPost('/api/devoluciones', dto)),
    revisarDevolucion: async (id: string, estado: any, notas?: string) =>
      mutateAndSync(() => apiPost(`/api/devoluciones/${id}/revisar`, { estado, notas })),

    // ============================================================
    // COMISIONES Y PAGOS
    // ============================================================
    getPendientesByOperario: async (tallerId?: string) => {
      const q = tallerId ? `?tallerId=${tallerId}` : '';
      return apiFetch(`/api/comisiones/pendientes${q}`);
    },
    getMisComisiones: async (operarioId?: string, soloPendientes?: boolean) => {
      const q = soloPendientes ? '?soloPendientes=true' : '';
      return apiFetch(`/api/comisiones/mis-comisiones${q}`);
    },
    getMisPagos: async (operarioId: string) =>
      apiFetch('/api/comisiones/mis-pagos'),
    findAllPagos: async (tallerId?: string) => {
      const q = tallerId ? `?tallerId=${tallerId}` : '';
      return apiFetch(`/api/comisiones/pagos${q}`);
    },
    crearPagoOperador: async (dto: any) =>
      mutateAndSync(() => apiPost('/api/comisiones/pagos', dto)),
    confirmarPagoOperador: async (pagoId: string) =>
      mutateAndSync(() => apiPost(`/api/comisiones/pagos/${pagoId}/confirmar`)),
    cancelarPagoOperador: async (pagoId: string) =>
      mutateAndSync(() => apiPost(`/api/comisiones/pagos/${pagoId}/cancelar`)),

    // ============================================================
    // GARANTÍAS
    // ============================================================
    findAllGarantias: async (tallerId?: string) => {
      const q = tallerId ? `?tallerId=${tallerId}` : '';
      return apiFetch(`/api/garantias${q}`);
    },
    crearReclamacion: async (dto: any) =>
      mutateAndSync(() => apiPost('/api/garantias/reclamacion', dto)),
    reasignarGarantia: async (garantiaId: string, clienteId: string) =>
      mutateAndSync(() => apiPost(`/api/garantias/${garantiaId}/reasignar`, { clienteId })),

    // ============================================================
    // CONFIGURACIÓN
    // ============================================================
    getConfiguracion: async () => apiFetch('/api/configuracion'),
    updateConfiguracion: async (data: any) =>
      mutateAndSync(() => apiPut('/api/configuracion', data)),

    // ============================================================
    // DASHBOARD
    // ============================================================
    getDashboard: async () => apiFetch('/api/dashboard'),

    // ============================================================
    // SINCRONIZACIÓN (stubs — no hay sync server en modo local)
    // ============================================================
    detectarCambios: async () => ({ entidades: [], total: 0, detalles: {} }),
    exportarDatosLocales: async () => '',

    // ============================================================
    // VALIDACIONES
    // ============================================================
    validarCodigoBarras: async (codigo: string, excludeId?: string) => {
      const params = new URLSearchParams();
      params.set('codigo', codigo);
      if (excludeId) params.set('excludeId', excludeId);
      const r: any = await apiFetch(`/api/validar/codigo-barras?${params}`);
      return r?.exists || false;
    },
  };
}

// `isElectron` ya no es relevante en modo Next.js puro, pero lo
// dejamos como false para no romper imports existentes.
const isElectron = false;

export { isElectron, useDataService };
