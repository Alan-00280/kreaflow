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

export async function getProductOrderSummariesAction() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/product-order-summaries`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 }
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil data ringkasan pesanan' }
    }

    return { success: true, summaries: body }
  } catch (error: any) {
    console.error('getProductOrderSummariesAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function getProductOrderSummaryDetailAction(id: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/product-order-summaries/${id}`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 }
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal mengambil detail ringkasan pesanan' }
    }

    return { success: true, summary: body }
  } catch (error: any) {
    console.error('getProductOrderSummaryDetailAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function createProductOrderSummaryAction(data: { name: string; orderStartedDate: string; orderEndDate: string }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/product-order-summaries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal membuat ringkasan pesanan baru' }
    }

    return { success: true, summary: body }
  } catch (error: any) {
    console.error('createProductOrderSummaryAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function updateSummaryProductsAction(
  id: string,
  products: Array<{ productId: string; fulfillmentType: string; fulfillmentStatus: string }>
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/product-order-summaries/${id}/products`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ products })
    })

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal memperbarui status pemenuhan produk' }
    }

    return { success: true, message: body.message }
  } catch (error: any) {
    console.error('updateSummaryProductsAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function exportProductOrderSummaryCsvAction(summaryId: string, productId: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(`${backendUrl}/product-order-summaries/${summaryId}/export/${productId}`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      const body = await response.json()
      return { success: false, error: body.error || 'Gagal mengekspor data CSV' }
    }

    const csvText = await response.text()
    return { success: true, csvText }
  } catch (error: any) {
    console.error('exportProductOrderSummaryCsvAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

