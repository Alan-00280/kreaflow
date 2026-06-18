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

export async function getBundlesAction() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/bundles`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 } // Disable fetch cache to ensure real-time data
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil data paket bundling' }
    }

    return { success: true, bundles: body }
  } catch (error: any) {
    console.error('getBundlesAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function getBundleDetailAction(id: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/bundles/${id}`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 }
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil detail paket bundling' }
    }

    return { success: true, bundle: body }
  } catch (error: any) {
    console.error('getBundleDetailAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function createBundleAction(data: any) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/bundles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal membuat paket bundling' }
    }

    return { success: true, bundle: body }
  } catch (error: any) {
    console.error('createBundleAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function updateBundleAction(id: string, data: any) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/bundles/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal memperbarui paket bundling' }
    }

    return { success: true, bundle: body }
  } catch (error: any) {
    console.error('updateBundleAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function deleteBundleAction(id: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/bundles/${id}`, {
      method: 'DELETE',
      headers
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal menghapus paket bundling' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('deleteBundleAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}
