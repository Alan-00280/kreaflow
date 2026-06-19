import { OpenAPIHono } from '@hono/zod-openapi'
import { loginRoute, logoutRoute } from '../routes/auth.js'
import { PrismaClient } from '../generated/prisma/client.js'
import bcrypt from 'bcrypt'
import { setCookie, deleteCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'

type ContextWithPrisma = {
  Variables: {
    prisma: PrismaClient
  }
}

const auth = new OpenAPIHono<ContextWithPrisma>()

auth.openapi(loginRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    
    // Extract JSON body payload (already validated by Zod loginRequestSchema)
    const { email, password } = c.req.valid('json')

    // Database Inspection
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      // Bypassing deeper inspections to prevent user enumeration
      return c.json({ error: 'Email atau password salah' }, 401)
    }

    // Cryptographic Passcheck
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return c.json({ error: 'Email atau password salah' }, 401)
    }

    // Token Issuance & Cookie Dispatch
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('JWT_SECRET is not configured in environment variables')
      return c.json({ error: 'Terjadi kesalahan konfigurasi server' }, 500)
    }

    const payload = {
      sub: user.id.toString(),
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours from now
    }

    const token = await sign(payload, secret, 'HS256')

    // Inject the token into the response headers using Hono setCookie helper
    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return c.json({
      id: user.id.toString(),
      name: user.name,
      role: user.role
    }, 200)

  } catch (error: any) {
    console.error('Login error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

auth.openapi(logoutRoute, async (c) => {
  try {
    deleteCookie(c, 'token', { path: '/' })
    return c.json({ success: true }, 200)
  } catch (error: any) {
    console.error('Logout error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

export default auth
