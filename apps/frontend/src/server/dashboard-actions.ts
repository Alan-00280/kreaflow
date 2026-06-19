"use server";

import { cookies } from "next/headers";

async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function getDashboardStatsAction(params: { type: "monthly" | "daily"; year?: string; month?: string }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const headers = await getAuthHeaders();

    // Construct query parameters
    const searchParams = new URLSearchParams();
    searchParams.set("type", params.type);
    if (params.year) searchParams.set("year", params.year);
    if (params.month) searchParams.set("month", params.month);

    const response = await fetch(`${backendUrl}/dashboard/stats?${searchParams.toString()}`, {
      method: "GET",
      headers,
      next: { revalidate: 0 }, // Disable fetch caching for real-time stats
    });

    const body = await response.json();
    if (!response.ok) {
      return { success: false, error: body.error || "Gagal mengambil statistik dashboard" };
    }

    return { success: true, stats: body.stats, chartData: body.chartData };
  } catch (error: any) {
    console.error("getDashboardStatsAction error:", error);
    return { success: false, error: "Gagal terhubung ke backend" };
  }
}
