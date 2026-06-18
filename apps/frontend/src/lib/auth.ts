import { cookies } from 'next/headers'

export interface Session {
  id: string
  name: string
  role: string
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value || cookieStore.get('jwt')?.value
    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payloadBase64 = parts[1]
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8')
    const payload = JSON.parse(payloadJson)

    if (payload && typeof payload === 'object') {
      return {
        id: String(payload.sub || payload.id || ''),
        name: String(payload.name || ''),
        role: String(payload.role || '')
      }
    }

    return null
  } catch (error) {
    console.error('Error decoding session JWT:', error)
    return null
  }
}
