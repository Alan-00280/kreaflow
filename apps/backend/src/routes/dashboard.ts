import { createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "./orders.js";

export const getDashboardStatsRoute = createRoute({
  method: "get",
  path: "/stats",
  tags: ["Dashboard"],
  summary: "Daftar Statistik Dashboard",
  description: "Mengambil statistik (jumlah pesanan, ringkasan, produk, bundling) dan data chart bulanan/harian.",
  request: {
    query: z.object({
      type: z
        .enum(["monthly", "daily"])
        .optional()
        .default("monthly")
        .openapi({ description: "Tipe grafik (monthly / daily)", example: "monthly" }),
      year: z.string().optional().openapi({ description: "Tahun filter grafik", example: "2026" }),
      month: z.string().optional().openapi({ description: "Bulan filter grafik (1-12, wajib jika type daily)", example: "6" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            stats: z.object({
              totalOrders: z.number(),
              totalSummaries: z.number(),
              totalProducts: z.number(),
              totalBundles: z.number(),
            }),
            chartData: z.array(
              z.object({
                label: z.string(),
                count: z.number(),
              })
            ),
          }),
        },
      },
      description: "Statistik dashboard berhasil diambil",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Unauthorized: Sesi tidak aktif",
    },
    500: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Kesalahan internal server",
    },
  },
});
