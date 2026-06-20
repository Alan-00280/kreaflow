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

export async function getOrdersAction() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/orders`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 } // Disable fetch cache to ensure real-time data
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil data riwayat pesanan' }
    }

    return { success: true, orders: body }
  } catch (error: any) {
    console.error('getOrdersAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function getOrderDetailAction(id: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/orders/${id}`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 }
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil detail nota pesanan' }
    }

    return { success: true, order: body }
  } catch (error: any) {
    console.error('getOrderDetailAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function createOrderAction(data: any) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal menyimpan nota pesanan' }
    }

    return { success: true, order: body }
  } catch (error: any) {
    console.error('createOrderAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function updateOrderStatusAction(id: string, data: { paymentStatus?: string; pickupStatus?: string }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/orders/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal memperbarui status nota pesanan' }
    }

    return { success: true, order: body }
  } catch (error: any) {
    console.error('updateOrderStatusAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

