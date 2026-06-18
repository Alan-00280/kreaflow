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

export async function getProductsAction() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/products`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 } // Disable fetch cache to ensure real-time data
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil data produk' }
    }

    return { success: true, products: body }
  } catch (error: any) {
    console.error('getProductsAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function getProductDetailAction(id: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/products/${id}`, {
      method: 'GET',
      headers
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil detail produk' }
    }

    return { success: true, product: body }
  } catch (error: any) {
    console.error('getProductDetailAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function createProductAction(data: any) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal membuat produk' }
    }

    return { success: true, product: body }
  } catch (error: any) {
    console.error('createProductAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function updateProductAction(id: string, data: any) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/products/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal memperbarui produk' }
    }

    return { success: true, product: body }
  } catch (error: any) {
    console.error('updateProductAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function deleteProductAction(id: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/products/${id}`, {
      method: 'DELETE',
      headers
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal menghapus produk' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('deleteProductAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}
