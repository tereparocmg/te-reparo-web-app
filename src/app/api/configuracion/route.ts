import { prisma, normalizeDates } from '@/lib/prisma'
import { ok, fail, parseBody, withAuth } from '@/lib/api-helpers'

// GET /api/configuracion — Devuelve la configuración global (la crea si no existe)
// Defaults: moneda=USD, tipoCambio=650, syncEnabled=false, syncInterval=5
export async function GET(req: Request) {
  return withAuth(req, async () => {
    let config = await prisma.configuracionGlobal.findFirst()
    if (!config) {
      config = await prisma.configuracionGlobal.create({
        data: {
          moneda: 'USD',
          pais: 'Cuba',
          tipoCambio: 650,
          syncEnabled: false,
          syncInterval: 5,
        },
      })
    }
    return ok(normalizeDates(config))
  })
}

// PUT /api/configuracion — Actualiza la configuración global (SUPER_ADMIN)
// Body: cualquier campo editable de ConfiguracionGlobal
export async function PUT(req: Request) {
  return withAuth(req, async () => {
    const dto = await parseBody<any>(req)
    const permitidos: string[] = [
      'moneda', 'formatoTicket', 'datosFiscalesEmpresa', 'pais', 'tipoCambio',
      'serverUrl', 'syncEnabled', 'syncInterval', 'adminPaymentType', 'adminPaymentValue',
    ]
    const data: any = {}
    for (const k of permitidos) {
      if (k in dto) data[k] = dto[k]
    }
    if (Object.keys(data).length === 0) {
      return fail('Ningún campo válido para actualizar', 400)
    }
    let config = await prisma.configuracionGlobal.findFirst()
    if (config) {
      config = await prisma.configuracionGlobal.update({
        where: { id: config.id },
        data,
      })
    } else {
      config = await prisma.configuracionGlobal.create({
        data: { ...data, moneda: data.moneda || 'USD', pais: data.pais || 'Cuba' },
      })
    }
    return ok(normalizeDates(config))
  }, ['SUPER_ADMIN'])
}
