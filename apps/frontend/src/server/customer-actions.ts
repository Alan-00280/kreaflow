'use server'

import { cookies } from 'next/headers'

async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function getCustomersAction() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/customers`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 } // Disable cache for real-time customer data
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil data pelanggan' }
    }

    return { success: true, customers: body }
  } catch (error: any) {
    console.error('getCustomersAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}
