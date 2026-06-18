'use server'

import { cookies } from 'next/headers'
import { type LoginInput } from '@kreaflow/shared-schemas'

export async function loginAction(data: LoginInput) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const response = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password
      })
    })

    const body = await response.json()

    if (!response.ok) {
      return { success: false, error: body.error || 'Login gagal' }
    }

    let tokenValue = ''

    // Attempt 1: getSetCookie()
    if (typeof response.headers.getSetCookie === 'function') {
      const cookiesList = response.headers.getSetCookie()
      for (const cookie of cookiesList) {
        const match = cookie.match(/token=([^;]+)/)
        if (match) {
          tokenValue = match[1]
          break
        }
      }
    }

    // Attempt 2: standard set-cookie header
    if (!tokenValue) {
      const cookieHeader = response.headers.get('set-cookie')
      if (cookieHeader) {
        const match = cookieHeader.match(/token=([^;]+)/)
        if (match) {
          tokenValue = match[1]
        }
      }
    }

    if (tokenValue) {
      const cookieStore = await cookies()
      cookieStore.set('token', tokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/'
      })
    } else {
      console.warn('Set-Cookie header was not returned or token was not found in response.')
    }

    return { success: true, user: body }
  } catch (error: any) {
    console.error('Login action connection error:', error)
    return { success: false, error: 'Tidak dapat terhubung ke server backend.' }
  }
}

export async function logoutAction() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    await fetch(`${backendUrl}/auth/logout`, {
      method: 'POST'
    }).catch((e) => {
      console.warn('Backend logout request failed, proceeding to clear cookies locally:', e)
    })

    const cookieStore = await cookies()
    cookieStore.delete('token')
    return { success: true }
  } catch (error: any) {
    console.error('Logout action failed:', error)
    return { success: false, error: 'Gagal memproses logout' }
  }
}

