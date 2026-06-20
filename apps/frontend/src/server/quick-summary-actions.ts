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

export async function getQuickSummaryAction(startDate: string, endDate: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(
      `${backendUrl}/product-order-summaries/quick?startDate=${startDate}&endDate=${endDate}`,
      {
        method: 'GET',
        headers,
        next: { revalidate: 0 }
      }
    )

    const body = await response.json()
    if (!response.ok) {
      return { success: false, error: body.error || 'Gagal menghitung ringkasan cepat' }
    }

    return { success: true, data: body }
  } catch (error: any) {
    console.error('getQuickSummaryAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}

export async function exportQuickSummaryCsvAction(startDate: string, endDate: string, productId: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const headers = await getAuthHeaders()
    const response = await fetch(
      `${backendUrl}/product-order-summaries/quick/export?startDate=${startDate}&endDate=${endDate}&productId=${productId}`,
      {
        method: 'GET',
        headers,
        next: { revalidate: 0 }
      }
    )

    if (!response.ok) {
      const body = await response.json()
      return { success: false, error: body.error || 'Gagal mengekspor CSV ringkasan cepat' }
    }

    const csvText = await response.text()
    return { success: true, csvText }
  } catch (error: any) {
    console.error('exportQuickSummaryCsvAction error:', error)
    return { success: false, error: 'Gagal terhubung ke backend' }
  }
}
