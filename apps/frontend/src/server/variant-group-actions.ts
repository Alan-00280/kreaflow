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

export async function getVariantGroupsAction() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/variant-groups`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 } // Disable fetch cache to ensure real-time data
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil data kelompok varian' }
    }

    return { success: true, variantGroups: body }
  } catch (error: any) {
    console.error('getVariantGroupsAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function getVariantGroupDetailAction(id: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/variant-groups/${id}`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 }
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil detail kelompok varian' }
    }

    return { success: true, variantGroup: body }
  } catch (error: any) {
    console.error('getVariantGroupDetailAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function createVariantGroupAction(data: any) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/variant-groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal membuat kelompok varian' }
    }

    return { success: true, variantGroup: body }
  } catch (error: any) {
    console.error('createVariantGroupAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function updateVariantGroupAction(id: string, data: any) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/variant-groups/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal memperbarui kelompok varian' }
    }

    return { success: true, variantGroup: body }
  } catch (error: any) {
    console.error('updateVariantGroupAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function deleteVariantGroupAction(id: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/variant-groups/${id}`, {
      method: 'DELETE',
      headers
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal menghapus kelompok varian' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('deleteVariantGroupAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}
