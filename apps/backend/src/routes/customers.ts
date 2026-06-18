import { createRoute, z } from "@hono/zod-openapi"
import { errorResponseSchema } from "./orders.js"

export const customerResponseSchema = z.object({
  id: z.string().openapi({ description: "ID Pelanggan (String)", example: "1" }),
  name: z.string().openapi({ description: "Nama Pelanggan", example: "John Doe" }),
  phoneNumber: z.string().nullable().openapi({ description: "Nomor HP/WhatsApp", example: "6281234567890" }),
  generation: z.number().nullable().openapi({ description: "Angkatan/Generasi", example: 2024 }),
  createdAt: z.string().openapi({ description: "Tanggal Terdaftar", example: "2026-06-18T00:00:00Z" }),
  updatedAt: z.string().openapi({ description: "Tanggal Diubah", example: "2026-06-18T00:00:00Z" })
}).openapi('CustomerResponse')

export const listCustomersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Customers'],
  summary: 'Daftar Pelanggan',
  description: 'Mengambil daftar seluruh pelanggan yang terdaftar di dalam sistem.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(customerResponseSchema),
        },
      },
      description: 'Daftar pelanggan berhasil diambil',
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Unauthorized: Sesi tidak aktif',
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Kesalahan internal server',
    }
  }
})
