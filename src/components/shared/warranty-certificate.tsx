'use client'

import { useStore } from '@/lib/store'
import { formatDate } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-react'

interface WarrantyCertificateProps {
  garantiaId: string
}

export function WarrantyCertificate({ garantiaId }: WarrantyCertificateProps) {
  const store = useStore()
  const garantia = store.garantias.find((g) => g.id === garantiaId)
  const taller = store.talleres.find((t) => t.id === garantia?.tallerId)
  const cliente = store.clientes.find((c) => c.id === garantia?.clienteId)
  const venta = store.ventas.find((v) => v.id === garantia?.ventaId)
  // Nota: en la arquitectura actual, `ordenes` fue reemplazado por `servicios`.
  // Fallback defensivo para no crashear cuando el store no tiene `ordenes`.
  const orden = (store.ordenes || store.servicios || []).find(
    (o: any) => o.id === garantia?.ordenId || o.id === garantia?.servicioId
  )

  if (!garantia) return null

  return (
    <Card className="print-area p-10 max-w-3xl mx-auto bg-white text-black shadow-none border">
      {/* Borde decorativo */}
      <div className="border-4 border-double p-8" style={{ borderColor: '#E63946' }}>
        {/* Encabezado */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full mb-3" style={{ backgroundColor: '#1A1A1A' }}>
            <ShieldCheck className="h-9 w-9" style={{ color: '#E63946' }} />
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: '#E63946' }}>
            CERTIFICADO DE GARANTÍA
          </h1>
          <p className="text-sm font-semibold mt-1">{taller?.nombre}</p>
        </div>

        {/* Folio */}
        <div className="flex justify-center mb-6">
          <div className="px-6 py-2 rounded" style={{ backgroundColor: '#1A1A1A', color: 'white' }}>
            <span className="text-sm">Folio: </span>
            <span className="text-lg font-bold" style={{ color: '#E63946' }}>{garantia.folio}</span>
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="border border-gray-300 rounded p-3">
            <p className="text-xs uppercase text-gray-500 font-bold mb-1">Cliente</p>
            <p className="font-semibold">{cliente?.nombre || 'Cliente General'}</p>
            {cliente?.telefono && <p className="text-xs text-gray-600">Tel: {cliente.telefono}</p>}
          </div>
          <div className="border border-gray-300 rounded p-3">
            <p className="text-xs uppercase text-gray-500 font-bold mb-1">Tipo de Garantía</p>
            <p className="font-semibold">
              {garantia.tipo === 'PRODUCTO' ? 'Producto Vendido' : 'Servicio de Reparación'}
            </p>
            <p className="text-xs text-gray-600">
              {garantia.tipo === 'PRODUCTO' ? `Venta: ${venta?.folio || ''}` : `Orden: ${orden?.folio || ''}`}
            </p>
          </div>
        </div>

        {/* Datos del dispositivo/producto */}
        {orden && (
          <div className="border border-gray-300 rounded p-3 mb-6 text-sm">
            <p className="text-xs uppercase text-gray-500 font-bold mb-1">Dispositivo</p>
            <p className="font-semibold">{orden.marca} {orden.modelo}</p>
            {orden.imei && <p className="text-xs text-gray-600">IMEI/Serie: {orden.imei}</p>}
            <p className="text-xs text-gray-600 mt-1">
              Problema atendido: {orden.problemaReportado}
            </p>
          </div>
        )}

        {venta && (
          <div className="border border-gray-300 rounded p-3 mb-6 text-sm">
            <p className="text-xs uppercase text-gray-500 font-bold mb-1">Producto(s)</p>
            {venta.items.map((item, i) => {
              const prod = store.productos.find((p) => p.id === item.productoId)
              return (
                <p key={i} className="font-semibold">
                  · {item.cantidad}x {prod?.nombre}
                </p>
              )
            })}
          </div>
        )}

        {/* Vigencia */}
        <div className="mb-6 p-4 rounded" style={{ backgroundColor: '#FFF5F5' }}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs uppercase text-gray-500 font-bold">Fecha de Inicio</p>
              <p className="font-bold text-sm">{formatDate(garantia.fechaInicio)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 font-bold">Duración</p>
              <p className="font-bold text-2xl" style={{ color: '#E63946' }}>{garantia.duracionDias}</p>
              <p className="text-xs">días</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 font-bold">Vencimiento</p>
              <p className="font-bold text-sm">{formatDate(garantia.fechaVencimiento)}</p>
            </div>
          </div>
        </div>

        {/* Cobertura */}
        {garantia.descripcionCobertura && (
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase mb-2" style={{ color: '#1A1A1A' }}>
              Cobertura
            </h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              {garantia.descripcionCobertura}
            </p>
          </div>
        )}

        {/* Condiciones */}
        <div className="text-xs text-gray-600 border-t border-gray-300 pt-3 mb-6">
          <p className="font-bold mb-1">Condiciones:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Presentar este certificado al hacer efectiva la garantía.</li>
            <li>La garantía no cubre daños por mal uso, caídas, líquidos o modificaciones.</li>
            <li>El cliente debe presentar identificación oficial.</li>
            <li>La garantía aplica únicamente en el taller emisor.</li>
          </ul>
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          <div className="text-center">
            <div className="border-t border-black pt-2">
              <p className="text-xs font-semibold">Cliente</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2">
              <p className="text-xs font-semibold">Representante del Taller</p>
              <p className="text-xs text-gray-500">{taller?.encargado}</p>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="text-center text-xs text-gray-500 mt-6 pt-3 border-t border-gray-200">
          <p>{taller?.nombre} · {taller?.direccion}</p>
          <p>Tel: {taller?.telefono} {taller?.rfc && `· RFC: ${taller.rfc}`}</p>
          <p className="mt-1">Emitido el {formatDate(garantia.createdAt, true)}</p>
        </div>
      </div>
    </Card>
  )
}
