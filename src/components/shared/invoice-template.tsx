'use client'

import { useStore } from '@/lib/store'
import { formatMXN, formatDate } from '@/lib/format'
import { Card } from '@/components/ui/card'

interface InvoiceTemplateProps {
  ventaId?: string
  ordenId?: string
}

export function InvoiceTemplate({ ventaId, ordenId }: InvoiceTemplateProps) {
  const store = useStore()
  const venta = store.ventas.find((v) => v.id === ventaId)
  // Nota: en la arquitectura actual, `ordenes` fue reemplazado por `servicios`
  // (ver src/lib/types.ts). Mantenemos el fallback defensivo para que la vista
  // POS (que solo pasa ventaId) no crashee, y para no romper la vista
  // ordenes-servicio.tsx mientras se termina de migrar a `servicios`.
  const orden = (store.ordenes || store.servicios || []).find(
    (o: any) => o.id === ordenId
  )
  const taller = store.talleres.find(
    (t) => t.id === (venta?.tallerId || orden?.tallerId)
  )
  const cliente = store.clientes.find(
    (c) => c.id === (venta?.clienteId || orden?.clienteId)
  )
  const garantia = store.garantias.find(
    (g) => g.ventaId === ventaId || g.ordenId === ordenId
  )

  if (!taller) return null

  const titulo = venta ? 'TICKET DE VENTA' : 'FACTURA DE SERVICIO'
  const folio = venta?.folio || orden?.folio || ''
  const fecha = venta?.createdAt || orden?.createdAt || new Date().toISOString()

  return (
    <Card className="print-area p-8 max-w-4xl mx-auto bg-white text-black shadow-none border">
      {/* Encabezado */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#E63946' }}>
            Te Reparo
          </h1>
          <p className="text-sm font-semibold">{taller.nombre}</p>
          <p className="text-xs text-gray-600 mt-1">{taller.direccion}</p>
          <p className="text-xs text-gray-600">Tel: {taller.telefono}</p>
          {taller.rfc && <p className="text-xs text-gray-600">RFC: {taller.rfc}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">{titulo}</h2>
          <p className="text-sm font-semibold mt-1">Folio: {folio}</p>
          <p className="text-xs text-gray-600">Fecha: {formatDate(fecha, true)}</p>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">Cliente</h3>
          <p className="font-semibold">{cliente?.nombre || 'Cliente General'}</p>
          {cliente?.telefono && <p className="text-sm text-gray-600">Tel: {cliente.telefono}</p>}
          {cliente?.email && <p className="text-sm text-gray-600">Email: {cliente.email}</p>}
          {cliente?.rfc && <p className="text-sm text-gray-600">RFC: {cliente.rfc}</p>}
        </div>
        {orden && (
          <div>
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">Dispositivo</h3>
            <p className="font-semibold">{orden.marca} {orden.modelo}</p>
            {orden.imei && <p className="text-sm text-gray-600">IMEI/Serie: {orden.imei}</p>}
            <p className="text-sm text-gray-600">Estado: {orden.estado}</p>
          </div>
        )}
      </div>

      {/* Detalle */}
      {venta && (
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2 border-black" style={{ backgroundColor: '#1A1A1A', color: 'white' }}>
              <th className="text-left py-2 px-3">Cant.</th>
              <th className="text-left py-2 px-3">Producto</th>
              <th className="text-left py-2 px-3">SKU</th>
              <th className="text-right py-2 px-3">P. Unitario</th>
              <th className="text-right py-2 px-3">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.items.map((item) => {
              const prod = store.productos.find((p) => p.id === item.productoId)
              return (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-2 px-3">{item.cantidad}</td>
                  <td className="py-2 px-3 font-medium">{prod?.nombre || 'Producto'}</td>
                  <td className="py-2 px-3 text-gray-600">{prod?.sku}</td>
                  <td className="py-2 px-3 text-right">{formatMXN(item.precioUnitario)}</td>
                  <td className="py-2 px-3 text-right font-semibold">{formatMXN(item.subtotal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {orden && (
        <div className="mb-6 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Problema Reportado</h3>
            <p className="text-sm">{orden.problemaReportado}</p>
            {orden.diagnostico && (
              <>
                <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 mt-3">Diagnóstico</h3>
                <p className="text-sm">{orden.diagnostico}</p>
              </>
            )}
          </div>
          {orden.lineas?.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black" style={{ backgroundColor: '#1A1A1A', color: 'white' }}>
                  <th className="text-left py-2 px-3">Servicio</th>
                  <th className="text-right py-2 px-3">Mano de Obra</th>
                </tr>
              </thead>
              <tbody>
                {orden.lineas.map((l) => (
                  <tr key={l.id} className="border-b border-gray-200">
                    <td className="py-2 px-3 font-medium">{l.descripcion}</td>
                    <td className="py-2 px-3 text-right">{formatMXN(l.precioManoObra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {orden.piezasUtilizadas?.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black" style={{ backgroundColor: '#1A1A1A', color: 'white' }}>
                  <th className="text-left py-2 px-3">Cant.</th>
                  <th className="text-left py-2 px-3">Pieza Utilizada</th>
                  <th className="text-right py-2 px-3">Costo Unit.</th>
                  <th className="text-right py-2 px-3">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orden.piezasUtilizadas.map((p) => {
                  const pz = store.piezas.find((x) => x.id === p.piezaId)
                  return (
                    <tr key={p.id} className="border-b border-gray-200">
                      <td className="py-2 px-3">{p.cantidad}</td>
                      <td className="py-2 px-3 font-medium">{pz?.nombre || 'Pieza'}</td>
                      <td className="py-2 px-3 text-right">{formatMXN(p.costoUnitario)}</td>
                      <td className="py-2 px-3 text-right">{formatMXN(p.subtotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Totales */}
      <div className="flex justify-end mb-6">
        <div className="w-72 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatMXN(venta?.subtotal ?? ((orden?.subtotalManoObra || 0) + (orden?.subtotalPiezas || 0)))}</span>
          </div>
          {(venta?.descuento || orden?.descuento) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Descuento:</span>
              <span className="font-medium">- {formatMXN(venta?.descuento || orden?.descuento || 0)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t-2 border-black pt-2" style={{ color: '#E63946' }}>
            <span>TOTAL:</span>
            <span>{formatMXN(venta?.total || orden?.total || 0)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Método de pago:</span>
            <span>{venta?.metodoPago || orden?.metodoPago}</span>
          </div>
        </div>
      </div>

      {/* Garantía */}
      {garantia && (
        <div className="border-2 border-dashed rounded-lg p-4 mb-4" style={{ borderColor: '#E63946' }}>
          <h3 className="font-bold text-sm mb-1" style={{ color: '#E63946' }}>
            GARANTÍA INCLUIDA
          </h3>
          <p className="text-xs text-gray-700">
            Este {garantia.tipo === 'PRODUCTO' ? 'producto' : 'servicio'} cuenta con una garantía de{' '}
            <strong>{garantia.duracionDias} días</strong>.
          </p>
          <p className="text-xs text-gray-700">
            Vigencia: {formatDate(garantia.fechaInicio)} al {formatDate(garantia.fechaVencimiento)}
          </p>
          {garantia.descripcionCobertura && (
            <p className="text-xs text-gray-600 mt-1 italic">{garantia.descripcionCobertura}</p>
          )}
        </div>
      )}

      {/* Pie */}
      <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
        <p className="font-semibold">¡Gracias por su preferencia!</p>
        <p>Conserve este documento para hacer válida la garantía.</p>
        <p className="mt-1">Te Reparo Manager · {formatDate(new Date(), true)}</p>
      </div>
    </Card>
  )
}
