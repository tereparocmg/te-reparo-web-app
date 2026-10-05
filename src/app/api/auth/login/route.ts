import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setSession } from '@/lib/session'
import { ok, fail, parseBody } from '@/lib/api-helpers'

// POST /api/auth/login — Inicio de sesión con email + password
export async function POST(req: Request) {
  try {
    const { email, password } = await parseBody<{ email?: string; password?: string }>(req)

    if (!email || !password) {
      return fail('Email y password son obligatorios', 400)
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      include: { talleres: { include: { taller: true } } },
    })

    // Usuario inexistente, inactivo o password incorrecta
    if (!usuario || !usuario.activo || password !== usuario.password) {
      return fail('Credenciales inválidas', 401)
    }

    // Establecer cookie de sesión firmada
    await setSession(usuario.id)

    // Quitar password y aplanar talleres a IDs
    const { password: _pwd, talleres, ...userData } = usuario
    return ok({
      ...userData,
      tallerIds: talleres.map((ut) => ut.tallerId),
    })
  } catch (e: any) {
    console.error('[API auth/login] Error:', e?.message)
    return fail(e?.message === 'Cuerpo JSON inválido' ? e.message : 'Error al iniciar sesión', 500)
  }
}
