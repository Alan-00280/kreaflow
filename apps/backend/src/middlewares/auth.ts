import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'

export type UserSession = {
  id: string
  name: string
  role: 'admin' | 'operator'
}

export async function authMiddleware(c: Context, next: Next) {
  try {
    const token = getCookie(c, 'token') || c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return c.json({ error: 'Unauthorized: Token tidak ditemukan' }, 401)
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('JWT_SECRET is not configured')
      return c.json({ error: 'Internal server error: JWT secret tidak terkonfigurasi' }, 500)
    }

    const decoded = await verify(token, secret, 'HS256') as any
    if (!decoded || !decoded.sub || !decoded.role) {
      return c.json({ error: 'Unauthorized: Token tidak valid' }, 401)
    }

    // Bind user session to Hono context variables
    c.set('user', {
      id: decoded.sub,
      name: decoded.name || '',
      role: decoded.role
    })

    return next()
  } catch (err: any) {
    console.error('Auth middleware error:', err)
    return c.json({ error: 'Unauthorized: Token tidak valid atau kedaluwarsa' }, 401)
  }
}

export function requireRole(allowedRoles: ('admin' | 'operator')[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as UserSession | undefined
    if (!user) {
      return c.json({ error: 'Unauthorized: Sesi tidak ditemukan' }, 401)
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: 'Forbidden: Anda tidak memiliki akses untuk tindakan ini' }, 403)
    }

    return next()
  }
}
